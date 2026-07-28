export const supplierMetricsSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "deliveryDelayRate30d",
    "defectRate90d",
    "cancellationRate90d",
    "leadTimeVarianceDays",
    "openDisputes",
    "recentIncidents",
  ],
  properties: {
    deliveryDelayRate30d: { type: "number", minimum: 0, maximum: 1 },
    defectRate90d: { type: "number", minimum: 0, maximum: 1 },
    cancellationRate90d: { type: "number", minimum: 0, maximum: 1 },
    leadTimeVarianceDays: { type: "number", minimum: 0, maximum: 90 },
    openDisputes: { type: "integer", minimum: 0, maximum: 100 },
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
    status: { type: "string", enum: ["SKELETON"] },
    quantitative: {
      type: "object",
      additionalProperties: false,
      required: ["status", "modelVersion"],
      properties: {
        status: { type: "string", enum: ["NOT_IMPLEMENTED"] },
        modelVersion: { type: "string" },
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
      required: ["apiMs", "riskEngineMs", "totalMs"],
      properties: {
        apiMs: { type: "number", minimum: 0 },
        riskEngineMs: { type: "number", minimum: 0 },
        totalMs: { type: "number", minimum: 0 },
      },
    },
    disclaimer: { type: "string" },
  },
};
