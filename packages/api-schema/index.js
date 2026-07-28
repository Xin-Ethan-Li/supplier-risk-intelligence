export const scenarios = [
  {
    id: "high-risk-logistics",
    name: "High-risk logistics disruption",
    supplierName: "Northstar Components",
    description: "Port delays, plant interruption and constrained liquidity.",
    defaultQuestion:
      "Are port congestion, plant interruption or liquidity pressure likely to disrupt delivery?",
    supplierMetrics: {
      deliveryDelayRate30d: 0.27,
      defectRate90d: 0.08,
      cancellationRate90d: 0.05,
      onTimeDeliveryTrend90d: -0.18,
      leadTimeVarianceDays: 6.4,
      openDisputes: 3,
      financialStabilityIndex: 0.31,
      recentIncidents: 4,
    },
  },
  {
    id: "medium-risk-quality",
    name: "Medium-risk quality drift",
    supplierName: "Apex Precision",
    description:
      "Contained dimensional defects with corrective action still under review.",
    defaultQuestion:
      "Were the repeat dimensional defects fully corrected and verified?",
    supplierMetrics: {
      deliveryDelayRate30d: 0.335,
      defectRate90d: 0.181,
      cancellationRate90d: 0.045,
      onTimeDeliveryTrend90d: -0.041,
      leadTimeVarianceDays: 5.26,
      openDisputes: 0,
      financialStabilityIndex: 0.658,
      recentIncidents: 1,
    },
  },
  {
    id: "low-risk-stable",
    name: "Low-risk stable supplier",
    supplierName: "Greenline Materials",
    description:
      "Stable delivery, low defects and tested continuity arrangements.",
    defaultQuestion:
      "Is this supplier delivering consistently with adequate continuity and financial stability?",
    supplierMetrics: {
      deliveryDelayRate30d: 0.02,
      defectRate90d: 0.01,
      cancellationRate90d: 0.005,
      onTimeDeliveryTrend90d: 0.08,
      leadTimeVarianceDays: 1.2,
      openDisputes: 0,
      financialStabilityIndex: 0.88,
      recentIncidents: 0,
    },
  },
];

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
    scenarioId: {
      type: "string",
      enum: scenarios.map((scenario) => scenario.id),
    },
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
    "requestId",
    "correlationId",
    "createdAt",
    "status",
    "risk",
    "quantitative",
    "document",
    "insight",
    "evidence",
    "telemetry",
    "disclaimer",
  ],
  properties: {
    evaluationId: { type: "string" },
    requestId: { type: "string" },
    correlationId: { type: "string" },
    createdAt: { type: "string" },
    status: { type: "string", enum: ["COMPLETE", "MODEL_ONLY"] },
    risk: {
      type: "object",
      additionalProperties: false,
      required: [
        "status",
        "combinedScore",
        "riskBand",
        "confidence",
        "policyVersion",
        "configuredWeights",
        "effectiveWeights",
        "thresholds",
      ],
      properties: {
        status: { const: "READY" },
        combinedScore: { type: "number", minimum: 0, maximum: 1 },
        riskBand: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
        confidence: { type: "string", enum: ["SUPPORTED", "MODEL_ONLY"] },
        policyVersion: { type: "string" },
        configuredWeights: {
          type: "object",
          additionalProperties: false,
          required: ["quantitative", "document"],
          properties: {
            quantitative: { const: 0.7 },
            document: { const: 0.3 },
          },
        },
        effectiveWeights: {
          type: "object",
          additionalProperties: false,
          required: ["quantitative", "document"],
          properties: {
            quantitative: { type: "number", minimum: 0, maximum: 1 },
            document: { type: "number", minimum: 0, maximum: 1 },
          },
        },
        thresholds: {
          type: "object",
          additionalProperties: false,
          required: ["medium", "high"],
          properties: { medium: { const: 0.2 }, high: { const: 0.65 } },
        },
      },
    },
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
      required: [
        "status",
        "indexVersion",
        "riskScore",
        "riskBand",
        "evidenceCount",
        "retrievalMs",
      ],
      properties: {
        status: {
          type: "string",
          enum: ["READY", "INSUFFICIENT_EVIDENCE"],
        },
        indexVersion: { type: "string" },
        riskScore: { type: "number", minimum: 0, maximum: 1 },
        riskBand: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
        evidenceCount: { type: "integer", minimum: 0, maximum: 5 },
        retrievalMs: { type: "number", minimum: 0 },
      },
    },
    insight: {
      type: "object",
      additionalProperties: false,
      required: [
        "conclusion",
        "riskCategories",
        "summary",
        "citationIds",
        "attentionItems",
      ],
      properties: {
        conclusion: {
          type: "string",
          enum: ["LOW_RISK", "MEDIUM_RISK", "HIGH_RISK"],
        },
        riskCategories: {
          type: "array",
          maxItems: 3,
          items: { type: "string" },
        },
        summary: { type: "string" },
        citationIds: {
          type: "array",
          maxItems: 5,
          items: { type: "string", pattern: "^E[1-5]$" },
        },
        attentionItems: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          items: { type: "string" },
        },
      },
    },
    evidence: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "citationId",
          "documentId",
          "title",
          "supplierName",
          "sourceType",
          "publishedAt",
          "section",
          "excerpt",
          "score",
          "riskCategory",
          "severity",
        ],
        properties: {
          citationId: { type: "string", pattern: "^E[1-5]$" },
          documentId: { type: "string" },
          title: { type: "string" },
          supplierName: { type: "string" },
          sourceType: { type: "string" },
          publishedAt: { type: "string", format: "date" },
          section: { type: "string" },
          excerpt: { type: "string", maxLength: 1000 },
          score: { type: "number", minimum: 0, maximum: 1 },
          riskCategory: { type: "string" },
          severity: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    telemetry: {
      type: "object",
      additionalProperties: false,
      required: [
        "apiMs",
        "modelInferenceMs",
        "retrievalMs",
        "fusionMs",
        "riskEngineMs",
        "totalMs",
      ],
      properties: {
        apiMs: { type: "number", minimum: 0 },
        modelInferenceMs: { type: "number", minimum: 0 },
        retrievalMs: { type: "number", minimum: 0 },
        fusionMs: { type: "number", minimum: 0 },
        riskEngineMs: { type: "number", minimum: 0 },
        totalMs: { type: "number", minimum: 0 },
      },
    },
    disclaimer: { type: "string" },
  },
};

export const errorResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: {
    error: {
      type: "object",
      additionalProperties: false,
      required: ["code", "message", "details", "requestId", "correlationId"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["field", "message"],
            properties: {
              field: { type: "string" },
              message: { type: "string" },
            },
          },
        },
        requestId: { type: "string" },
        correlationId: { type: "string" },
      },
    },
  },
};
