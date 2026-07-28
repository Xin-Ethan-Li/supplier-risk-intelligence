export interface ApiConfig {
  host: string;
  port: number;
  riskEngineUrl: string;
  webOrigins: string[];
  riskEngineTimeoutMs: number;
  requestTimeoutMs: number;
  bodyLimitBytes: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
}

function integerSetting(
  value: string | undefined,
  fallback: number,
  name: string,
  minimum: number,
  maximum: number,
): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `${name} must be an integer between ${minimum} and ${maximum}.`,
    );
  }
  return parsed;
}

function webOrigins(value: string | undefined): string[] {
  const origins = (value ?? "http://localhost:4321")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (
    !origins.length ||
    origins.some((origin) => !/^https?:\/\/[^/]+$/u.test(origin))
  ) {
    throw new Error(
      "WEB_ORIGINS must contain comma-separated HTTP(S) origins without paths.",
    );
  }
  return [...new Set(origins)];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    host: env.API_HOST ?? "0.0.0.0",
    port: integerSetting(env.API_PORT, 3000, "API_PORT", 1, 65_535),
    riskEngineUrl: env.RISK_ENGINE_URL ?? "http://localhost:8000",
    webOrigins: webOrigins(env.WEB_ORIGINS ?? env.WEB_ORIGIN),
    riskEngineTimeoutMs: integerSetting(
      env.RISK_ENGINE_TIMEOUT_MS,
      2_000,
      "RISK_ENGINE_TIMEOUT_MS",
      100,
      30_000,
    ),
    requestTimeoutMs: integerSetting(
      env.API_REQUEST_TIMEOUT_MS,
      3_000,
      "API_REQUEST_TIMEOUT_MS",
      500,
      60_000,
    ),
    bodyLimitBytes: integerSetting(
      env.API_BODY_LIMIT_BYTES,
      65_536,
      "API_BODY_LIMIT_BYTES",
      1_024,
      1_048_576,
    ),
    rateLimitMax: integerSetting(
      env.API_RATE_LIMIT_MAX,
      30,
      "API_RATE_LIMIT_MAX",
      1,
      10_000,
    ),
    rateLimitWindowMs: integerSetting(
      env.API_RATE_LIMIT_WINDOW_MS,
      60_000,
      "API_RATE_LIMIT_WINDOW_MS",
      1_000,
      3_600_000,
    ),
  };
}
