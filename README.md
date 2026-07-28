# Supplier Risk Intelligence Platform Demo

An explainable supplier-risk technical demonstration combining a TypeScript API, a Python risk engine, and an Astro web experience.

> Status: M1 engineering skeleton complete. The current evaluation response is an explicit placeholder; XGBoost and RAG are implemented in later milestones.

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
pnpm verify
```

## Documentation

- [Product requirements](docs/01_PRD.md)
- [Development plan](docs/02_DEVELOPMENT_PLAN.md)
- [Technical architecture](docs/03_TECHNICAL_ARCHITECTURE.md)
- [Development walkthrough](docs/04_DEVELOPMENT_WALKTHROUGH.md)

## Data and claims

This repository is a portfolio reference implementation. It does not contain employer data, source code, models, or documents. Later milestones use clearly labelled synthetic data and fictional supplier documents. Demo measurements will be reported separately from historical production-project claims.
