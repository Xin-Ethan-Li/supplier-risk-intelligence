# Evaluation

## Purpose and boundaries

This document separates reproducible demo measurements from real-world performance claims. All model records are synthetic and all retrieved documents are fictional. The evaluation establishes regression behavior for this repository only; it does not validate supplier risk decisions in a production population.

## Quantitative model

The generator creates 12,000 point-in-time supplier snapshots with fixed seed `726`, noisy features and an approximately 2% positive class. Splits are chronological:

- 2019–2023: training;
- 2024: validation and F2-oriented threshold selection;
- 2025: untouched final test.

Class weighting is calculated only from the training fold. The committed `srm-xgb-demo-1.0.0` XGBoost artifact consumes eight features in a fixed schema order and exposes local `pred_contribs` values for ranking and direction, not probability-percentage explanations.

| Test metric         |                         Result |
| ------------------- | -----------------------------: |
| Positive prevalence |                        2.1932% |
| Recall              |                       0.891892 |
| Precision           |                       0.323529 |
| PR-AUC              |                       0.653024 |
| ROC-AUC             |                       0.971794 |
| Confusion matrix    | TN 1581 / FP 69 / FN 4 / TP 33 |

Accuracy is deliberately not the primary metric because a trivial negative classifier would look strong at this prevalence. The selected threshold favours recall, which increases false positives and would require business calibration before real use.

Reproduce the artifact and checks:

```bash
pnpm data:generate
pnpm model:train
pnpm model:verify
```

## Retrieval

The `srm-retrieval-demo-1.0.0` index contains section-aware chunks from ten fictional documents. It combines L2-normalized TF-IDF/LSA dense similarity, BM25, domain-anchor boosts, source quality and temporal decay. Exact hashes and candidate-group similarity control duplicates; results keep only the strongest chunk per document.

| Retrieval metric   |   Result |
| ------------------ | -------: |
| Curated queries    |        8 |
| Retained documents |       10 |
| Indexed chunks     |       17 |
| Recall@5           | 1.000000 |
| MRR                | 1.000000 |

The query set was deliberately written for the small fictional corpus. Perfect scores mean the committed regression cases pass; they do not demonstrate multilingual, long-document or open-domain retrieval quality.

```bash
pnpm retrieval:build
pnpm retrieval:evaluate
pnpm retrieval:verify
```

## End-to-end policy

Policy `demo-fusion-1.0.0` computes `quantitativeRisk × 0.70 + documentRisk × 0.30`. Combined bands begin at 0.20 for Medium and 0.65 for High. When retrieval is insufficient, the response is `MODEL_ONLY`, the document weight becomes zero and the quantitative weight becomes one.

The three committed scenarios regress to High, Medium and Low outcomes. Every summary citation must resolve to evidence in the same response, and unrelated questions must return no invented source.

## Performance baseline

The committed M6 report uses three warm-ups and 18 sequential measured requests against the local Docker stack:

| Measurement              |      P95 |
| ------------------------ | -------: |
| Client-observed response | 34.08 ms |
| Model inference          |  6.44 ms |
| Retrieval                |  2.10 ms |

Run `pnpm benchmark:api` against a warm stack. This is a developer-machine regression baseline, not throughput, concurrency or hosted-service capacity evidence.
