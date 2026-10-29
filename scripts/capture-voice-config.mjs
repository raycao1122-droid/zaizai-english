// Run npm run dev:api and npm run dev -- --port 5173 --strictPort first.
// Captures actual local pages without API fixtures, login, microphone or provider calls.
import { chromium } from "@playwright/test";
import { mkdirSync, existsSync } from "node:fs";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
});
try {
  mkdirSync("screenshots/realtime-config", { recursive: true });
  for (const [width, height] of [
    [1536, 1024],
    [1024, 768],
    [390, 844],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(15000);
    await page.goto("http://127.0.0.1:5173/");
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.decode()));
    });
    await page.screenshot({
      path: `screenshots/realtime-config/classroom-${width}.png`,
    });
    if (width === 390) {
      await page
        .getByRole("combobox", { name: "实时语音模型" })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: "screenshots/realtime-config/models-390.png",
      });
    }
    await page
      .getByRole("button", { name: "AI 服务配置", exact: true })
      .click();
    await page.screenshot({
      path: `screenshots/realtime-config/settings-${width}.png`,
    });
    await page
      .getByRole("button", { name: "连接真实语音", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `screenshots/realtime-config/settings-controls-${width}.png`,
    });
    console.log(`Captured ${width}x${height}; no microphone or provider call.`);
    await page.close();
  }
} finally {
  await browser.close();
}
