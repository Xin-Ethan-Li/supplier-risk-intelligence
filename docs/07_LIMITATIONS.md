# Known Limitations

## Product and data

- The project uses synthetic tabular records and fictional English documents. It has not been validated on real supplier populations, labels, languages or document distributions.
- The model output is a demonstration risk signal, not a recommendation to approve, reject or sanction a supplier. Human review and a governed decision policy would be mandatory in production.
- There is no authentication, tenant isolation, supplier master-data integration, case management or audit database. The public endpoint is intentionally read-only and ephemeral.
- Arbitrary file upload, PDF parsing and OCR are excluded from the public profile to avoid privacy, malware and resource-exhaustion risks.

## Model and retrieval

- Feature contributions are local XGBoost log-odds contributions used for ranking and direction; they are not causal explanations.
- The selected model threshold is optimized on synthetic validation data and is not calibrated to a real cost matrix.
- TF-IDF/LSA provides a compact, deterministic local embedding but has weaker semantic generalization than modern embedding models.
- Retrieval evaluation has only eight curated questions. Its perfect Recall@5 and MRR are regression results, not general capability claims.
- Temporal decay and source-quality values are explicit demo heuristics rather than learned or externally certified scores.
- The deterministic summary is safer and reproducible, but less flexible than a carefully governed LLM workflow.

## Runtime and hosting

- The service is single-region and has no horizontal-scaling, queue, cache, database or disaster-recovery layer.
- In-memory rate limiting is per API instance and is not a distributed abuse-control mechanism.
- The local benchmark is warm and sequential. It does not characterize concurrency, cold starts or internet latency.
- The hosted profile uses a free Render Web Service. It spins down after inactivity, so the first request can take about one minute; Render can restart it at any time and monthly free-instance, bandwidth and build limits apply.
- To avoid two sequential free-service cold starts, the hosted image runs Fastify and the Python Risk Engine as separate processes in one container. Local Compose and the source architecture preserve separate service images.
- Service names in `render.yaml` determine the default `onrender.com` URLs. If Render changes a name because of a collision, both `PUBLIC_API_BASE_URL` and `WEB_ORIGINS` must be updated.

## Before production use

A real implementation would require representative data governance, label review, temporal leakage analysis, calibration and fairness assessment; identity and authorization; encryption and centralized secrets; persistent audit trails; distributed rate limiting; SLOs, alerting and incident response; adversarial file controls; model and retrieval monitoring; and legal/procurement approval.
