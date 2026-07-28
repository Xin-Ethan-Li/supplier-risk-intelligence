import pytest
from app.orchestration import (
    build_insight,
    fuse_risk,
    validate_evaluation,
)


def test_supported_fusion_uses_published_demo_weights() -> None:
    quantitative = {"riskProbability": 0.8}
    document = {"status": "READY", "riskScore": 0.6, "evidenceCount": 1}

    result = fuse_risk(quantitative, document)

    assert result["combinedScore"] == 0.74
    assert result["riskBand"] == "HIGH"
    assert result["confidence"] == "SUPPORTED"
    assert result["effectiveWeights"] == {"quantitative": 0.7, "document": 0.3}


def test_insufficient_evidence_does_not_mean_zero_document_risk() -> None:
    quantitative = {"riskProbability": 0.4}
    document = {
        "status": "INSUFFICIENT_EVIDENCE",
        "riskScore": 0.0,
        "evidenceCount": 0,
    }

    result = fuse_risk(quantitative, document)

    assert result["combinedScore"] == 0.4
    assert result["confidence"] == "MODEL_ONLY"
    assert result["effectiveWeights"] == {"quantitative": 1.0, "document": 0.0}


def test_citation_validator_rejects_unresolved_summary_reference() -> None:
    risk = {"combinedScore": 0.7, "riskBand": "HIGH"}
    document = {"status": "READY", "riskScore": 0.6, "evidenceCount": 1}
    evidence = [
        {
            "citationId": "E1",
            "riskCategory": "QUALITY",
            "title": "Corrective Action Review",
        }
    ]
    insight = build_insight(risk, {"riskProbability": 0.8}, document, evidence)
    insight["summary"] = insight["summary"].replace("[E1]", "[E2]")

    with pytest.raises(ValueError, match="Summary citations"):
        validate_evaluation(risk, document, insight, evidence)
