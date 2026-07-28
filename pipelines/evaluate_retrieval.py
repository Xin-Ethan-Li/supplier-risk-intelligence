import json
from statistics import mean

from app.retrieval_service import RetrievalIndex

from .retrieval_config import (
    INDEX_METRICS_PATH,
    RETRIEVAL_EVALUATION_PATH,
)


def evaluate_retrieval() -> dict[str, object]:
    index = RetrievalIndex()
    cases = json.loads(RETRIEVAL_EVALUATION_PATH.read_text(encoding="utf-8"))
    rows: list[dict[str, object]] = []

    for case in cases:
        result = index.search(case["question"], case["scenarioId"], top_k=5)
        retrieved = [item["documentId"] for item in result["evidence"]]
        relevant = set(case["relevantDocumentIds"])
        first_rank = next(
            (
                rank
                for rank, document_id in enumerate(retrieved, start=1)
                if document_id in relevant
            ),
            None,
        )
        rows.append(
            {
                "queryId": case["queryId"],
                "retrievedDocumentIds": retrieved,
                "firstRelevantRank": first_rank,
                "recallAt5": 1 if first_rank is not None else 0,
                "reciprocalRank": 1 / first_rank if first_rank else 0,
                "retrievalMs": round(float(result["retrievalMs"]), 6),
            }
        )

    metrics = {
        "indexVersion": index.version,
        "dataNature": "fictional",
        "queries": len(rows),
        "recallAt5": round(mean(row["recallAt5"] for row in rows), 6),
        "mrr": round(mean(row["reciprocalRank"] for row in rows), 6),
        "meanRetrievalMs": round(mean(row["retrievalMs"] for row in rows), 6),
        "cases": rows,
        "disclaimer": "Metrics use a small fictional, human-authored evaluation set.",
    }
    INDEX_METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))
    return metrics


if __name__ == "__main__":
    evaluate_retrieval()
