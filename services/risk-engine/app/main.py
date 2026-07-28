from concurrent.futures import ThreadPoolExecutor
from time import perf_counter

from fastapi import FastAPI, Header

from .model_service import RiskModel
from .models import EvaluationRequest
from .retrieval_service import RetrievalIndex

risk_model = RiskModel()
retrieval_index = RetrievalIndex()
executor = ThreadPoolExecutor(max_workers=2)

app = FastAPI(
    title="Supplier Risk Engine",
    version="0.3.0",
    description="M3 supplier risk inference with hybrid retrieval and cited evidence.",
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
        "version": "0.3.0",
        "milestone": "M3",
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

    if evidence:
        citation_ids = [evidence[0]["citationId"]]
        summary = (
            f"The synthetic-data model classified 14-day disruption risk as "
            f"{quantitative['riskBand'].lower()} at "
            f"{float(quantitative['riskProbability']):.1%}. Fictional document evidence "
            f"indicates {retrieval['riskBand'].lower()} risk, led by "
            f"{evidence[0]['title']} [{evidence[0]['citationId']}]."
        )
    else:
        citation_ids = []
        summary = (
            f"The synthetic-data model classified 14-day disruption risk as "
            f"{quantitative['riskBand'].lower()} at "
            f"{float(quantitative['riskProbability']):.1%}. "
            "Insufficient fictional document evidence was found for this question."
        )

    elapsed_ms = (perf_counter() - started_at) * 1000
    return {
        "status": "PARTIAL",
        "quantitative": quantitative,
        "document": retrieval,
        "insight": {"summary": summary, "citationIds": citation_ids},
        "evidence": evidence,
        "telemetry": {
            "modelInferenceMs": quantitative["inferenceMs"],
            "retrievalMs": retrieval["retrievalMs"],
            "riskEngineMs": elapsed_ms,
        },
    }
