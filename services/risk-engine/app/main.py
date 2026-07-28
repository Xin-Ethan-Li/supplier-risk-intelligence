from time import perf_counter

from fastapi import FastAPI, Header

from .model_service import RiskModel
from .models import EvaluationRequest

risk_model = RiskModel()

app = FastAPI(
    title="Supplier Risk Engine",
    version="0.2.0",
    description="M2 supplier disruption inference with a versioned XGBoost model.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "srm-risk-engine"}


@app.get("/ready")
def ready() -> dict[str, str]:
    return {
        "status": "ready",
        "service": "srm-risk-engine",
        "modelVersion": risk_model.version,
    }


@app.get("/version")
def version() -> dict[str, str]:
    return {
        "service": "srm-risk-engine",
        "version": "0.2.0",
        "milestone": "M2",
        "modelVersion": risk_model.version,
        "indexVersion": "pending-m3",
    }


@app.post("/v1/evaluations/evaluate")
def evaluate_supplier(
    request: EvaluationRequest,
    x_correlation_id: str | None = Header(default=None),
) -> dict[str, object]:
    started_at = perf_counter()
    _ = x_correlation_id
    quantitative = risk_model.predict(request.supplierMetrics)

    elapsed_ms = (perf_counter() - started_at) * 1000
    return {
        "status": "PARTIAL",
        "quantitative": quantitative,
        "document": {"status": "NOT_IMPLEMENTED", "indexVersion": "pending-m3"},
        "insight": {
            "summary": (
                f"The synthetic-data model classified 14-day disruption risk as "
                f"{quantitative['riskBand'].lower()} at "
                f"{float(quantitative['riskProbability']):.1%}. "
                "Document evidence will be added in M3."
            )
        },
        "evidence": [],
        "telemetry": {
            "modelInferenceMs": quantitative["inferenceMs"],
            "riskEngineMs": elapsed_ms,
        },
    }
