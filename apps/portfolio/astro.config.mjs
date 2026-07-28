import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: process.env.PORTFOLIO_SITE ?? "http://localhost:4322",
  base: process.env.PORTFOLIO_BASE ?? "/",
  server: { host: true, port: 4322 },
  build: { format: "directory" },
});
