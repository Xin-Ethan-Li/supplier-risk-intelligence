import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(appRoot, "..", "..");
const output = path.join(appRoot, "dist", "case-assets");
const assets = ["architecture.svg", "demo-desktop.png"];

fs.mkdirSync(output, { recursive: true });
for (const asset of assets) {
  fs.copyFileSync(
    path.join(repositoryRoot, "docs", "assets", asset),
    path.join(output, asset),
  );
}
