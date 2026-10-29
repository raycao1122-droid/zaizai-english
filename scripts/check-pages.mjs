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
  let unavailableVoiceBackend = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    // A standalone Pages deployment has no API; verify its explicit unavailable UI.
    if (
      response.status() === 404 &&
      ["/api/voice/config", "/api/voice/session"].includes(new URL(response.url()).pathname)
    ) {
      unavailableVoiceBackend++;
      return;
    }
    if (response.status() >= 400)
      badResponses.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(origin + prefix);
  await page
    .getByRole("heading", { name: "Welcome to our English class!" })
    .waitFor();
  async function validateImages() {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    const paths = await page
      .locator("img")
      .evaluateAll((images) =>
        images.map((image) => new URL(image.src).pathname),
      );
    assert(
      paths.every((path) => path.startsWith(prefix + "assets/")),
      "Images must use the Pages prefix",
    );
  }
  async function stage(index) {
    await page.getByRole("button", { name: "课程目录", exact: true }).click();
    await page.locator(".directory-list button").nth(index).click();
    await validateImages();
  }
  await validateImages();
  await page.getByRole("combobox", { name: "实时语音模型" }).waitFor();
  assert(
    unavailableVoiceBackend > 0,
    "Static-only deployment should report the missing backend",
  );
  await page.getByRole("button", { name: "在在的课堂设置" }).click();
  assert(!(await page.getByRole("dialog").innerText()).includes("DASHSCOPE"));
  await page.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await stage(3);
  await page.getByRole("button", { name: "选择 dog", exact: true }).click();
  assert(
    await page
      .locator(".animal-dog")
      .evaluate((card) => card.classList.contains("correct")),
  );
  await page.getByRole("tab", { name: "学习提示", exact: true }).click();
  await page.getByRole("heading", { name: "Take your time." }).waitFor();
  await page.getByRole("button", { name: "收起辅助面板" }).click();
  await page.getByRole("button", { name: "展开辅助面板" }).click();
  await page.getByRole("tab", { name: "课堂对话", exact: true }).click();
  await stage(4);
  await page.getByRole("button", { name: "模拟再试一次" }).click();
  await page.getByText("示例切换 1 次").waitFor();
  await stage(6);
  await page
    .getByRole("button", { name: "Yes, I have a cat.", exact: true })
    .click();
  await stage(7);
  await page.getByRole("button", { name: "选择 bird", exact: true }).click();
  await stage(9);
  await page.getByRole("region", { name: "家长学习报告" }).waitFor();
  await stage(10);
  await page.getByRole("region", { name: "长期英语档案" }).waitFor();
  assert.deepEqual(errors, [], "Production browser errors");
  assert.deepEqual(badResponses, [], "Production asset failures");
  console.log(
    `PASS: production build at ${prefix}; all artwork uses the prefix; M2 animal feedback, pronunciation demo, scenario, reports and archive work; no failed assets or browser errors; missing voice backend is explicitly labelled.`,
  );
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
}
