import hashlib
import json
from datetime import UTC, datetime

import numpy as np
import pandas as pd
import sklearn
import xgboost as xgb
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)

from .config import (
    DEFAULT_ROWS,
    FEATURE_COLUMNS,
    FEATURE_DEFINITIONS,
    GENERATED_DATA_DIR,
    METADATA_PATH,
    METRICS_PATH,
    MODEL_DIR,
    MODEL_PATH,
    MODEL_VERSION,
    RANDOM_SEED,
    TARGET_COLUMN,
)
from .generate_synthetic_data import generate_dataset, write_dataset


def validate_point_in_time(frame: pd.DataFrame) -> None:
    if not (frame["label_window_end"] > frame["as_of_time"]).all():
        raise ValueError("Every label window must occur after the feature as-of time.")
    missing = set(FEATURE_COLUMNS) - set(frame.columns)
    if missing:
        raise ValueError(f"Missing model features: {sorted(missing)}")
    forbidden = [
        column for column in FEATURE_COLUMNS if "future" in column or "label" in column
    ]
    if forbidden:
        raise ValueError(
            f"Future or label columns cannot be model features: {forbidden}"
        )


def split_by_time(
    frame: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    years = frame["as_of_time"].dt.year
    train = frame[years <= 2023].copy()
    validation = frame[years == 2024].copy()
    test = frame[years >= 2025].copy()
    if train.empty or validation.empty or test.empty:
        raise ValueError(
            "The time split requires rows in train, validation and test periods."
        )
    return train, validation, test


def select_threshold(y_true: np.ndarray, probability: np.ndarray) -> dict[str, float]:
    precision, recall, thresholds = precision_recall_curve(y_true, probability)
    precision = precision[:-1]
    recall = recall[:-1]
    beta_squared = 4.0
    denominator = beta_squared * precision + recall
    f2 = np.divide(
        (1 + beta_squared) * precision * recall,
        denominator,
        out=np.zeros_like(denominator),
        where=denominator > 0,
    )
    index = int(np.argmax(f2))
    high = float(thresholds[index])
    return {
        "medium": round(max(0.05, high * 0.45), 6),
        "high": round(high, 6),
        "selectionMetric": "validation_f2",
        "validationF2": round(float(f2[index]), 6),
    }


def evaluate(
    y_true: np.ndarray, probability: np.ndarray, threshold: float
) -> dict[str, object]:
    prediction = (probability >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, prediction, labels=[0, 1]).ravel()
    return {
        "rows": len(y_true),
        "prevalence": round(float(np.mean(y_true)), 6),
        "threshold": round(float(threshold), 6),
        "recall": round(float(recall_score(y_true, prediction, zero_division=0)), 6),
        "precision": round(
            float(precision_score(y_true, prediction, zero_division=0)), 6
        ),
        "prAuc": round(float(average_precision_score(y_true, probability)), 6),
        "rocAuc": round(float(roc_auc_score(y_true, probability)), 6),
        "confusionMatrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def dataset_hash(frame: pd.DataFrame) -> str:
    values = pd.util.hash_pandas_object(frame, index=True).values.tobytes()
    return hashlib.sha256(values).hexdigest()


def train() -> dict[str, object]:
    frame = generate_dataset(DEFAULT_ROWS, RANDOM_SEED)
    validate_point_in_time(frame)
    generated_path, _ = write_dataset(frame)
    train_frame, validation_frame, test_frame = split_by_time(frame)

    positive = int(train_frame[TARGET_COLUMN].sum())
    negative = int(len(train_frame) - positive)
    scale_pos_weight = negative / max(positive, 1)

    train_matrix = xgb.DMatrix(
        train_frame[FEATURE_COLUMNS],
        label=train_frame[TARGET_COLUMN],
        feature_names=FEATURE_COLUMNS,
    )
    validation_matrix = xgb.DMatrix(
        validation_frame[FEATURE_COLUMNS],
        label=validation_frame[TARGET_COLUMN],
        feature_names=FEATURE_COLUMNS,
    )
    test_matrix = xgb.DMatrix(
        test_frame[FEATURE_COLUMNS],
        label=test_frame[TARGET_COLUMN],
        feature_names=FEATURE_COLUMNS,
    )

    params = {
        "objective": "binary:logistic",
        "eval_metric": "aucpr",
        "max_depth": 4,
        "eta": 0.045,
        "min_child_weight": 4,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "lambda": 2.0,
        "alpha": 0.1,
        "scale_pos_weight": scale_pos_weight,
        "seed": RANDOM_SEED,
        "nthread": 2,
    }
    booster = xgb.train(params, train_matrix, num_boost_round=260, verbose_eval=False)
    validation_probability = booster.predict(validation_matrix)
    test_probability = booster.predict(test_matrix)
    thresholds = select_threshold(
        validation_frame[TARGET_COLUMN].to_numpy(), validation_probability
    )
    test_metrics = evaluate(
        test_frame[TARGET_COLUMN].to_numpy(),
        test_probability,
        float(thresholds["high"]),
    )
    validation_metrics = evaluate(
        validation_frame[TARGET_COLUMN].to_numpy(),
        validation_probability,
        float(thresholds["high"]),
    )

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    booster.set_attr(model_version=MODEL_VERSION)
    booster.save_model(MODEL_PATH)

    metrics = {
        "modelVersion": MODEL_VERSION,
        "dataNature": "synthetic",
        "primaryMetrics": ["recall", "precision", "prAuc"],
        "validation": validation_metrics,
        "test": test_metrics,
    }
    metadata = {
        "modelVersion": MODEL_VERSION,
        "createdAt": datetime.now(UTC).isoformat(),
        "dataNature": "synthetic",
        "randomSeed": RANDOM_SEED,
        "datasetRows": len(frame),
        "datasetSha256": dataset_hash(frame),
        "generatedDataPath": GENERATED_DATA_DIR.relative_to(
            GENERATED_DATA_DIR.parents[2]
        ).as_posix(),
        "featureColumns": FEATURE_COLUMNS,
        "featureDefinitions": FEATURE_DEFINITIONS,
        "target": TARGET_COLUMN,
        "forecastHorizonDays": 14,
        "timeSplit": {
            "train": "2019-01-01 through 2023-12-31",
            "validation": "2024-01-01 through 2024-12-31",
            "test": "2025-01-01 through 2025-12-31",
        },
        "thresholds": thresholds,
        "training": {
            "rows": len(train_frame),
            "positiveRows": positive,
            "scalePosWeight": round(scale_pos_weight, 6),
            "imbalanceStrategy": "training_only_scale_pos_weight",
            "parameters": params,
            "rounds": 260,
        },
        "libraries": {
            "xgboost": xgb.__version__,
            "scikitLearn": sklearn.__version__,
            "pandas": pd.__version__,
            "numpy": np.__version__,
        },
        "metrics": metrics,
        "disclaimer": "Metrics are measured on deterministic synthetic data, not production suppliers.",
    }

    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Generated data: {generated_path}")
    print(f"Model: {MODEL_PATH}")
    print(json.dumps(test_metrics, indent=2))
    return metadata


if __name__ == "__main__":
    train()
