import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  evaluationRequestSchema,
  evaluationResponseSchema,
  errorResponseSchema,
  scenarios,
  supplierMetricsSchema,
  type EvaluationRequest,
  type EvaluationResponse,
} from "@srm/api-schema";
import Fastify, { type FastifyInstance } from "fastify";
import type { ApiConfig } from "./config.js";
import {
  createRiskEngineClient,
  RiskEngineClientError,
  type RiskEngineClient,
} from "./risk-engine-client.js";

interface BuildOptions {
  config: ApiConfig;
  riskEngineClient?: RiskEngineClient;
}

const TRACE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;

function trustedTraceId(value: string | string[] | undefined): string {
  return typeof value === "string" && TRACE_ID_PATTERN.test(value)
    ? value
    : randomUUID();
}

export async function buildApp(
  options: BuildOptions,
): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      process.env.NODE_ENV === "test"
        ? false
        : {
            redact: {
              paths: [
                "req.headers.authorization",
                "req.headers.cookie",
                'req.headers["x-api-key"]',
                'res.headers["set-cookie"]',
              ],
              censor: "[REDACTED]",
            },
          },
    bodyLimit: options.config.bodyLimitBytes,
    requestTimeout: options.config.requestTimeoutMs,
  });
  const riskEngine =
    options.riskEngineClient ??
    createRiskEngineClient(
      options.config.riskEngineUrl,
      options.config.riskEngineTimeoutMs,
    );

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Supplier Risk Intelligence API",
        description:
          "Portfolio demo API using synthetic metrics and fictional supplier documents.",
        version: "0.7.0",
      },
      tags: [
        {
          name: "system",
          description: "Health, readiness and version metadata.",
        },
        {
          name: "evaluation",
          description: "Supplier risk evaluation workflow.",
        },
      ],
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: options.config.webOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["content-type", "x-request-id", "x-correlation-id"],
  });
  await app.register(rateLimit, {
    max: options.config.rateLimitMax,
    timeWindow: options.config.rateLimitWindowMs,
  });

  app.addHook("onRequest", async (request, reply) => {
    const correlationId = trustedTraceId(request.headers["x-correlation-id"]);
    request.headers["x-correlation-id"] = correlationId;
    reply.header("x-correlation-id", correlationId);
    const requestId = trustedTraceId(request.headers["x-request-id"]);
    request.headers["x-request-id"] = requestId;
    reply.header("x-request-id", requestId);
  });

  app.get(
    "/health",
    { schema: { tags: ["system"], summary: "API liveness" } },
    async () => ({ status: "ok", service: "srm-api" }),
  );

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

  app.get("/version", { schema: { tags: ["system"] } }, async () => ({
    service: "srm-api",
    version: "0.7.0",
    milestone: "M7",
  }));

  app.get(
    "/v1/scenarios",
    {
      schema: {
        tags: ["evaluation"],
        summary: "List the three fictional demo scenarios",
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "id",
                "name",
                "supplierName",
                "description",
                "defaultQuestion",
                "supplierMetrics",
              ],
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                supplierName: { type: "string" },
                description: { type: "string" },
                defaultQuestion: { type: "string" },
                supplierMetrics: supplierMetricsSchema,
              },
            },
          },
        },
      },
    },
    async () => scenarios,
  );

  app.get("/openapi.json", { schema: { hide: true } }, async () =>
    app.swagger(),
  );

  app.post<{ Body: EvaluationRequest; Reply: EvaluationResponse }>(
    "/v1/evaluations",
    {
      schema: {
        tags: ["evaluation"],
        summary: "Evaluate quantitative and fictional document supplier risk",
        body: evaluationRequestSchema,
        response: {
          200: evaluationResponseSchema,
          400: errorResponseSchema,
          413: errorResponseSchema,
          429: errorResponseSchema,
          500: errorResponseSchema,
          502: errorResponseSchema,
          503: errorResponseSchema,
          504: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const startedAt = performance.now();
      const correlationId = request.headers["x-correlation-id"] as string;
      const requestId = request.headers["x-request-id"] as string;
      const evaluation = await riskEngine.evaluate(request.body, correlationId);
      const totalMs = performance.now() - startedAt;

      return {
        evaluationId: randomUUID(),
        requestId,
        correlationId,
        createdAt: new Date().toISOString(),
        status: evaluation.status,
        risk: evaluation.risk,
        quantitative: evaluation.quantitative,
        document: evaluation.document,
        insight: evaluation.insight,
        evidence: evaluation.evidence,
        telemetry: {
          apiMs: Math.max(0, totalMs - evaluation.telemetry.riskEngineMs),
          modelInferenceMs: evaluation.telemetry.modelInferenceMs,
          retrievalMs: evaluation.telemetry.retrievalMs,
          fusionMs: evaluation.telemetry.fusionMs,
          riskEngineMs: evaluation.telemetry.riskEngineMs,
          totalMs,
        },
        disclaimer:
          "Synthetic model data and fictional documents only. Demo metrics are not production claims.",
      };
    },
  );

  app.setErrorHandler((error, request, reply) => {
    const correlationId = request.headers["x-correlation-id"] as
      string | undefined;
    const requestId = request.headers["x-request-id"] as string | undefined;
    const fastifyError = error as {
      code?: string;
      validation?: Array<{ instancePath?: string; message?: string }>;
      statusCode?: number;
    };
    const validation = fastifyError.validation;
    const malformedJson = fastifyError.code === "FST_ERR_CTP_INVALID_JSON_BODY";
    const payloadTooLarge = fastifyError.code === "FST_ERR_CTP_BODY_TOO_LARGE";
    const dependencyError =
      error instanceof RiskEngineClientError ? error : undefined;
    const statusCode = dependencyError
      ? dependencyError.statusCode
      : validation
        ? 400
        : fastifyError.statusCode && fastifyError.statusCode < 500
          ? fastifyError.statusCode
          : 500;

    reply.code(statusCode).send({
      error: {
        code: dependencyError
          ? dependencyError.code
          : validation
            ? "VALIDATION_ERROR"
            : malformedJson
              ? "INVALID_JSON"
              : payloadTooLarge
                ? "PAYLOAD_TOO_LARGE"
                : statusCode === 429
                  ? "RATE_LIMITED"
                  : "INTERNAL_ERROR",
        message: dependencyError
          ? dependencyError.message
          : validation
            ? "One or more fields are invalid."
            : malformedJson
              ? "The request body must contain valid JSON."
              : payloadTooLarge
                ? "The request body exceeds the configured size limit."
                : "The request could not be completed.",
        details: validation
          ? validation.map((item) => ({
              field: item.instancePath || "request",
              message: item.message || "is invalid",
            }))
          : [],
        requestId: requestId ?? "unavailable",
        correlationId,
      },
    });
  });

  return app;
}
