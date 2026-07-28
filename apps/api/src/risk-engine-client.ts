import type {
  EvaluationRequest,
  SkeletonEvaluationResponse,
} from "@srm/api-schema";

export interface RiskEnginePreview {
  status: "SKELETON";
  quantitative: SkeletonEvaluationResponse["quantitative"];
  document: SkeletonEvaluationResponse["document"];
  insight: SkeletonEvaluationResponse["insight"];
  evidence: SkeletonEvaluationResponse["evidence"];
  telemetry: { riskEngineMs: number };
}

export interface RiskEngineClient {
  health(): Promise<{ status: string; service: string }>;
  preview(
    input: EvaluationRequest,
    correlationId: string,
  ): Promise<RiskEnginePreview>;
}

export function createRiskEngineClient(baseUrl: string): RiskEngineClient {
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_000);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { "content-type": "application/json", ...init?.headers },
      });

      if (!response.ok) {
        throw new Error(`Risk engine returned ${response.status}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    health: () => request("/health"),
    preview: (input, correlationId) =>
      request("/v1/evaluations/preview", {
        method: "POST",
        headers: { "x-correlation-id": correlationId },
        body: JSON.stringify(input),
      }),
  };
}
