// Serve the actual production build under the Pages repository prefix.
// Requests outside the prefix deliberately return 404, exposing broken root URLs.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("dist");
const prefix = process.env.PAGES_BASE_PATH || "/zaizai-english/";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (!path.startsWith(prefix)) {
    res.writeHead(404).end();
    return;
  }
  const file = resolve(
    root,
    decodeURIComponent(path.slice(prefix.length)) || "index.html",
  );
  if (!file.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const data = await readFile(file);
    res
      .writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
      })
      .end(data);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
let browser;
try {
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (process.platform === "linux" && existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const errors = [];
  const badResponses = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      badResponses.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(origin + prefix);
  await page.getByRole("heading", { name: "Can you find the dog?" }).waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  const imagePaths = await page
    .locator("img")
    .evaluateAll((images) =>
      images.map((image) => new URL(image.src).pathname),
    );
  assert(
    imagePaths.every((path) => path.startsWith(prefix + "assets/")),
    "Images must use the Pages prefix",
  );
  await page.getByRole("button", { name: "选择 dog", exact: true }).click();
  assert(
    await page
      .locator(".animal-dog")
      .evaluate((card) => card.classList.contains("correct")),
  );
  await page.getByRole("tab", { name: "学习提示" }).click();
  await page.getByRole("heading", { name: "Take your time." }).waitFor();
  await page.getByRole("button", { name: "收起辅助面板" }).click();
  await page.getByRole("button", { name: "展开辅助面板" }).click();
  await page.getByRole("heading", { name: "Take your time." }).waitFor();
  await page.getByRole("tab", { name: "课堂对话" }).click();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("heading", { name: "Can you find the cat?" }).waitFor();
  assert.deepEqual(errors, [], "Production browser errors");
  assert.deepEqual(badResponses, [], "Production asset failures");
  console.log(
    `PASS: production build at ${prefix}; all artwork uses the prefix; animal feedback, tabs, panel and progression work; no failed requests or browser errors.`,
  );
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
}
