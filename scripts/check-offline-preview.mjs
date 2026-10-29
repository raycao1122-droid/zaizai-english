// Validate the distributable bytes using a temporary static server. Managed
// cloud Chromium blocks file:// by administrator policy; do not bypass it.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { chromium, expect } from "@playwright/test";

const root = resolve(process.argv[2] || ".local-cache/offline-preview");
const html = await readFile(resolve(root, "index.html"), "utf8");
assert(!html.includes('type="module"'), "File preview must use a classic script");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const file = resolve(root, decodeURIComponent(pathname.slice(1)) || "index.html");
  if (!file.startsWith(root + sep)) return res.writeHead(403).end();
  try {
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" }).end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
let browser;
try {
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const errors = [], failed = [], external = [], uploads = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (req) => failed.push(req.url()));
  page.on("response", (res) => { if (res.status() >= 400) failed.push(res.url()); });
  page.on("request", (req) => {
    if (/^https?:/.test(req.url()) && !req.url().startsWith(origin + "/")) external.push(req.url());
    if (["POST", "PUT"].includes(req.method())) uploads.push(req.url());
  });
  await page.goto(origin);
  await expect(page.getByRole("heading", { name: "Welcome to our English class!" })).toBeVisible();
  const next = () => page.locator(".voice-bar").getByRole("button", { name: "下一步", exact: true }).click();
  const images = () => page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  for (let stage = 0; stage < 11; stage++) {
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(stage + 1));
    await images();
    if (stage === 1) await page.getByRole("button", { name: "I’m good!", exact: true }).click();
    if (stage === 3) {
      await page.getByRole("button", { name: "选择 cat", exact: true }).click();
      await page.getByRole("button", { name: "选择 dog", exact: true }).click();
      await expect(page.locator(".feedback")).toContainText("Great!");
    }
    if (stage === 4) {
      await page.getByRole("button", { name: "模拟再试一次" }).click();
      await expect(page.getByText("示例切换 1 次")).toBeVisible();
    }
    if (stage === 6) await page.getByRole("button", { name: "Yes, I have a cat.", exact: true }).click();
    if (stage === 9) {
      const pending = page.waitForEvent("download");
      await page.getByRole("button", { name: "导出模拟报告" }).click();
      const download = await pending;
      assert.match(await readFile(await download.path(), "utf8"), /模拟报告 \/ 非真实学习评估/);
    }
    if (stage === 0) await page.locator(".welcome-stage").getByRole("button", { name: "开始上课" }).click();
    else if (stage < 10) await next();
  }
  await expect(page.getByRole("region", { name: "长期英语档案" })).toBeVisible();
  await page.getByRole("navigation").getByRole("button", { name: "课程", exact: true }).click();
  await page.getByLabel("选择教材文件").setInputFiles({ name: "offline-test.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF mock metadata only") });
  await expect(page.locator(".library-message")).toContainText("未上传、未解析");
  assert.deepEqual({ errors, failed, external, uploads }, { errors: [], failed: [], external: [], uploads: [] });
  console.log("PASS: extracted classic-script preview, all 11 stages, original artwork, feedback, retries, CSV and material metadata; no browser errors, failed resources, external requests or uploads. file:// remains unverified due to administrator policy.");
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
}
