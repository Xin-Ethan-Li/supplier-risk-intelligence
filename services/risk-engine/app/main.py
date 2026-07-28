from concurrent.futures import ThreadPoolExecutor
from time import perf_counter

from fastapi import FastAPI, Header

from .model_service import RiskModel
from .models import EvaluationRequest
from .orchestration import build_insight, fuse_risk, validate_evaluation
from .retrieval_service import RetrievalIndex

risk_model = RiskModel()
retrieval_index = RetrievalIndex()
executor = ThreadPoolExecutor(max_workers=2)

app = FastAPI(
    title="Supplier Risk Engine",
    version="0.6.0",
    description="M4 end-to-end supplier risk evaluation with fusion and citations.",
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
        "indexVersion": retrieval_index.version,
    }


@app.get("/version")
def version() -> dict[str, str]:
    return {
        "service": "srm-risk-engine",
        "version": "0.6.0",
        "milestone": "M6",
        "modelVersion": risk_model.version,
        "indexVersion": retrieval_index.version,
    }


@app.post("/v1/evaluations/evaluate")
def evaluate_supplier(
    request: EvaluationRequest,
    x_correlation_id: str | None = Header(default=None),
) -> dict[str, object]:
    started_at = perf_counter()
    _ = x_correlation_id
    model_future = executor.submit(risk_model.predict, request.supplierMetrics)
    retrieval_future = executor.submit(retrieval_index.search, request.question, request.scenarioId)
    quantitative = model_future.result()
    retrieval = retrieval_future.result()
    evidence = retrieval.pop("evidence")
    fusion_started_at = perf_counter()
    risk = fuse_risk(quantitative, retrieval)
    insight = build_insight(risk, quantitative, retrieval, evidence)
    validate_evaluation(risk, retrieval, insight, evidence)
    fusion_ms = (perf_counter() - fusion_started_at) * 1000

    elapsed_ms = (perf_counter() - started_at) * 1000
    return {
        "status": "COMPLETE" if retrieval["status"] == "READY" else "MODEL_ONLY",
        "risk": risk,
        "quantitative": quantitative,
        "document": retrieval,
        "insight": insight,
        "evidence": evidence,
        "telemetry": {
            "modelInferenceMs": quantitative["inferenceMs"],
            "retrievalMs": retrieval["retrievalMs"],
            "fusionMs": fusion_ms,
            "riskEngineMs": elapsed_ms,
        },
    }
