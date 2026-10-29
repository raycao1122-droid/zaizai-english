// Record the existing M1 production interface without changing application code.
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
const pause = (ms = 1800) => page.waitForTimeout(ms);
async function click(locator, delay = 1800) {
  await locator.hover();
  await pause(300);
  await locator.click();
  await pause(delay);
}

try {
  await page.goto(
    process.env.DEMO_URL || "http://127.0.0.1:4173/zaizai-english/",
  );
  await page.getByRole("heading", { name: "Can you find the dog?" }).waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  await pause(2200);
  await click(page.getByRole("button", { name: "选择 cat", exact: true }));
  await click(page.getByRole("button", { name: "提示我一下" }));
  await click(
    page.getByRole("button", { name: "选择 dog", exact: true }),
    2400,
  );
  await click(page.getByRole("button", { name: "关闭状态提示" }), 500);
  await click(page.getByRole("tab", { name: "学习提示" }));
  await click(page.getByRole("tab", { name: "课堂笔记" }), 600);
  await page
    .getByRole("textbox", { name: "本次课堂笔记" })
    .fill("dog — 小狗\nrabbit — 兔子");
  await pause(1800);
  await click(page.getByRole("button", { name: "收起辅助面板" }), 2200);
  await click(page.getByRole("button", { name: "展开辅助面板" }), 1200);
  await click(page.getByRole("tab", { name: "课堂对话" }), 1000);
  await click(page.getByRole("button", { name: "下一步", exact: true }));
  await click(page.getByRole("button", { name: "选择 cat", exact: true }));
  await click(
    page.getByRole("button", { name: "麦克风 模拟", exact: true }),
    1300,
  );
  await click(
    page.getByRole("button", { name: "已静音 模拟", exact: true }),
    700,
  );
  await click(
    page.getByRole("button", { name: "暂停课堂", exact: true }),
    1500,
  );
  await click(
    page.locator(".device-controls").getByRole("button", { name: "继续课堂" }),
    700,
  );
  await click(page.getByRole("button", { name: "退出课堂", exact: true }), 700);
  await click(page.getByRole("button", { name: "确认退出" }), 1700);
  await click(page.getByRole("button", { name: "重新进入课堂" }), 1700);
  await click(
    page.getByRole("button", { name: "重新开始", exact: true }),
    2000,
  );
  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  const video = page.video();
  await context.close();
  if (video) await video.saveAs("demo/classroom-demo.webm");
  await browser.close();
}
console.log("Saved actual M1 browser recording: demo/classroom-demo.webm");
