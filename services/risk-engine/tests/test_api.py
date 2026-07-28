import asyncio

import httpx

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
    assert version.json()["milestone"] == "M1"


def test_preview_returns_explicit_skeleton() -> None:
    response = request(
        "POST",
        "/v1/evaluations/preview",
        headers={"x-correlation-id": "test-correlation"},
        json={
            "scenarioId": "high-risk-logistics",
            "supplierMetrics": {
                "deliveryDelayRate30d": 0.27,
                "defectRate90d": 0.08,
                "cancellationRate90d": 0.05,
                "leadTimeVarianceDays": 6.4,
                "openDisputes": 3,
                "recentIncidents": 4,
            },
            "question": "Is this supplier likely to disrupt delivery?",
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "SKELETON"
    assert result["quantitative"]["modelVersion"] == "pending-m2"
    assert result["document"]["indexVersion"] == "pending-m3"


def test_preview_rejects_invalid_metrics() -> None:
    response = request(
        "POST",
        "/v1/evaluations/preview",
        json={
            "scenarioId": "invalid",
            "supplierMetrics": {
                "deliveryDelayRate30d": 3,
                "defectRate90d": 0,
                "cancellationRate90d": 0,
                "leadTimeVarianceDays": 0,
                "openDisputes": 0,
                "recentIncidents": 0,
            },
            "question": "Is this valid?",
        },
    )

    assert response.status_code == 422
