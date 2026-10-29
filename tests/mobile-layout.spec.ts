import { test, expect } from "@playwright/test";
import { openReady, goToStage, waitForArtwork } from "./helpers";

test.use({ isMobile: true, hasTouch: true });

for (const [width, height] of [
  [360, 800],
  [412, 915],
  [800, 360],
]) {
  test(`shared Android web layout remains usable at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await openReady(page);
    for (let stage = 0; stage < 11; stage++) {
      if (stage) await goToStage(page, stage);
      await waitForArtwork(page);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `Stage ${stage + 1} expands the page`,
      ).toBeLessThanOrEqual(width);
      const overflow = await page
        .locator(
          ".lesson-toolbar,.activity-card,.question-line,.parent-report,.learning-archive,.voice-bar",
        )
        .evaluateAll((elements) =>
          elements.some(
            (element) => element.scrollWidth > element.clientWidth + 1,
          ),
        );
      expect(overflow, `Stage ${stage + 1} clips controls`).toBe(false);
      const footer = (await page.locator(".voice-bar").boundingBox())!;
      const lesson = (await page.locator(".lesson-panel").boundingBox())!;
      expect(lesson.y + lesson.height).toBeLessThanOrEqual(footer.y);
      if (stage === 3) {
        await page.getByRole("button", { name: "选择 dog", exact: true }).tap();
        await expect(page.locator(".feedback")).toContainText("Great!");
      }
      if (stage === 9) {
        await page.getByRole("tab", { name: "发音分析", exact: true }).tap();
        await expect(
          page.getByRole("tabpanel", { name: "发音分析" }),
        ).toContainText("无真实发音评分");
      }
      if ([3, 9].includes(stage))
        await page.screenshot({
          path: `screenshots/m2-refinements/mobile-${width}-stage-${stage + 1}.png`,
          fullPage: true,
          animations: "disabled",
        });
    }
    await page.getByRole("button", { name: "结束课堂", exact: true }).tap();
    await page.getByRole("button", { name: "确认退出", exact: true }).tap();
    await expect(
      page.getByRole("heading", { name: "课堂已退出" }),
    ).toBeVisible();
  });
}

test("drafts and notes survive a keyboard-sized viewport change", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openReady(page);
  await goToStage(page, 3);
  await page.getByRole("tab", { name: "课堂笔记", exact: true }).tap();
  await page
    .getByRole("textbox", { name: "本次课堂笔记" })
    .fill("rabbit — 继续练习");
  const input = page.getByRole("textbox", { name: "输入英文模拟回答" });
  await input.tap();
  await input.fill("I like cats.");
  // This simulates reduced layout space, not an actual Android IME or APK.
  await page.setViewportSize({ width: 360, height: 420 });
  await input.scrollIntoViewIfNeeded();
  await expect(input).toBeFocused();
  await expect(input).toBeInViewport({ ratio: 1 });
  await expect(input).toHaveValue("I like cats.");
  await page.getByRole("button", { name: "发送模拟回答", exact: true }).tap();
  await expect(input).toHaveValue("");
  await expect(page.locator(".student-message").last()).toContainText(
    "I like cats.",
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole("tab", { name: "课堂笔记", exact: true }).tap();
  await expect(page.getByRole("textbox", { name: "本次课堂笔记" })).toHaveValue(
    "rabbit — 继续练习",
  );
  await page.screenshot({
    path: "screenshots/m2-refinements/mobile-notes.png",
    fullPage: true,
    animations: "disabled",
  });
});
