# Versioned model artifacts

M2 stores the XGBoost model as JSON, with separate metadata and metrics files. JSON is used for portable model IO; feature order, thresholds, training periods and evaluation results remain explicit in the metadata file.

Regenerate and verify the artifacts with:

```bash
pnpm model:train
pnpm model:verify
```

All reported metrics are from deterministic synthetic data and must not be presented as production performance.
