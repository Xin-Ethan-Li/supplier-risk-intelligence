import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRiskEngineClient,
  RiskEngineClientError,
} from "../src/risk-engine-client.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("risk engine client reliability", () => {
  it("aborts a dependency request at its configured deadline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      ),
    );

    const client = createRiskEngineClient("http://risk-engine.invalid", 5);

    await expect(client.health()).rejects.toMatchObject({
      name: "RiskEngineClientError",
      code: "DEPENDENCY_TIMEOUT",
      statusCode: 504,
    });
  });

  it("classifies a non-success dependency response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", { status: 500 })),
    );

    const client = createRiskEngineClient("http://risk-engine.invalid", 100);

    await expect(client.health()).rejects.toEqual(
      new RiskEngineClientError(
        "DEPENDENCY_RESPONSE_ERROR",
        502,
        "Risk engine returned HTTP 500.",
      ),
    );
  });

  it("classifies a network failure without exposing its raw message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("getaddrinfo ENOTFOUND internal-hostname");
      }),
    );

    const client = createRiskEngineClient("http://risk-engine.invalid", 100);

    await expect(client.health()).rejects.toMatchObject({
      code: "DEPENDENCY_UNAVAILABLE",
      statusCode: 503,
      message: "Risk engine could not be reached.",
    });
  });
});
