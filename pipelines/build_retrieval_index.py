import hashlib
import json
import re
from collections import Counter
from datetime import UTC, datetime
from typing import Any

import joblib
import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.preprocessing import normalize

from .retrieval_config import (
    DOCUMENT_SOURCE_PATH,
    DOMAIN_ANCHORS,
    INDEX_DIR,
    INDEX_METADATA_PATH,
    INDEX_PATH,
    INDEX_VERSION,
)

TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    return [
        token
        for token in TOKEN_PATTERN.findall(text.lower())
        if token not in ENGLISH_STOP_WORDS
    ]


def content_text(document: dict[str, Any]) -> str:
    return "\n".join(
        f"{section['heading']}\n{section['text']}" for section in document["sections"]
    )


def content_hash(document: dict[str, Any]) -> str:
    normalized = " ".join(tokenize(content_text(document)))
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def jaccard_similarity(left: set[str], right: set[str]) -> float:
    union = left | right
    return len(left & right) / len(union) if union else 1.0


def validate_documents(documents: list[dict[str, Any]]) -> None:
    required = {
        "documentId",
        "scenarioId",
        "supplierName",
        "title",
        "sourceType",
        "publishedAt",
        "sourceQuality",
        "riskCategory",
        "severity",
        "sections",
    }
    identifiers: set[str] = set()
    for document in documents:
        missing = required - set(document)
        if missing:
            raise ValueError(f"Document is missing metadata fields: {sorted(missing)}")
        if document["documentId"] in identifiers:
            raise ValueError(f"Duplicate documentId: {document['documentId']}")
        identifiers.add(document["documentId"])
        if not 0 <= float(document["sourceQuality"]) <= 1:
            raise ValueError("sourceQuality must be between zero and one.")
        if not 0 <= float(document["severity"]) <= 1:
            raise ValueError("severity must be between zero and one.")
        if not document["sections"] or any(
            not section.get("heading") or not section.get("text")
            for section in document["sections"]
        ):
            raise ValueError(f"Document {document['documentId']} has an empty section.")


def deduplicate_documents(
    documents: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    retained: list[dict[str, Any]] = []
    decisions: list[dict[str, str]] = []
    hashes: dict[str, str] = {}
    token_sets: list[tuple[str, str, str, set[str]]] = []

    for document in sorted(
        documents, key=lambda item: item["publishedAt"], reverse=True
    ):
        digest = content_hash(document)
        if digest in hashes:
            decisions.append(
                {
                    "documentId": document["documentId"],
                    "duplicateOf": hashes[digest],
                    "reason": "exact_content_hash",
                }
            )
            continue

        tokens = set(tokenize(content_text(document)))
        near_match = next(
            (
                document_id
                for document_id, scenario_id, source_type, retained_tokens in token_sets
                if scenario_id == document["scenarioId"]
                and source_type == document["sourceType"]
                and jaccard_similarity(tokens, retained_tokens) >= 0.54
            ),
            None,
        )
        if near_match:
            decisions.append(
                {
                    "documentId": document["documentId"],
                    "duplicateOf": near_match,
                    "reason": "near_duplicate_jaccard",
                }
            )
            continue

        hashes[digest] = document["documentId"]
        token_sets.append(
            (
                document["documentId"],
                document["scenarioId"],
                document["sourceType"],
                tokens,
            )
        )
        retained.append(document)

    return retained, decisions


def create_chunks(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for document in documents:
        for index, section in enumerate(document["sections"], start=1):
            text = section["text"].strip()
            chunks.append(
                {
                    "chunkId": f"{document['documentId']}#s{index}",
                    "documentId": document["documentId"],
                    "scenarioId": document["scenarioId"],
                    "supplierName": document["supplierName"],
                    "title": document["title"],
                    "sourceType": document["sourceType"],
                    "publishedAt": document["publishedAt"],
                    "sourceQuality": float(document["sourceQuality"]),
                    "riskCategory": document["riskCategory"],
                    "severity": float(document["severity"]),
                    "section": section["heading"],
                    "text": text,
                    "tokens": tokenize(f"{section['heading']} {text}"),
                }
            )
    return chunks


def build_index() -> dict[str, Any]:
    documents = json.loads(DOCUMENT_SOURCE_PATH.read_text(encoding="utf-8"))
    validate_documents(documents)
    retained, duplicate_decisions = deduplicate_documents(documents)
    chunks = create_chunks(retained)
    texts = [f"{chunk['title']} {chunk['section']} {chunk['text']}" for chunk in chunks]

    vectorizer = TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2),
        min_df=1,
        sublinear_tf=True,
        strip_accents="unicode",
        stop_words="english",
    )
    sparse_matrix = vectorizer.fit_transform(texts)
    dimensions = min(32, sparse_matrix.shape[0] - 1, sparse_matrix.shape[1] - 1)
    if dimensions < 2:
        raise ValueError("The corpus is too small to build a dense LSA index.")
    svd = TruncatedSVD(n_components=dimensions, random_state=726)
    embeddings = normalize(svd.fit_transform(sparse_matrix), norm="l2")

    document_frequency = Counter()
    for chunk in chunks:
        document_frequency.update(set(chunk["tokens"]))
    document_lengths = np.asarray(
        [len(chunk["tokens"]) for chunk in chunks], dtype=np.float32
    )

    artifact = {
        "indexVersion": INDEX_VERSION,
        "vectorizer": vectorizer,
        "svd": svd,
        "embeddings": embeddings.astype(np.float32),
        "chunks": chunks,
        "documentFrequency": dict(document_frequency),
        "documentLengths": document_lengths,
        "averageDocumentLength": float(np.mean(document_lengths)),
        "referenceDate": max(document["publishedAt"] for document in retained),
        "domainAnchors": {key: sorted(value) for key, value in DOMAIN_ANCHORS.items()},
    }
    source_hash = hashlib.sha256(DOCUMENT_SOURCE_PATH.read_bytes()).hexdigest()
    metadata = {
        "indexVersion": INDEX_VERSION,
        "createdAt": datetime.now(UTC).isoformat(),
        "dataNature": "fictional",
        "embeddingMethod": "tfidf_lsa_l2_normalized",
        "embeddingDimensions": dimensions,
        "lexicalMethod": "bm25",
        "sourceDocuments": len(documents),
        "retainedDocuments": len(retained),
        "chunks": len(chunks),
        "sourceSha256": source_hash,
        "duplicateDecisions": duplicate_decisions,
        "ranking": {
            "denseCosine": 0.45,
            "bm25": 0.35,
            "domainAnchor": 0.1,
            "sourceQuality": 0.06,
            "temporalDecay": 0.04,
        },
        "disclaimer": "All suppliers, documents and events are fictional demo material.",
    }

    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, INDEX_PATH, compress=3)
    INDEX_METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(json.dumps(metadata, indent=2))
    return metadata


if __name__ == "__main__":
    build_index()
