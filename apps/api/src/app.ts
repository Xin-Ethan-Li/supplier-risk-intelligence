import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import {
  evaluationRequestSchema,
  evaluationResponseSchema,
  type EvaluationRequest,
  type SkeletonEvaluationResponse,
} from "@srm/api-schema";
import Fastify, { type FastifyInstance } from "fastify";
import type { ApiConfig } from "./config.js";
import {
  createRiskEngineClient,
  type RiskEngineClient,
} from "./risk-engine-client.js";

interface BuildOptions {
  config: ApiConfig;
  riskEngineClient?: RiskEngineClient;
}

export async function buildApp(
  options: BuildOptions,
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
    bodyLimit: 64 * 1024,
  });
  const riskEngine =
    options.riskEngineClient ??
    createRiskEngineClient(options.config.riskEngineUrl);

  await app.register(cors, { origin: options.config.webOrigin });
  await app.register(rateLimit, { max: 30, timeWindow: "1 minute" });

  app.addHook("onRequest", async (request, reply) => {
    const incoming = request.headers["x-correlation-id"];
    const correlationId =
      typeof incoming === "string" && incoming.length <= 100
        ? incoming
        : randomUUID();
    request.headers["x-correlation-id"] = correlationId;
    reply.header("x-correlation-id", correlationId);
  });

  app.get("/health", async () => ({ status: "ok", service: "srm-api" }));

  app.get("/ready", async (_request, reply) => {
    try {
      const dependency = await riskEngine.health();
      return {
        status: "ready",
        service: "srm-api",
        dependencies: { riskEngine: dependency.status },
      };
    } catch {
      return reply.code(503).send({
        error: {
          code: "DEPENDENCY_UNAVAILABLE",
          message: "Risk engine is not ready.",
        },
      });
    }
  });

  app.get("/version", async () => ({
    service: "srm-api",
    version: "0.1.0",
    milestone: "M1",
  }));

  app.post<{ Body: EvaluationRequest; Reply: SkeletonEvaluationResponse }>(
    "/v1/evaluations",
    {
      schema: {
        body: evaluationRequestSchema,
        response: { 200: evaluationResponseSchema },
      },
    },
    async (request) => {
      const startedAt = performance.now();
      const correlationId = request.headers["x-correlation-id"] as string;
      const preview = await riskEngine.preview(request.body, correlationId);
      const totalMs = performance.now() - startedAt;

      return {
        evaluationId: randomUUID(),
        correlationId,
        createdAt: new Date().toISOString(),
        status: preview.status,
        quantitative: preview.quantitative,
        document: preview.document,
        insight: preview.insight,
        evidence: preview.evidence,
        telemetry: {
          apiMs: Math.max(0, totalMs - preview.telemetry.riskEngineMs),
          riskEngineMs: preview.telemetry.riskEngineMs,
          totalMs,
        },
        disclaimer:
          "Synthetic-data technical demonstration only. M1 returns an explicit skeleton response.",
      };
    },
  );

  app.setErrorHandler((error, request, reply) => {
    const correlationId = request.headers["x-correlation-id"] as
      string | undefined;
    const fastifyError = error as { validation?: unknown; statusCode?: number };
    const validation = fastifyError.validation;
    const statusCode = validation
      ? 400
      : fastifyError.statusCode && fastifyError.statusCode < 500
        ? fastifyError.statusCode
        : 500;

    reply.code(statusCode).send({
      error: {
        code: validation
          ? "VALIDATION_ERROR"
          : statusCode === 429
            ? "RATE_LIMITED"
            : "INTERNAL_ERROR",
        message: validation
          ? "One or more fields are invalid."
          : "The request could not be completed.",
        correlationId,
      },
    });
  });

  return app;
}
