from .config import PROJECT_ROOT

DOCUMENT_DATA_DIR = PROJECT_ROOT / "data" / "documents"
DOCUMENT_SOURCE_PATH = DOCUMENT_DATA_DIR / "source" / "documents.json"
RETRIEVAL_EVALUATION_PATH = DOCUMENT_DATA_DIR / "retrieval_evaluation.json"
INDEX_DIR = PROJECT_ROOT / "indexes"

INDEX_VERSION = "srm-retrieval-demo-1.0.0"
INDEX_PATH = INDEX_DIR / f"{INDEX_VERSION}.joblib"
INDEX_METADATA_PATH = INDEX_DIR / f"{INDEX_VERSION}.metadata.json"
INDEX_METRICS_PATH = INDEX_DIR / f"{INDEX_VERSION}.metrics.json"

DOMAIN_ANCHORS = {
    "LOGISTICS": {
        "carrier",
        "delay",
        "delivery",
        "freight",
        "logistics",
        "orders",
        "port",
        "sailing",
        "shipment",
    },
    "OPERATIONS": {
        "continuity",
        "incident",
        "interruption",
        "outage",
        "plant",
        "production",
        "recovery",
        "stock",
        "warehouse",
    },
    "QUALITY": {
        "corrective",
        "defect",
        "dimensional",
        "failure",
        "inspection",
        "quality",
        "verification",
    },
    "FINANCIAL": {
        "cash",
        "covenant",
        "financial",
        "headroom",
        "liquidity",
        "payment",
        "working",
    },
    "PERFORMANCE": {
        "cancellation",
        "delivery",
        "performance",
        "scorecard",
        "trend",
    },
    "LEGAL": {"breach", "compliance", "contract", "legal", "litigation", "sanctions"},
}
