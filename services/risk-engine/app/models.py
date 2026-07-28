from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SupplierMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    deliveryDelayRate30d: float = Field(ge=0, le=1)
    defectRate90d: float = Field(ge=0, le=1)
    cancellationRate90d: float = Field(ge=0, le=1)
    onTimeDeliveryTrend90d: float = Field(ge=-1, le=1)
    leadTimeVarianceDays: float = Field(ge=0, le=90)
    openDisputes: int = Field(ge=0, le=100)
    financialStabilityIndex: float = Field(ge=0, le=1)
    recentIncidents: int = Field(ge=0, le=100)


class EvaluationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scenarioId: Literal["high-risk-logistics", "medium-risk-quality", "low-risk-stable"]
    supplierMetrics: SupplierMetrics
    question: str = Field(min_length=5, max_length=500)
