from app.retrieval_service import RetrievalIndex


def test_hybrid_retrieval_returns_unique_cited_documents() -> None:
    index = RetrievalIndex()
    result = index.search(
        "Are port congestion and missed sailings delaying European orders?",
        "high-risk-logistics",
    )

    document_ids = [item["documentId"] for item in result["evidence"]]
    assert result["status"] == "READY"
    assert result["indexVersion"] == "srm-retrieval-demo-1.0.0"
    assert document_ids[0] == "NSC-LOG-2026-06"
    assert len(document_ids) == len(set(document_ids))
    assert result["evidence"][0]["citationId"] == "E1"


def test_irrelevant_question_returns_insufficient_evidence() -> None:
    index = RetrievalIndex()
    result = index.search(
        "What is the atmospheric composition of a distant exoplanet?",
        "low-risk-stable",
    )

    assert result["status"] == "INSUFFICIENT_EVIDENCE"
    assert result["evidence"] == []
