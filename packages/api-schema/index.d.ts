export interface SupplierMetrics {
  deliveryDelayRate30d: number;
  defectRate90d: number;
  cancellationRate90d: number;
  leadTimeVarianceDays: number;
  openDisputes: number;
  recentIncidents: number;
}

export interface EvaluationRequest {
  scenarioId: string;
  supplierMetrics: SupplierMetrics;
  question: string;
}

export interface SkeletonEvaluationResponse {
  evaluationId: string;
  correlationId: string;
  createdAt: string;
  status: "SKELETON";
  quantitative: { status: "NOT_IMPLEMENTED"; modelVersion: string };
  document: { status: "NOT_IMPLEMENTED"; indexVersion: string };
  insight: { summary: string };
  evidence: Array<Record<string, unknown>>;
  telemetry: { apiMs: number; riskEngineMs: number; totalMs: number };
  disclaimer: string;
}

export const supplierMetricsSchema: Record<string, unknown>;
export const evaluationRequestSchema: Record<string, unknown>;
export const evaluationResponseSchema: Record<string, unknown>;
