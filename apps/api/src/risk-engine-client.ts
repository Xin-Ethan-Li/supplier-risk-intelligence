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

export type DependencyErrorCode =
  "DEPENDENCY_TIMEOUT" | "DEPENDENCY_UNAVAILABLE" | "DEPENDENCY_RESPONSE_ERROR";

export class RiskEngineClientError extends Error {
  constructor(
    public readonly code: DependencyErrorCode,
    public readonly statusCode: 502 | 503 | 504,
    message: string,
  ) {
    super(message);
    this.name = "RiskEngineClientError";
  }
}

export function createRiskEngineClient(
  baseUrl: string,
  timeoutMs = 2_000,
): RiskEngineClient {
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { "content-type": "application/json", ...init?.headers },
      });

      if (!response.ok) {
        throw new RiskEngineClientError(
          "DEPENDENCY_RESPONSE_ERROR",
          502,
          `Risk engine returned HTTP ${response.status}.`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof RiskEngineClientError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new RiskEngineClientError(
          "DEPENDENCY_TIMEOUT",
          504,
          `Risk engine exceeded the ${timeoutMs} ms deadline.`,
        );
      }
      throw new RiskEngineClientError(
        "DEPENDENCY_UNAVAILABLE",
        503,
        "Risk engine could not be reached.",
      );
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
