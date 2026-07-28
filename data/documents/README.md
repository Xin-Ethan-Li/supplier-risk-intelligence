# Fictional supplier document corpus

Every supplier, event and organization in this directory is fictional. The corpus exists only to demonstrate retrieval engineering and must not be interpreted as a claim about a real company.

`source/documents.json` contains document-level metadata and section text. It deliberately includes an exact duplicate and a near-duplicate revision so the ingestion pipeline can exercise both controls. `retrieval_evaluation.json` is a small human-authored relevance set used for Recall@5 and MRR.

Rebuild the committed index with:

```bash
python -m pipelines.build_retrieval_index
python -m pipelines.evaluate_retrieval
```
