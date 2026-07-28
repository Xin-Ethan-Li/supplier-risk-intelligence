from time import perf_counter

from fastapi import FastAPI, Header

from .models import EvaluationRequest

app = FastAPI(
    title="Supplier Risk Engine",
    version="0.1.0",
    description="M1 boundary for later XGBoost inference and hybrid retrieval.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "srm-risk-engine"}


@app.get("/ready")
def ready() -> dict[str, str]:
    return {"status": "ready", "service": "srm-risk-engine"}


@app.get("/version")
def version() -> dict[str, str]:
    return {
        "service": "srm-risk-engine",
        "version": "0.1.0",
        "milestone": "M1",
        "modelVersion": "pending-m2",
        "indexVersion": "pending-m3",
    }


@app.post("/v1/evaluations/preview")
def preview_evaluation(
    request: EvaluationRequest,
    x_correlation_id: str | None = Header(default=None),
) -> dict[str, object]:
    started_at = perf_counter()
    _ = request
    _ = x_correlation_id

    elapsed_ms = (perf_counter() - started_at) * 1000
    return {
        "status": "SKELETON",
        "quantitative": {"status": "NOT_IMPLEMENTED", "modelVersion": "pending-m2"},
        "document": {"status": "NOT_IMPLEMENTED", "indexVersion": "pending-m3"},
        "insight": {
            "summary": "M1 vertical slice is connected. Model inference begins in M2."
        },
        "evidence": [],
        "telemetry": {"riskEngineMs": elapsed_ms},
    }
