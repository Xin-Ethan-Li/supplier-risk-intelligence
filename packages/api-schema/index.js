export const supplierMetricsSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "deliveryDelayRate30d",
    "defectRate90d",
    "cancellationRate90d",
    "onTimeDeliveryTrend90d",
    "leadTimeVarianceDays",
    "openDisputes",
    "financialStabilityIndex",
    "recentIncidents",
  ],
  properties: {
    deliveryDelayRate30d: { type: "number", minimum: 0, maximum: 1 },
    defectRate90d: { type: "number", minimum: 0, maximum: 1 },
    cancellationRate90d: { type: "number", minimum: 0, maximum: 1 },
    onTimeDeliveryTrend90d: { type: "number", minimum: -1, maximum: 1 },
    leadTimeVarianceDays: { type: "number", minimum: 0, maximum: 90 },
    openDisputes: { type: "integer", minimum: 0, maximum: 100 },
    financialStabilityIndex: { type: "number", minimum: 0, maximum: 1 },
    recentIncidents: { type: "integer", minimum: 0, maximum: 100 },
  },
};

export const evaluationRequestSchema = {
  $id: "EvaluationRequest",
  type: "object",
  additionalProperties: false,
  required: ["scenarioId", "supplierMetrics", "question"],
  properties: {
    scenarioId: { type: "string", minLength: 1, maxLength: 80 },
    supplierMetrics: supplierMetricsSchema,
    question: { type: "string", minLength: 5, maxLength: 500 },
  },
};

export const evaluationResponseSchema = {
  $id: "EvaluationResponse",
  type: "object",
  additionalProperties: false,
  required: [
    "evaluationId",
    "correlationId",
    "createdAt",
    "status",
    "quantitative",
    "document",
    "insight",
    "evidence",
    "telemetry",
    "disclaimer",
  ],
  properties: {
    evaluationId: { type: "string" },
    correlationId: { type: "string" },
    createdAt: { type: "string" },
    status: { type: "string", enum: ["PARTIAL"] },
    quantitative: {
      type: "object",
      additionalProperties: false,
      required: [
        "status",
        "modelVersion",
        "riskProbability",
        "riskBand",
        "outlookDays",
        "thresholds",
        "drivers",
        "inferenceMs",
      ],
      properties: {
        status: { type: "string", enum: ["READY"] },
        modelVersion: { type: "string" },
        riskProbability: { type: "number", minimum: 0, maximum: 1 },
        riskBand: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
        outlookDays: { const: 14 },
        thresholds: {
          type: "object",
          additionalProperties: false,
          required: ["medium", "high"],
          properties: {
            medium: { type: "number", minimum: 0, maximum: 1 },
            high: { type: "number", minimum: 0, maximum: 1 },
          },
        },
        drivers: {
          type: "array",
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "feature",
              "displayName",
              "value",
              "contribution",
              "direction",
            ],
            properties: {
              feature: { type: "string" },
              displayName: { type: "string" },
              value: { type: "number" },
              contribution: { type: "number" },
              direction: {
                type: "string",
                enum: ["INCREASES_RISK", "REDUCES_RISK"],
              },
            },
          },
        },
        inferenceMs: { type: "number", minimum: 0 },
      },
    },
    document: {
      type: "object",
      additionalProperties: false,
      required: ["status", "indexVersion"],
      properties: {
        status: { type: "string", enum: ["NOT_IMPLEMENTED"] },
        indexVersion: { type: "string" },
      },
    },
    insight: {
      type: "object",
      additionalProperties: false,
      required: ["summary"],
      properties: { summary: { type: "string" } },
    },
    evidence: { type: "array", maxItems: 5, items: { type: "object" } },
    telemetry: {
      type: "object",
      additionalProperties: false,
      required: ["apiMs", "modelInferenceMs", "riskEngineMs", "totalMs"],
      properties: {
        apiMs: { type: "number", minimum: 0 },
        modelInferenceMs: { type: "number", minimum: 0 },
        riskEngineMs: { type: "number", minimum: 0 },
        totalMs: { type: "number", minimum: 0 },
      },
    },
    disclaimer: { type: "string" },
  },
};
