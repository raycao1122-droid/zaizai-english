// Record the actual M2 production interface; do not change application code.
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { chromium } from "@playwright/test";

await mkdir("demo/raw", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (process.platform === "linux" && existsSync("/usr/bin/chromium")
      ? "/usr/bin/chromium"
      : undefined),
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: "demo/raw", size: { width: 1280, height: 800 } },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const pause = (ms = 1100) => page.waitForTimeout(ms);
async function click(locator, delay = 1100) {
  await locator.hover();
  await pause(200);
  await locator.click();
  await pause(delay);
}
const next = () =>
  click(
    page
      .locator(".voice-bar")
      .getByRole("button", { name: "下一步", exact: true }),
    1400,
  );
try {
  await page.goto(
    process.env.DEMO_URL || "http://127.0.0.1:4173/zaizai-english/",
  );
  await page
    .getByRole("heading", { name: "Welcome to our English class!" })
    .waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  await pause(1800);
  await click(
    page.locator(".welcome-stage").getByRole("button", { name: "开始上课" }),
  );
  await click(page.getByRole("button", { name: "I’m good!", exact: true }));
  await next();
  await click(page.locator(".vocabulary-thumbnails button").nth(1));
  await next();
  await click(page.getByRole("button", { name: "选择 cat", exact: true }));
  await click(page.getByRole("button", { name: "提示我一下" }));
  await click(page.getByRole("button", { name: "选择 dog", exact: true }));
  await click(page.getByRole("button", { name: "关闭状态提示" }), 300);
  await next();
  await click(page.getByRole("button", { name: "模拟再试一次" }), 1600);
  await next();
  await click(page.getByRole("button", { name: "I like birds.", exact: true }));
  await next();
  await click(
    page.getByRole("button", { name: "Yes, I have a cat.", exact: true }),
  );
  await next();
  await click(page.getByRole("button", { name: "选择 bird", exact: true }));
  await click(page.getByRole("button", { name: "关闭状态提示" }), 300);
  await next();
  await pause(1500);
  await next();
  const report = page.getByRole("region", { name: "家长学习报告" });
  await click(report.getByRole("tab", { name: "学习数据", exact: true }), 1700);
  await click(report.getByRole("tab", { name: "发音分析", exact: true }), 1700);
  await next();
  const archive = page.getByRole("region", { name: "长期英语档案" });
  await click(archive.getByRole("button", { name: "近 3 次", exact: true }));
  await click(archive.getByRole("tab", { name: "错题与复习", exact: true }));
  await click(
    archive.getByRole("button", { name: "标记复习", exact: true }).first(),
  );
  await click(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "课程", exact: true }),
    1600,
  );
  await click(
    page.getByRole("button", { name: "继续本次课堂", exact: true }),
    500,
  );
  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  const video = page.video();
  await context.close();
  if (video) await video.saveAs("demo/m2-classroom-demo.webm");
  await browser.close();
}
console.log("Saved actual M2 browser recording: demo/m2-classroom-demo.webm");
