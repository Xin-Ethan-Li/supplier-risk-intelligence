import type { EvaluationRequest, EvaluationResponse } from "@srm/api-schema";

export interface RiskEngineEvaluation {
  status: EvaluationResponse["status"];
  risk: EvaluationResponse["risk"];
  quantitative: EvaluationResponse["quantitative"];
  document: EvaluationResponse["document"];
  insight: EvaluationResponse["insight"];
  evidence: EvaluationResponse["evidence"];
  telemetry: {
    modelInferenceMs: number;
    retrievalMs: number;
    fusionMs: number;
    riskEngineMs: number;
  };
}

export interface RiskEngineClient {
  health(): Promise<{ status: string; service: string }>;
  evaluate(
    input: EvaluationRequest,
    correlationId: string,
  ): Promise<RiskEngineEvaluation>;
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
    evaluate: (input, correlationId) =>
      request("/v1/evaluations/evaluate", {
        method: "POST",
        headers: { "x-correlation-id": correlationId },
        body: JSON.stringify(input),
      }),
  };
}
