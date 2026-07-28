import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import axe from "axe-core";
import { chromium } from "playwright-core";

const baseUrl = process.env.SRM_WEB_URL ?? "http://localhost:8080";
const screenshotDir = path.resolve("tmp", "m5-browser-qa");
const candidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const executablePath = candidates.find((candidate) => fs.existsSync(candidate));

if (!executablePath) {
  throw new Error(
    "Chrome or Chromium was not found. Set CHROME_PATH to run browser QA.",
  );
}

fs.mkdirSync(screenshotDir, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function audit(page, label) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () =>
    globalThis.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    }),
  );
  const blocking = result.violations.filter((item) =>
    ["serious", "critical"].includes(item.impact),
  );
  assert(
    blocking.length === 0,
    `${label} has blocking accessibility violations: ${blocking.map((item) => item.id).join(", ")}`,
  );
  return result.violations.length;
}

async function hasNoHorizontalOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
}

const desktop = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
});
desktop.on("pageerror", (error) =>
  console.error("Desktop page error:", error.message),
);
desktop.on("requestfailed", (request) =>
  console.error(
    "Desktop request failed:",
    request.url(),
    request.failure()?.errorText,
  ),
);
await desktop.goto(`${baseUrl}/demo/`, { waitUntil: "networkidle" });
assert(
  await hasNoHorizontalOverflow(desktop),
  "Desktop demo has horizontal overflow.",
);
const desktopAxe = await audit(desktop, "Desktop demo idle state");

await desktop.locator('.scenario-card[data-level="MEDIUM"]').click();
assert(
  (await desktop.locator('[name="defectRate90d"]').inputValue()) === "0.181",
  "Scenario selection did not populate metrics.",
);
const invalidFields = await desktop
  .locator("[data-evaluation-form] :invalid")
  .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("name")));
assert(
  invalidFields.length === 0,
  `Preset contains invalid form fields: ${invalidFields.join(", ")}`,
);
await desktop.getByRole("button", { name: "Evaluate supplier" }).click();
await desktop.waitForFunction(() =>
  ["success", "error"].includes(
    document.querySelector("[data-demo-root]")?.dataset.state ?? "",
  ),
);
assert(
  (await desktop.locator("[data-demo-root]").getAttribute("data-state")) ===
    "success",
  `Desktop evaluation failed: ${await desktop.locator("[data-error-message]").innerText()}`,
);
assert(
  (await desktop.locator("[data-risk-band]").innerText()).includes("MEDIUM"),
  "Medium scenario did not render a MEDIUM combined risk.",
);
assert(
  Number(
    await desktop
      .locator("[data-evidence-count]")
      .innerText()
      .then((text) => text.split(" ")[0]),
  ) >= 1,
  "Medium scenario did not render evidence.",
);
await desktop.locator(".evidence-card").first().click();
assert(
  await desktop.locator("[data-citation-dialog]").evaluate((node) => node.open),
  "Citation dialog did not open.",
);
await desktop.getByRole("button", { name: "Close citation detail" }).click();
await desktop.screenshot({
  path: path.join(screenshotDir, "desktop-result.png"),
  fullPage: true,
});
const resultAxe = await audit(desktop, "Desktop result state");
await desktop.locator('.scenario-card[data-level="HIGH"]').click();
await desktop.getByRole("button", { name: "Evaluate supplier" }).click();
await desktop.waitForFunction(() =>
  document.querySelector("[data-risk-band]")?.textContent?.includes("HIGH"),
);

const validation = await browser.newPage({
  viewport: { width: 1024, height: 800 },
});
await validation.goto(`${baseUrl}/demo/`, { waitUntil: "networkidle" });
await validation.locator('[name="question"]').fill("short");
await validation.getByRole("button", { name: "Evaluate supplier" }).click();
assert(
  await validation.locator("[data-validation-summary]").isVisible(),
  "Validation summary was not displayed.",
);

await validation.route("**/v1/evaluations", async (route) => {
  await route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({
      error: { message: "Risk service unavailable for QA." },
    }),
  });
});
await validation
  .locator('[name="question"]')
  .fill("Is the supplier currently stable enough for delivery?");
await validation.getByRole("button", { name: "Evaluate supplier" }).click();
await validation.locator("[data-error-state]").waitFor({ state: "visible" });
assert(
  await validation.getByRole("button", { name: "Try again" }).isVisible(),
  "Retry action is missing from error state.",
);

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
});
await mobile.goto(`${baseUrl}/demo/`, { waitUntil: "networkidle" });
assert(
  await hasNoHorizontalOverflow(mobile),
  "Mobile idle state has horizontal overflow.",
);
await mobile.locator('.scenario-card[data-level="LOW"]').click();
await mobile.getByRole("button", { name: "Evaluate supplier" }).click();
await mobile.waitForFunction(() =>
  ["success", "error"].includes(
    document.querySelector("[data-demo-root]")?.dataset.state ?? "",
  ),
);
assert(
  (await mobile.locator("[data-demo-root]").getAttribute("data-state")) ===
    "success",
  `Mobile evaluation failed: ${await mobile.locator("[data-error-message]").innerText()}`,
);
assert(
  await hasNoHorizontalOverflow(mobile),
  "Mobile result state has horizontal overflow.",
);
assert(
  (await mobile.locator("[data-risk-band]").innerText()).includes("LOW"),
  "Low scenario did not render LOW risk.",
);
await mobile.screenshot({
  path: path.join(screenshotDir, "mobile-result.png"),
  fullPage: true,
});
const mobileAxe = await audit(mobile, "Mobile result state");
await mobile
  .locator('[name="question"]')
  .fill("What is the atmosphere of a distant exoplanet?");
await mobile.getByRole("button", { name: "Evaluate supplier" }).click();
await mobile.waitForFunction(() =>
  document
    .querySelector("[data-confidence]")
    ?.textContent?.includes("MODEL ONLY"),
);
assert(
  (await mobile.locator("[data-evidence-count]").innerText()).startsWith("0"),
  "Model-only result rendered citations.",
);

for (const route of ["/", "/architecture/", "/evaluation/"]) {
  await mobile.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  assert(
    await hasNoHorizontalOverflow(mobile),
    `${route} has horizontal overflow on mobile.`,
  );
}

await browser.close();
console.log(
  JSON.stringify(
    {
      status: "passed",
      axeViolations: {
        desktopIdle: desktopAxe,
        desktopResult: resultAxe,
        mobileResult: mobileAxe,
      },
      screenshots: screenshotDir,
    },
    null,
    2,
  ),
);
