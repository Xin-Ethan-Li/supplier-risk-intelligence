export interface ApiConfig {
  host: string;
  port: number;
  riskEngineUrl: string;
  webOrigin: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    host: env.API_HOST ?? "0.0.0.0",
    port: Number(env.API_PORT ?? 3000),
    riskEngineUrl: env.RISK_ENGINE_URL ?? "http://localhost:8000",
    webOrigin: env.WEB_ORIGIN ?? "http://localhost:4321",
  };
}
