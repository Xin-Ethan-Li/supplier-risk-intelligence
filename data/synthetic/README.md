# Synthetic supplier-risk data

The M2 model uses deterministic synthetic supplier snapshots. No employer or real supplier data is present.

Each row represents information available at `as_of_time`. The target `disruption_next_14d` refers to the following 14-day window, ending at `label_window_end`.

The full generated CSV is intentionally ignored because it can be reproduced with:

```bash
pnpm data:generate
```

`sample_supplier_risk_events.csv` contains a small stratified sample for inspection. It is not the train or test dataset.
