import json
import os
from pathlib import Path
from threading import Lock
from time import perf_counter
from typing import Any

import numpy as np
import xgboost as xgb

from .models import SupplierMetrics

API_TO_MODEL_FEATURE = {
    "deliveryDelayRate30d": "delivery_delay_rate_30d",
    "defectRate90d": "defect_rate_90d",
    "cancellationRate90d": "cancellation_rate_90d",
    "onTimeDeliveryTrend90d": "on_time_delivery_trend_90d",
    "leadTimeVarianceDays": "lead_time_variance_days",
    "openDisputes": "open_disputes",
    "financialStabilityIndex": "financial_stability_index",
    "recentIncidents": "recent_incidents",
}


class RiskModel:
    def __init__(self) -> None:
        model_path = os.getenv("MODEL_PATH")
        metadata_path = os.getenv("MODEL_METADATA_PATH")
        if model_path and metadata_path:
            self.model_path = Path(model_path)
            self.metadata_path = Path(metadata_path)
        else:
            project_root = Path(__file__).resolve().parents[3]
            self.model_path = project_root / "models" / "srm-xgb-demo-1.0.0.json"
            self.metadata_path = project_root / "models" / "srm-xgb-demo-1.0.0.metadata.json"
        self.metadata: dict[str, Any] = json.loads(self.metadata_path.read_text(encoding="utf-8"))
        self.booster = xgb.Booster()
        self.booster.load_model(self.model_path)
        self.feature_columns: list[str] = self.metadata["featureColumns"]
        self._lock = Lock()

        if self.booster.attr("model_version") != self.metadata["modelVersion"]:
            raise RuntimeError("Model and metadata versions do not match.")

    @property
    def version(self) -> str:
        return str(self.metadata["modelVersion"])

    def predict(self, metrics: SupplierMetrics) -> dict[str, Any]:
        started_at = perf_counter()
        api_values = metrics.model_dump()
        model_values = {
            model_name: float(api_values[api_name])
            for api_name, model_name in API_TO_MODEL_FEATURE.items()
        }
        ordered_values = [model_values[name] for name in self.feature_columns]
        matrix = xgb.DMatrix(
            np.asarray([ordered_values], dtype=np.float32),
            feature_names=self.feature_columns,
        )

        with self._lock:
            probability = float(self.booster.predict(matrix)[0])
            contributions = self.booster.predict(matrix, pred_contribs=True)[0][:-1]

        thresholds = self.metadata["thresholds"]
        if probability >= float(thresholds["high"]):
            risk_band = "HIGH"
        elif probability >= float(thresholds["medium"]):
            risk_band = "MEDIUM"
        else:
            risk_band = "LOW"

        definitions = self.metadata["featureDefinitions"]
        ranked = sorted(
            zip(self.feature_columns, ordered_values, contributions, strict=True),
            key=lambda item: abs(float(item[2])),
            reverse=True,
        )[:5]
        drivers = [
            {
                "feature": feature,
                "displayName": definitions[feature]["displayName"],
                "value": value,
                "contribution": round(float(contribution), 6),
                "direction": ("INCREASES_RISK" if contribution >= 0 else "REDUCES_RISK"),
            }
            for feature, value, contribution in ranked
        ]
        inference_ms = (perf_counter() - started_at) * 1000

        return {
            "status": "READY",
            "modelVersion": self.version,
            "riskProbability": round(probability, 6),
            "riskBand": risk_band,
            "outlookDays": int(self.metadata["forecastHorizonDays"]),
            "thresholds": {
                "medium": float(thresholds["medium"]),
                "high": float(thresholds["high"]),
            },
            "drivers": drivers,
            "inferenceMs": inference_ms,
        }
