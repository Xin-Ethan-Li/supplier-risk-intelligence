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
  correlationId: string;
  createdAt: string;
  status: "PARTIAL";
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
  insight: { summary: string; citationIds: string[] };
  evidence: Evidence[];
  telemetry: {
    apiMs: number;
    modelInferenceMs: number;
    retrievalMs: number;
    riskEngineMs: number;
    totalMs: number;
  };
  disclaimer: string;
}

export const supplierMetricsSchema: Record<string, unknown>;
export const evaluationRequestSchema: Record<string, unknown>;
export const evaluationResponseSchema: Record<string, unknown>;
