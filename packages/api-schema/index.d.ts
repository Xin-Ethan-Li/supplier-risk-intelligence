export interface SupplierMetrics {
  deliveryDelayRate30d: number;
  defectRate90d: number;
  cancellationRate90d: number;
  onTimeDeliveryTrend90d: number;
  leadTimeVarianceDays: number;
  openDisputes: number;
  financialStabilityIndex: number;
  recentIncidents: number;
}

export interface EvaluationRequest {
  scenarioId: string;
  supplierMetrics: SupplierMetrics;
  question: string;
}

export interface Scenario {
  id: string;
  name: string;
  supplierName: string;
  description: string;
  defaultQuestion: string;
  supplierMetrics: SupplierMetrics;
}

export interface RiskDriver {
  feature: string;
  displayName: string;
  value: number;
  contribution: number;
  direction: "INCREASES_RISK" | "REDUCES_RISK";
}

export interface Evidence {
  citationId: string;
  documentId: string;
  title: string;
  supplierName: string;
  sourceType: string;
  publishedAt: string;
  section: string;
  excerpt: string;
  score: number;
  riskCategory: string;
  severity: number;
}

export interface EvaluationResponse {
  evaluationId: string;
  requestId: string;
  correlationId: string;
  createdAt: string;
  status: "COMPLETE" | "MODEL_ONLY";
  risk: {
    status: "READY";
    combinedScore: number;
    riskBand: "LOW" | "MEDIUM" | "HIGH";
    confidence: "SUPPORTED" | "MODEL_ONLY";
    policyVersion: string;
    configuredWeights: { quantitative: 0.7; document: 0.3 };
    effectiveWeights: { quantitative: number; document: number };
    thresholds: { medium: 0.2; high: 0.65 };
  };
  quantitative: {
    status: "READY";
    modelVersion: string;
    riskProbability: number;
    riskBand: "LOW" | "MEDIUM" | "HIGH";
    outlookDays: 14;
    thresholds: { medium: number; high: number };
    drivers: RiskDriver[];
    inferenceMs: number;
  };
  document: {
    status: "READY" | "INSUFFICIENT_EVIDENCE";
    indexVersion: string;
    riskScore: number;
    riskBand: "LOW" | "MEDIUM" | "HIGH";
    evidenceCount: number;
    retrievalMs: number;
  };
  insight: {
    conclusion: "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK";
    riskCategories: string[];
    summary: string;
    citationIds: string[];
    attentionItems: string[];
  };
  evidence: Evidence[];
  telemetry: {
    apiMs: number;
    modelInferenceMs: number;
    retrievalMs: number;
    fusionMs: number;
    riskEngineMs: number;
    totalMs: number;
  };
  disclaimer: string;
}

export const supplierMetricsSchema: Record<string, unknown>;
export const evaluationRequestSchema: Record<string, unknown>;
export const evaluationResponseSchema: Record<string, unknown>;
export const errorResponseSchema: Record<string, unknown>;
export const scenarios: Scenario[];
