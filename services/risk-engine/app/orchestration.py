import re
from typing import Any

FUSION_POLICY_VERSION = "demo-fusion-1.0.0"
QUANTITATIVE_WEIGHT = 0.7
DOCUMENT_WEIGHT = 0.3
COMBINED_THRESHOLDS = {"medium": 0.2, "high": 0.65}
CITATION_PATTERN = re.compile(r"\[(E[1-5])\]")

ATTENTION_BY_CATEGORY = {
    "LOGISTICS": "Confirm recovery dates and contingency transport coverage.",
    "OPERATIONS": "Review continuity actions, safety stock and restart dependencies.",
    "QUALITY": "Verify corrective-action effectiveness before closure.",
    "FINANCIAL": "Monitor liquidity headroom and critical sub-tier payments.",
    "PERFORMANCE": "Review delivery and quality trends against agreed thresholds.",
    "LEGAL": "Review unresolved contractual or compliance exceptions.",
}


def risk_band(score: float) -> str:
    if score >= COMBINED_THRESHOLDS["high"]:
        return "HIGH"
    if score >= COMBINED_THRESHOLDS["medium"]:
        return "MEDIUM"
    return "LOW"


def fuse_risk(quantitative: dict[str, Any], document: dict[str, Any]) -> dict[str, Any]:
    has_evidence = document["status"] == "READY" and document["evidenceCount"] > 0
    if has_evidence:
        effective_quantitative = QUANTITATIVE_WEIGHT
        effective_document = DOCUMENT_WEIGHT
        confidence = "SUPPORTED"
    else:
        effective_quantitative = 1.0
        effective_document = 0.0
        confidence = "MODEL_ONLY"

    score = (
        float(quantitative["riskProbability"]) * effective_quantitative
        + float(document["riskScore"]) * effective_document
    )
    return {
        "status": "READY",
        "combinedScore": round(score, 6),
        "riskBand": risk_band(score),
        "confidence": confidence,
        "policyVersion": FUSION_POLICY_VERSION,
        "configuredWeights": {
            "quantitative": QUANTITATIVE_WEIGHT,
            "document": DOCUMENT_WEIGHT,
        },
        "effectiveWeights": {
            "quantitative": effective_quantitative,
            "document": effective_document,
        },
        "thresholds": COMBINED_THRESHOLDS,
    }


def build_insight(
    risk: dict[str, Any],
    quantitative: dict[str, Any],
    document: dict[str, Any],
    evidence: list[dict[str, Any]],
) -> dict[str, Any]:
    categories = list(dict.fromkeys(item["riskCategory"] for item in evidence))[:3]
    if evidence:
        citation_ids = [evidence[0]["citationId"]]
        summary = (
            f"Overall demo risk is {risk['riskBand'].lower()} at "
            f"{float(risk['combinedScore']):.1%}, combining synthetic model risk "
            f"{float(quantitative['riskProbability']):.1%} and fictional document risk "
            f"{float(document['riskScore']):.1%}. The leading evidence is "
            f"{evidence[0]['title']} [{evidence[0]['citationId']}]."
        )
    else:
        citation_ids = []
        summary = (
            f"Overall demo risk is {risk['riskBand'].lower()} at "
            f"{float(risk['combinedScore']):.1%}, based on the synthetic model only. "
            "Insufficient fictional document evidence was found, so document risk was "
            "not treated as zero and received no effective fusion weight."
        )

    attention_items = [ATTENTION_BY_CATEGORY[category] for category in categories]
    if not attention_items:
        attention_items = ["Review the model drivers and obtain relevant supplier evidence."]
    return {
        "conclusion": f"{risk['riskBand']}_RISK",
        "riskCategories": categories,
        "summary": summary,
        "citationIds": citation_ids,
        "attentionItems": attention_items,
    }


def validate_evaluation(
    risk: dict[str, Any],
    document: dict[str, Any],
    insight: dict[str, Any],
    evidence: list[dict[str, Any]],
) -> None:
    evidence_ids = [item["citationId"] for item in evidence]
    if len(evidence_ids) != len(set(evidence_ids)):
        raise ValueError("Evidence citation IDs must be unique.")
    if int(document["evidenceCount"]) != len(evidence):
        raise ValueError("Document evidenceCount does not match the evidence array.")

    citation_ids = insight["citationIds"]
    summary_citations = CITATION_PATTERN.findall(insight["summary"])
    if len(citation_ids) != len(set(citation_ids)):
        raise ValueError("Insight citation IDs must be unique.")
    if set(citation_ids) - set(evidence_ids):
        raise ValueError("Every insight citation must resolve to returned evidence.")
    if set(summary_citations) != set(citation_ids):
        raise ValueError("Summary citations and structured citation IDs differ.")
    if document["status"] == "INSUFFICIENT_EVIDENCE" and (evidence or citation_ids):
        raise ValueError("Insufficient evidence responses cannot contain citations.")
    if not 0 <= float(risk["combinedScore"]) <= 1:
        raise ValueError("Combined risk score must be between zero and one.")
