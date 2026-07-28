import type { EvaluationRequest } from "@srm/api-schema";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { RiskEngineClient } from "../src/risk-engine-client.js";

const config = {
  host: "127.0.0.1",
  port: 3000,
  riskEngineUrl: "http://risk-engine.invalid",
  webOrigin: "http://localhost:4321",
};

const client: RiskEngineClient = {
  health: async () => ({ status: "ok", service: "risk-engine" }),
  evaluate: async () => ({
    status: "COMPLETE",
    risk: {
      status: "READY",
      combinedScore: 0.832,
      riskBand: "HIGH",
      confidence: "SUPPORTED",
      policyVersion: "demo-fusion-1.0.0",
      configuredWeights: { quantitative: 0.7, document: 0.3 },
      effectiveWeights: { quantitative: 0.7, document: 0.3 },
      thresholds: { medium: 0.2, high: 0.65 },
    },
    quantitative: {
      status: "READY",
      modelVersion: "srm-xgb-demo-1.0.0",
      riskProbability: 0.82,
      riskBand: "HIGH",
      outlookDays: 14,
      thresholds: { medium: 0.1, high: 0.22 },
      drivers: [],
      inferenceMs: 0.8,
    },
    document: {
      status: "READY",
      indexVersion: "srm-retrieval-demo-1.0.0",
      riskScore: 0.86,
      riskBand: "HIGH",
      evidenceCount: 1,
      retrievalMs: 0.6,
    },
    insight: {
      conclusion: "HIGH_RISK",
      riskCategories: ["LOGISTICS"],
      summary: "The model classified disruption risk as high [E1].",
      citationIds: ["E1"],
      attentionItems: ["Confirm recovery dates."],
    },
    evidence: [
      {
        citationId: "E1",
        documentId: "NSC-LOG-2026-06",
        title: "June Logistics Exception Bulletin",
        supplierName: "Northstar Components",
        sourceType: "LOGISTICS_BULLETIN",
        publishedAt: "2026-06-18",
        section: "Ocean freight",
        excerpt: "Three shipments missed their booked sailings.",
        score: 0.91,
        riskCategory: "LOGISTICS",
        severity: 0.91,
      },
    ],
    telemetry: {
      modelInferenceMs: 0.8,
      retrievalMs: 0.6,
      fusionMs: 0.1,
      riskEngineMs: 1,
    },
  }),
};

const apps: Array<Awaited<ReturnType<typeof buildApp>>> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("M4 evaluation API", () => {
  it("reports health and readiness", async () => {
    const app = await buildApp({ config, riskEngineClient: client });
    apps.push(app);

    const health = await app.inject({ method: "GET", url: "/health" });
    const ready = await app.inject({ method: "GET", url: "/ready" });

    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: "ok", service: "srm-api" });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toMatchObject({ status: "ready" });
  });

  it("publishes scenarios and OpenAPI documentation", async () => {
    const app = await buildApp({ config, riskEngineClient: client });
    apps.push(app);

    const scenarios = await app.inject({ method: "GET", url: "/v1/scenarios" });
    const openapi = await app.inject({ method: "GET", url: "/openapi.json" });
    const docs = await app.inject({ method: "GET", url: "/docs/" });

    expect(scenarios.statusCode).toBe(200);
    expect(scenarios.json()).toHaveLength(3);
    expect(openapi.statusCode).toBe(200);
    expect(openapi.json()).toMatchObject({
      info: { title: "Supplier Risk Intelligence API", version: "0.5.0" },
    });
    expect(openapi.json().paths).toHaveProperty("/v1/evaluations");
    expect(docs.statusCode).toBe(200);
  });

  it("passes a validated model result through the vertical slice", async () => {
    const app = await buildApp({ config, riskEngineClient: client });
    apps.push(app);
    const body: EvaluationRequest = {
      scenarioId: "high-risk-logistics",
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
      question: "Is this supplier likely to disrupt delivery?",
    };

    const response = await app.inject({
      method: "POST",
      url: "/v1/evaluations",
      headers: {
        "x-request-id": "test-request-id",
        "x-correlation-id": "test-correlation-id",
      },
      payload: body,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBe("test-request-id");
    expect(response.headers["x-correlation-id"]).toBe("test-correlation-id");
    expect(response.json()).toMatchObject({
      requestId: "test-request-id",
      correlationId: "test-correlation-id",
      status: "COMPLETE",
      risk: {
        status: "READY",
        policyVersion: "demo-fusion-1.0.0",
        riskBand: "HIGH",
      },
      quantitative: {
        status: "READY",
        modelVersion: "srm-xgb-demo-1.0.0",
        riskBand: "HIGH",
      },
      document: {
        status: "READY",
        indexVersion: "srm-retrieval-demo-1.0.0",
      },
    });
  });

  it("rejects invalid supplier metrics", async () => {
    const app = await buildApp({ config, riskEngineClient: client });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/evaluations",
      payload: { scenarioId: "bad", supplierMetrics: {}, question: "short" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        details: expect.any(Array),
        requestId: expect.any(String),
        correlationId: expect.any(String),
      },
    });
  });

  it("rejects malformed JSON without exposing internal details", async () => {
    const app = await buildApp({ config, riskEngineClient: client });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/evaluations",
      headers: {
        "content-type": "application/json",
        "x-request-id": "malformed-request",
        "x-correlation-id": "malformed-correlation",
      },
      payload: '{"scenarioId":',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "INVALID_JSON",
        message: "The request body must contain valid JSON.",
        details: [],
        requestId: "malformed-request",
        correlationId: "malformed-correlation",
      },
    });
    expect(response.body).not.toContain("stack");
  });
});
