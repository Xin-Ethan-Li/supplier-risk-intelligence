# Supplier Risk Intelligence Platform Demo

An explainable supplier-risk technical demonstration combining a TypeScript API, a Python risk engine, and an Astro web experience.

> Status: M2 data and model complete. The live evaluation now returns a versioned XGBoost probability, risk band, thresholds, and feature contributions. Document retrieval remains explicitly pending M3.

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

## Documentation

- [Product requirements](docs/01_PRD.md)
- [Development plan](docs/02_DEVELOPMENT_PLAN.md)
- [Technical architecture](docs/03_TECHNICAL_ARCHITECTURE.md)
- [Development walkthrough](docs/04_DEVELOPMENT_WALKTHROUGH.md)

## Data and claims

This repository is a portfolio reference implementation. It does not contain employer data, source code, models, or documents. M2 uses clearly labelled synthetic data; later milestones add fictional supplier documents. Demo measurements are reported separately from historical production-project claims.
