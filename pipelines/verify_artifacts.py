import json

import xgboost as xgb

from .config import (
    FEATURE_COLUMNS,
    METADATA_PATH,
    METRICS_PATH,
    MODEL_PATH,
    MODEL_VERSION,
)


def main() -> None:
    for path in (MODEL_PATH, METADATA_PATH, METRICS_PATH):
        if not path.is_file():
            raise FileNotFoundError(f"Required artifact is missing: {path}")

    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    if metadata["modelVersion"] != MODEL_VERSION:
        raise ValueError(
            "Model metadata version does not match the configured version."
        )
    if metadata["featureColumns"] != FEATURE_COLUMNS:
        raise ValueError(
            "Model feature order does not match the configured feature order."
        )
    if metadata["dataNature"] != "synthetic":
        raise ValueError(
            "The public demo artifact must be explicitly marked synthetic."
        )

    booster = xgb.Booster()
    booster.load_model(MODEL_PATH)
    if booster.num_features() != len(FEATURE_COLUMNS):
        raise ValueError("XGBoost artifact feature count does not match metadata.")
    print(f"Verified {MODEL_VERSION} with {booster.num_features()} features.")


if __name__ == "__main__":
    main()
