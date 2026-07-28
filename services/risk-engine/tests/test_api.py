import asyncio

import httpx
import pytest

from app.main import app


def request(method: str, path: str, **kwargs: object) -> httpx.Response:
    async def send() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)

    return asyncio.run(send())


def test_health_and_version() -> None:
    health = request("GET", "/health")
    version = request("GET", "/version")

    assert health.status_code == 200
    assert health.json() == {"status": "ok", "service": "srm-risk-engine"}
    assert version.status_code == 200
    assert version.json()["milestone"] == "M4"
    assert version.json()["modelVersion"] == "srm-xgb-demo-1.0.0"
    assert version.json()["indexVersion"] == "srm-retrieval-demo-1.0.0"


def test_evaluate_returns_model_prediction() -> None:
    response = request(
        "POST",
        "/v1/evaluations/evaluate",
        headers={"x-correlation-id": "test-correlation"},
        json={
            "scenarioId": "high-risk-logistics",
            "supplierMetrics": {
                "deliveryDelayRate30d": 0.27,
                "defectRate90d": 0.08,
                "cancellationRate90d": 0.05,
                "onTimeDeliveryTrend90d": -0.18,
                "leadTimeVarianceDays": 6.4,
                "openDisputes": 3,
                "financialStabilityIndex": 0.31,
                "recentIncidents": 4,
            },
            "question": "Is this supplier likely to disrupt delivery?",
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "COMPLETE"
    assert result["risk"]["status"] == "READY"
    assert result["risk"]["policyVersion"] == "demo-fusion-1.0.0"
    assert result["risk"]["configuredWeights"] == {
        "quantitative": 0.7,
        "document": 0.3,
    }
    assert result["quantitative"]["status"] == "READY"
    assert result["quantitative"]["modelVersion"] == "srm-xgb-demo-1.0.0"
    assert 0 <= result["quantitative"]["riskProbability"] <= 1
    assert result["quantitative"]["riskBand"] in {"LOW", "MEDIUM", "HIGH"}
    assert len(result["quantitative"]["drivers"]) == 5
    assert result["document"]["status"] == "READY"
    assert result["document"]["indexVersion"] == "srm-retrieval-demo-1.0.0"
    assert result["document"]["evidenceCount"] > 0
    assert result["insight"]["citationIds"]
    assert result["evidence"][0]["citationId"] == "E1"
    evidence_ids = {item["citationId"] for item in result["evidence"]}
    assert set(result["insight"]["citationIds"]) <= evidence_ids


@pytest.mark.parametrize(
    ("scenario_id", "metrics", "question", "expected_band"),
    [
        (
            "medium-risk-quality",
            {
                "deliveryDelayRate30d": 0.335,
                "defectRate90d": 0.181,
                "cancellationRate90d": 0.045,
                "onTimeDeliveryTrend90d": -0.041,
                "leadTimeVarianceDays": 5.26,
                "openDisputes": 0,
                "financialStabilityIndex": 0.658,
                "recentIncidents": 1,
            },
            "Were the repeat dimensional defects fully corrected and verified?",
            "MEDIUM",
        ),
        (
            "low-risk-stable",
            {
                "deliveryDelayRate30d": 0.02,
                "defectRate90d": 0.01,
                "cancellationRate90d": 0.005,
                "onTimeDeliveryTrend90d": 0.08,
                "leadTimeVarianceDays": 1.2,
                "openDisputes": 0,
                "financialStabilityIndex": 0.88,
                "recentIncidents": 0,
            },
            "Is delivery stable with adequate continuity and financial health?",
            "LOW",
        ),
    ],
)
def test_preset_scenarios_return_expected_combined_band(
    scenario_id: str,
    metrics: dict[str, float | int],
    question: str,
    expected_band: str,
) -> None:
    response = request(
        "POST",
        "/v1/evaluations/evaluate",
        json={
            "scenarioId": scenario_id,
            "supplierMetrics": metrics,
            "question": question,
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "COMPLETE"
    assert result["risk"]["riskBand"] == expected_band
    assert result["risk"]["confidence"] == "SUPPORTED"


def test_irrelevant_question_returns_valid_model_only_evaluation() -> None:
    response = request(
        "POST",
        "/v1/evaluations/evaluate",
        json={
            "scenarioId": "low-risk-stable",
            "supplierMetrics": {
                "deliveryDelayRate30d": 0.02,
                "defectRate90d": 0.01,
                "cancellationRate90d": 0.005,
                "onTimeDeliveryTrend90d": 0.08,
                "leadTimeVarianceDays": 1.2,
                "openDisputes": 0,
                "financialStabilityIndex": 0.88,
                "recentIncidents": 0,
            },
            "question": "What is the atmosphere of a distant exoplanet?",
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "MODEL_ONLY"
    assert result["risk"]["confidence"] == "MODEL_ONLY"
    assert result["risk"]["effectiveWeights"] == {
        "quantitative": 1.0,
        "document": 0.0,
    }
    assert result["evidence"] == []
    assert result["insight"]["citationIds"] == []


def test_evaluate_rejects_invalid_metrics() -> None:
    response = request(
        "POST",
        "/v1/evaluations/evaluate",
        json={
            "scenarioId": "invalid",
            "supplierMetrics": {
                "deliveryDelayRate30d": 3,
                "defectRate90d": 0,
                "cancellationRate90d": 0,
                "onTimeDeliveryTrend90d": 0,
                "leadTimeVarianceDays": 0,
                "openDisputes": 0,
                "financialStabilityIndex": 1,
                "recentIncidents": 0,
            },
            "question": "Is this valid?",
        },
    )

    assert response.status_code == 422
