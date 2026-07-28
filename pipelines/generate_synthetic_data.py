import argparse

import numpy as np
import pandas as pd

from .config import (
    DEFAULT_ROWS,
    GENERATED_DATA_DIR,
    RANDOM_SEED,
    SAMPLE_DATA_PATH,
    TARGET_COLUMN,
)


def generate_dataset(rows: int = DEFAULT_ROWS, seed: int = RANDOM_SEED) -> pd.DataFrame:
    """Generate point-in-time supplier snapshots with a noisy 14-day future label."""
    if rows < 1_000:
        raise ValueError(
            "At least 1,000 rows are required to preserve the rare-event design."
        )

    rng = np.random.default_rng(seed)
    start = np.datetime64("2019-01-01")
    end = np.datetime64("2025-12-31")
    day_offsets = rng.integers(0, int((end - start) / np.timedelta64(1, "D")) + 1, rows)
    as_of_time = start + day_offsets.astype("timedelta64[D]")

    operational_shock = rng.beta(1.2, 8.0, rows)
    seasonal_pressure = np.sin(day_offsets / 365.25 * 2 * np.pi) * 0.015
    time_drift = day_offsets / max(day_offsets.max(), 1)

    delivery_delay = np.clip(
        rng.beta(2.0, 13.0, rows) + operational_shock * 0.38 + seasonal_pressure,
        0,
        1,
    )
    defect_rate = np.clip(rng.beta(1.3, 31.0, rows) + operational_shock * 0.13, 0, 1)
    cancellation_rate = np.clip(
        rng.beta(1.2, 42.0, rows) + operational_shock * 0.11,
        0,
        1,
    )
    on_time_trend = np.clip(
        rng.normal(0.01, 0.055, rows) - operational_shock * 0.32, -1, 1
    )
    lead_time_variance = np.clip(
        rng.gamma(2.0, 1.25, rows) + operational_shock * 12.0,
        0,
        90,
    )
    open_disputes = np.clip(rng.poisson(0.12 + operational_shock * 3.0, rows), 0, 100)
    financial_stability = np.clip(
        rng.beta(8.5, 2.0, rows) - operational_shock * 0.5 - time_drift * 0.025,
        0,
        1,
    )
    recent_incidents = np.clip(
        rng.poisson(0.15 + operational_shock * 4.0, rows), 0, 100
    )

    latent_risk = (
        4.4 * delivery_delay
        + 7.0 * defect_rate
        + 6.0 * cancellation_rate
        - 2.8 * on_time_trend
        + 0.12 * lead_time_variance
        + 0.48 * open_disputes
        - 2.2 * financial_stability
        + 0.42 * recent_incidents
        + 0.45 * time_drift
        + rng.normal(0, 0.95, rows)
    )
    high_risk_threshold = float(np.quantile(latent_risk, 0.98))
    target = (latent_risk >= high_risk_threshold).astype(np.int8)

    frame = pd.DataFrame(
        {
            "supplier_id": [f"SUP-{value:05d}" for value in rng.integers(1, 501, rows)],
            "as_of_time": pd.to_datetime(as_of_time),
            "label_window_end": pd.to_datetime(as_of_time + np.timedelta64(14, "D")),
            "delivery_delay_rate_30d": delivery_delay.round(6),
            "defect_rate_90d": defect_rate.round(6),
            "cancellation_rate_90d": cancellation_rate.round(6),
            "on_time_delivery_trend_90d": on_time_trend.round(6),
            "lead_time_variance_days": lead_time_variance.round(6),
            "open_disputes": open_disputes.astype(int),
            "financial_stability_index": financial_stability.round(6),
            "recent_incidents": recent_incidents.astype(int),
            TARGET_COLUMN: target,
        }
    )
    return frame.sort_values(["as_of_time", "supplier_id"], ignore_index=True)


def write_dataset(frame: pd.DataFrame) -> tuple[str, str]:
    GENERATED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    generated_path = GENERATED_DATA_DIR / "supplier_risk_events.csv"
    frame.to_csv(generated_path, index=False, date_format="%Y-%m-%d")

    sample = pd.concat(
        [
            frame[frame[TARGET_COLUMN] == 0].sample(n=80, random_state=RANDOM_SEED),
            frame[frame[TARGET_COLUMN] == 1].sample(n=20, random_state=RANDOM_SEED),
        ]
    ).sort_values("as_of_time")
    sample.to_csv(SAMPLE_DATA_PATH, index=False, date_format="%Y-%m-%d")
    return str(generated_path), str(SAMPLE_DATA_PATH)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate synthetic supplier-risk snapshots."
    )
    parser.add_argument("--rows", type=int, default=DEFAULT_ROWS)
    parser.add_argument("--seed", type=int, default=RANDOM_SEED)
    args = parser.parse_args()

    frame = generate_dataset(args.rows, args.seed)
    generated_path, sample_path = write_dataset(frame)
    prevalence = frame[TARGET_COLUMN].mean()
    print(f"Generated {len(frame):,} rows at {generated_path}")
    print(f"Committed sample: {sample_path}")
    print(f"High-risk prevalence: {prevalence:.2%}")


if __name__ == "__main__":
    main()
