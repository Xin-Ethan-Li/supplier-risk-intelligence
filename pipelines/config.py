from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
GENERATED_DATA_DIR = PROJECT_ROOT / "data" / "synthetic" / "generated"
SAMPLE_DATA_PATH = (
    PROJECT_ROOT / "data" / "synthetic" / "sample_supplier_risk_events.csv"
)
MODEL_DIR = PROJECT_ROOT / "models"

MODEL_VERSION = "srm-xgb-demo-1.0.0"
MODEL_PATH = MODEL_DIR / f"{MODEL_VERSION}.json"
METADATA_PATH = MODEL_DIR / f"{MODEL_VERSION}.metadata.json"
METRICS_PATH = MODEL_DIR / f"{MODEL_VERSION}.metrics.json"

RANDOM_SEED = 726
DEFAULT_ROWS = 12_000
TARGET_COLUMN = "disruption_next_14d"

FEATURE_COLUMNS = [
    "delivery_delay_rate_30d",
    "defect_rate_90d",
    "cancellation_rate_90d",
    "on_time_delivery_trend_90d",
    "lead_time_variance_days",
    "open_disputes",
    "financial_stability_index",
    "recent_incidents",
]

FEATURE_DEFINITIONS = {
    "delivery_delay_rate_30d": {
        "displayName": "Delivery delay rate (30d)",
        "description": "Share of deliveries arriving later than the committed date.",
        "minimum": 0.0,
        "maximum": 1.0,
    },
    "defect_rate_90d": {
        "displayName": "Defect rate (90d)",
        "description": "Share of inspected units with a recorded quality defect.",
        "minimum": 0.0,
        "maximum": 1.0,
    },
    "cancellation_rate_90d": {
        "displayName": "Cancellation rate (90d)",
        "description": "Share of accepted orders cancelled by the supplier.",
        "minimum": 0.0,
        "maximum": 1.0,
    },
    "on_time_delivery_trend_90d": {
        "displayName": "On-time delivery trend (90d)",
        "description": "Change in on-time delivery rate; negative values indicate deterioration.",
        "minimum": -1.0,
        "maximum": 1.0,
    },
    "lead_time_variance_days": {
        "displayName": "Lead-time variance",
        "description": "Observed standard deviation of delivery lead time in days.",
        "minimum": 0.0,
        "maximum": 90.0,
    },
    "open_disputes": {
        "displayName": "Open disputes",
        "description": "Open commercial, quality or contract disputes at the prediction time.",
        "minimum": 0,
        "maximum": 100,
    },
    "financial_stability_index": {
        "displayName": "Financial stability index",
        "description": "Synthetic 0–1 stability indicator; lower values imply higher risk.",
        "minimum": 0.0,
        "maximum": 1.0,
    },
    "recent_incidents": {
        "displayName": "Recent incidents",
        "description": "Count of material delivery, quality or operational incidents in 90 days.",
        "minimum": 0,
        "maximum": 100,
    },
}
