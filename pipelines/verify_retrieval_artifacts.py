import hashlib
import json

import joblib

from .retrieval_config import (
    DOCUMENT_SOURCE_PATH,
    INDEX_METADATA_PATH,
    INDEX_METRICS_PATH,
    INDEX_PATH,
    INDEX_VERSION,
)


def verify() -> None:
    artifact = joblib.load(INDEX_PATH)
    metadata = json.loads(INDEX_METADATA_PATH.read_text(encoding="utf-8"))
    metrics = json.loads(INDEX_METRICS_PATH.read_text(encoding="utf-8"))
    versions = {
        artifact["indexVersion"],
        metadata["indexVersion"],
        metrics["indexVersion"],
    }
    if versions != {INDEX_VERSION}:
        raise ValueError(f"Retrieval artifact version mismatch: {sorted(versions)}")
    if metadata["dataNature"] != "fictional" or metrics["dataNature"] != "fictional":
        raise ValueError("Retrieval artifacts must be explicitly marked as fictional.")
    source_hash = hashlib.sha256(DOCUMENT_SOURCE_PATH.read_bytes()).hexdigest()
    if metadata["sourceSha256"] != source_hash:
        raise ValueError(
            "The retrieval index does not match the current document corpus."
        )
    duplicate_reasons = {item["reason"] for item in metadata["duplicateDecisions"]}
    if duplicate_reasons != {"exact_content_hash", "near_duplicate_jaccard"}:
        raise ValueError("Both exact and near-duplicate controls must be exercised.")
    if metrics["recallAt5"] < 0.9 or metrics["mrr"] < 0.8:
        raise ValueError(
            "Retrieval regression metrics are below the M3 acceptance floor."
        )
    if len(artifact["chunks"]) != metadata["chunks"]:
        raise ValueError("Chunk count differs between index and metadata.")
    print(
        f"Verified {INDEX_VERSION}: {metadata['chunks']} chunks, "
        f"Recall@5={metrics['recallAt5']}, MRR={metrics['mrr']}."
    )


if __name__ == "__main__":
    verify()
