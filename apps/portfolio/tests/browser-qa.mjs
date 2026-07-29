import fs from "node:fs";
import path from "node:path";
import axe from "axe-core";
import { chromium } from "playwright-core";

const baseUrl =
  process.env.PORTFOLIO_URL ??
  "http://127.0.0.1:4322/supplier-risk-intelligence";
const screenshotDir = path.resolve("tmp", "m8-portfolio-qa");
const candidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const executablePath = candidates.find((candidate) => fs.existsSync(candidate));

if (!executablePath)
  throw new Error(
    "Chrome or Chromium was not found. Set CHROME_PATH to run browser QA.",
  );

fs.mkdirSync(screenshotDir, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const routes = [
  "/",
  "/projects/",
  "/projects/supplier-risk-intelligence/",
  "/about/",
  "/resume/",
];

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
    `${label}: ${blocking.map((item) => `${item.id} (${item.nodes.map((node) => node.target.join(" ")).join(", ")})`).join("; ")}`,
  );
  return result.violations.length;
}

async function verifyViewport(viewport, label) {
  const page = await browser.newPage({
    viewport,
    isMobile: viewport.width < 600,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of routes) {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "networkidle",
    });
    assert(response?.ok(), `${label} ${route} returned ${response?.status()}`);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      `${label} ${route} has horizontal overflow`,
    );
    assert(
      (await page.locator("h1").count()) === 1,
      `${label} ${route} must have one h1`,
    );
  }
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  assert(
    (await page.locator("#hero h1").innerText()).includes("Xin (Ethan) Li"),
    `${label} hero identity is missing`,
  );
  for (const sectionId of ["about", "projects", "experience", "education"]) {
    assert(
      (await page.locator(`#${sectionId}`).count()) === 1,
      `${label} home is missing #${sectionId}`,
    );
  }
  assert(
    (await page
      .getByRole("navigation", { name: "Primary navigation" })
      .count()) === 1,
    `${label} primary navigation is missing`,
  );
  const violations = await audit(page, `${label} home`);
  await page.screenshot({
    path: path.join(screenshotDir, `${label}-home.png`),
    fullPage: true,
  });
  await page.goto(`${baseUrl}/projects/supplier-risk-intelligence/`, {
    waitUntil: "networkidle",
  });
  for (const image of await page.locator("img").all())
    await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    [...document.images].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  const imageFailures = await page
    .locator("img")
    .evaluateAll((images) =>
      images
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.getAttribute("src")),
    );
  assert(
    imageFailures.length === 0,
    `${label} case-study images failed: ${imageFailures.join(", ")}`,
  );
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await page.addStyleTag({
    content:
      "#site-header { position: absolute !important; } .skip-link { display: none !important; }",
  });
  await page.screenshot({
    path: path.join(screenshotDir, `${label}-case-study.png`),
    fullPage: true,
  });
  assert(errors.length === 0, `${label} page errors: ${errors.join(", ")}`);
  await page.close();
  return violations;
}

const desktop = await verifyViewport({ width: 1440, height: 1000 }, "desktop");
const mobile = await verifyViewport({ width: 390, height: 844 }, "mobile");
await browser.close();
console.log(
  JSON.stringify(
    {
      status: "passed",
      axeViolations: { desktop, mobile },
      screenshots: screenshotDir,
    },
    null,
    2,
  ),
);
