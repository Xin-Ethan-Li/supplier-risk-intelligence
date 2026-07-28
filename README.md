# Supplier Risk Intelligence Platform Demo

An explainable supplier-risk technical demonstration combining a TypeScript API, a Python risk engine, and an Astro web experience.

> Status: M4 API vertical slice complete. Live evaluations return a fused overall score, separate quantitative and document risks, cited evidence, deterministic attention items and stage telemetry.

## Services

| Service     | Technology           | Local URL               |
| ----------- | -------------------- | ----------------------- |
| Web         | Astro                | `http://localhost:4321` |
| Public API  | Fastify + TypeScript | `http://localhost:3000` |
| Risk Engine | FastAPI + Python     | `http://localhost:8000` |

## Quick start

### Docker Compose

```bash
docker compose up --build
```

Open `http://localhost:8080/demo`.

Interactive API documentation is available at `http://localhost:3100/docs/` in the Docker profile and `http://localhost:3000/docs/` during native development.

The Docker profile publishes the API at `http://localhost:3100`; native development uses port `3000`.

### Native development

```bash
pnpm install
pnpm bootstrap:risk
pnpm dev
```

## Verification

```bash
python -m pipelines.verify_artifacts
python -m pipelines.verify_retrieval_artifacts
pnpm verify
```

## M2 model evaluation

The committed `srm-xgb-demo-1.0.0` artifact is trained on 12,000 deterministic synthetic point-in-time snapshots. Training covers 2019–2023, threshold selection uses 2024 validation data, and the untouched test period is 2025.

| Test metric | Result |
| ----------- | -----: |
| Recall      | 0.8919 |
| Precision   | 0.3235 |
| PR-AUC      | 0.6530 |
| ROC-AUC     | 0.9718 |

These measurements characterize the synthetic generator and demo pipeline only; they do not establish real-world supplier performance.

## M3 retrieval evaluation

The committed `srm-retrieval-demo-1.0.0` index uses section-aware chunks, exact and near-duplicate controls, L2-normalized TF-IDF/LSA dense vectors, BM25, domain anchors, source quality and temporal decay.

| Retrieval metric   | Result |
| ------------------ | -----: |
| Evaluation queries |      8 |
| Recall@5           | 1.0000 |
| MRR                | 1.0000 |
| Indexed chunks     |     17 |

This is a small, intentionally designed fictional evaluation set. Perfect results do not imply general retrieval performance.

## M4 fusion policy

The public demo uses the explicit policy `demo-fusion-1.0.0`:

```text
combinedRisk = quantitativeRisk * 0.70 + documentRisk * 0.30
```

Combined bands use `0.20` for Medium and `0.65` for High. When retrieval returns insufficient evidence, the response becomes `MODEL_ONLY`; the effective document weight is zero and the quantitative signal receives 100% weight. Missing evidence is never treated as evidence of low risk.

## Documentation

- [Product requirements](docs/01_PRD.md)
- [Development plan](docs/02_DEVELOPMENT_PLAN.md)
- [Technical architecture](docs/03_TECHNICAL_ARCHITECTURE.md)
- [Development walkthrough](docs/04_DEVELOPMENT_WALKTHROUGH.md)

## Data and claims

This repository is a portfolio reference implementation. It does not contain employer data, source code, models, or documents. M2 uses clearly labelled synthetic data and M3 uses entirely fictional supplier documents. Demo measurements are reported separately from historical production-project claims.
