from app.model_service import RiskModel
from app.models import SupplierMetrics


def test_model_artifact_and_feature_contributions_are_loaded() -> None:
    model = RiskModel()
    result = model.predict(
        SupplierMetrics(
            deliveryDelayRate30d=0.27,
            defectRate90d=0.08,
            cancellationRate90d=0.05,
            onTimeDeliveryTrend90d=-0.18,
            leadTimeVarianceDays=6.4,
            openDisputes=3,
            financialStabilityIndex=0.31,
            recentIncidents=4,
        )
    )

    assert result["modelVersion"] == "srm-xgb-demo-1.0.0"
    assert result["outlookDays"] == 14
    assert 0 <= result["riskProbability"] <= 1
    assert len(result["drivers"]) == 5
    assert {driver["direction"] for driver in result["drivers"]} <= {
        "INCREASES_RISK",
        "REDUCES_RISK",
    }
