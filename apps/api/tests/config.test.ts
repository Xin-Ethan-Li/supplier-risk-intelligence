import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("API configuration", () => {
  it("parses bounded reliability settings and a CORS allowlist", () => {
    const config = loadConfig({
      WEB_ORIGINS: "https://demo.example, https://portfolio.example",
      RISK_ENGINE_TIMEOUT_MS: "1500",
      API_REQUEST_TIMEOUT_MS: "2500",
      API_BODY_LIMIT_BYTES: "32768",
      API_RATE_LIMIT_MAX: "20",
      API_RATE_LIMIT_WINDOW_MS: "30000",
    });

    expect(config).toMatchObject({
      webOrigins: ["https://demo.example", "https://portfolio.example"],
      riskEngineTimeoutMs: 1_500,
      requestTimeoutMs: 2_500,
      bodyLimitBytes: 32_768,
      rateLimitMax: 20,
      rateLimitWindowMs: 30_000,
    });
  });

  it("fails fast for an invalid origin or unsafe numeric setting", () => {
    expect(() =>
      loadConfig({ WEB_ORIGINS: "https://demo.example/path" }),
    ).toThrow("WEB_ORIGINS");
    expect(() => loadConfig({ API_BODY_LIMIT_BYTES: "99999999" })).toThrow(
      "API_BODY_LIMIT_BYTES",
    );
  });

  it("uses the hosting platform PORT when API_PORT is not set", () => {
    expect(loadConfig({ PORT: "10000" }).port).toBe(10_000);
    expect(loadConfig({ PORT: "10000", API_PORT: "3000" }).port).toBe(3_000);
  });
});
