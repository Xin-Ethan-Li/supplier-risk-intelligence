import math
import os
import re
from collections import Counter
from datetime import date
from pathlib import Path
from time import perf_counter
from typing import Any

import joblib
import numpy as np
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
from sklearn.preprocessing import normalize

TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    return [
        token for token in TOKEN_PATTERN.findall(text.lower()) if token not in ENGLISH_STOP_WORDS
    ]


class RetrievalIndex:
    def __init__(self) -> None:
        configured_path = os.getenv("RETRIEVAL_INDEX_PATH")
        if configured_path:
            self.index_path = Path(configured_path)
        else:
            project_root = Path(__file__).resolve().parents[3]
            self.index_path = project_root / "indexes" / "srm-retrieval-demo-1.0.0.joblib"
        self.artifact: dict[str, Any] = joblib.load(self.index_path)
        self.chunks: list[dict[str, Any]] = self.artifact["chunks"]

    @property
    def version(self) -> str:
        return str(self.artifact["indexVersion"])

    def _bm25_scores(self, query_tokens: list[str], indices: list[int]) -> np.ndarray:
        frequency = self.artifact["documentFrequency"]
        lengths = self.artifact["documentLengths"]
        average_length = float(self.artifact["averageDocumentLength"])
        corpus_size = len(self.chunks)
        scores = np.zeros(len(indices), dtype=np.float32)
        k1 = 1.5
        b = 0.75

        for position, chunk_index in enumerate(indices):
            counts = Counter(self.chunks[chunk_index]["tokens"])
            length = float(lengths[chunk_index])
            for token in set(query_tokens):
                term_frequency = counts[token]
                if not term_frequency:
                    continue
                document_frequency = int(frequency.get(token, 0))
                inverse_frequency = math.log(
                    1 + (corpus_size - document_frequency + 0.5) / (document_frequency + 0.5)
                )
                denominator = term_frequency + k1 * (1 - b + b * length / average_length)
                scores[position] += inverse_frequency * term_frequency * (k1 + 1) / denominator

        maximum = float(np.max(scores)) if len(scores) else 0.0
        return scores / maximum if maximum > 0 else scores

    def search(self, query: str, scenario_id: str, top_k: int = 5) -> dict[str, Any]:
        started_at = perf_counter()
        candidate_indices = [
            index for index, chunk in enumerate(self.chunks) if chunk["scenarioId"] == scenario_id
        ]
        if not candidate_indices:
            candidate_indices = list(range(len(self.chunks)))

        query_sparse = self.artifact["vectorizer"].transform([query])
        query_embedding = normalize(self.artifact["svd"].transform(query_sparse), norm="l2")[0]
        dense = self.artifact["embeddings"][candidate_indices] @ query_embedding
        dense = np.maximum(dense, 0)
        query_tokens = tokenize(query)
        query_token_set = set(query_tokens)
        lexical = self._bm25_scores(query_tokens, candidate_indices)
        reference_date = date.fromisoformat(self.artifact["referenceDate"])

        ranked: list[tuple[float, int]] = []
        for position, chunk_index in enumerate(candidate_indices):
            chunk = self.chunks[chunk_index]
            anchors = set(self.artifact["domainAnchors"].get(chunk["riskCategory"], []))
            anchor_score = min(1.0, len(query_token_set & anchors) / 2)
            age_days = max(0, (reference_date - date.fromisoformat(chunk["publishedAt"])).days)
            temporal_score = math.exp(-math.log(2) * age_days / 730)
            score = (
                0.45 * float(dense[position])
                + 0.35 * float(lexical[position])
                + 0.1 * anchor_score
                + 0.06 * float(chunk["sourceQuality"])
                + 0.04 * temporal_score
            )
            ranked.append((score, chunk_index))

        ranked.sort(reverse=True)
        selected: list[tuple[float, int]] = []
        selected_documents: set[str] = set()
        for score, index in ranked:
            document_id = self.chunks[index]["documentId"]
            if score < 0.18 or document_id in selected_documents:
                continue
            selected.append((score, index))
            selected_documents.add(document_id)
            if len(selected) == top_k:
                break
        evidence = [
            {
                "citationId": f"E{position}",
                "documentId": self.chunks[index]["documentId"],
                "title": self.chunks[index]["title"],
                "supplierName": self.chunks[index]["supplierName"],
                "sourceType": self.chunks[index]["sourceType"],
                "publishedAt": self.chunks[index]["publishedAt"],
                "section": self.chunks[index]["section"],
                "excerpt": self.chunks[index]["text"],
                "score": round(score, 6),
                "riskCategory": self.chunks[index]["riskCategory"],
                "severity": self.chunks[index]["severity"],
            }
            for position, (score, index) in enumerate(selected, start=1)
        ]

        if evidence:
            weights = np.asarray([item["score"] for item in evidence[:3]], dtype=np.float32)
            severities = np.asarray([item["severity"] for item in evidence[:3]], dtype=np.float32)
            risk_score = float(np.average(severities, weights=weights))
        else:
            risk_score = 0.0
        risk_band = "HIGH" if risk_score >= 0.65 else "MEDIUM" if risk_score >= 0.35 else "LOW"
        elapsed_ms = (perf_counter() - started_at) * 1000

        return {
            "status": "READY" if evidence else "INSUFFICIENT_EVIDENCE",
            "indexVersion": self.version,
            "riskScore": round(risk_score, 6),
            "riskBand": risk_band,
            "evidenceCount": len(evidence),
            "retrievalMs": elapsed_ms,
            "evidence": evidence,
        }
