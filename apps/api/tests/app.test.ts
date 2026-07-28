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
    status: "PARTIAL",
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
      summary: "The model classified disruption risk as high [E1].",
      citationIds: ["E1"],
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
    telemetry: { modelInferenceMs: 0.8, retrievalMs: 0.6, riskEngineMs: 1 },
  }),
};

const apps: Array<Awaited<ReturnType<typeof buildApp>>> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("M2 evaluation API", () => {
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
      payload: body,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-correlation-id"]).toBeTruthy();
    expect(response.json()).toMatchObject({
      status: "PARTIAL",
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
      error: { code: "VALIDATION_ERROR" },
    });
  });
});
