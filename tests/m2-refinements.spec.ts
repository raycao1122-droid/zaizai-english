import { test, expect } from "@playwright/test";
import { openReady, goToStage, waitForArtwork } from "./helpers";

test("class navigation preserves pause and returns to the previous lesson stage", async ({
  page,
}) => {
  await openReady(page);
  await goToStage(page, 5);
  await page.getByRole("button", { name: "暂停课堂", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "上课", exact: true })
    .click();
  await expect(page.locator(".pause-notice")).toBeVisible();
  await page
    .locator(".device-controls")
    .getByRole("button", { name: "继续课堂", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "学习报告", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "上课", exact: true })
    .click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "6",
  );
});

test("a historical report returns to the same archive tab and scroll position", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openReady(page);
  await goToStage(page, 10);
  const archive = page.getByRole("region", { name: "长期英语档案" });
  await archive.getByRole("button", { name: "10-15", exact: true }).click();
  await archive.getByRole("button", { name: "近 3 次", exact: true }).click();
  await archive.getByRole("tab", { name: "课堂记录", exact: true }).click();
  const record = archive.locator(".archive-history-row").last();
  await record
    .getByRole("button", { name: "查看模拟报告" })
    .scrollIntoViewIfNeeded();
  const previousScroll = await archive.evaluate((element) => element.scrollTop);
  await record.getByRole("button", { name: "查看模拟报告" }).click();
  const report = page.getByRole("region", { name: "家长学习报告" });
  await expect(report.locator(".report-heading")).toContainText("2026-10-01");
  await report.locator(".report-bottom button").click();
  await expect(
    archive.getByRole("tab", { name: "课堂记录", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(await archive.evaluate((element) => element.scrollTop)).toBeCloseTo(
    previousScroll,
    0,
  );
  await archive.getByRole("tab", { name: "学习进度", exact: true }).click();
  await expect(
    archive.getByRole("button", { name: "近 3 次", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(archive.locator(".selected-session")).toContainText(
    "2026-10-15",
  );
  // Entering this lesson's report from the directory must not retain an old date.
  await goToStage(page, 3);
  await goToStage(page, 9);
  await expect(report.locator(".report-heading")).toContainText("2026-10-28");
});

test("dialog padding keeps the dialog open and its close control remains available", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openReady(page);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "课程", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "课程与教材", exact: true });
  const box = (await dialog.boundingBox())!;
  await page.mouse.click(box.x + 5, box.y + 25);
  await expect(dialog).toBeVisible();
  await page.locator(".library-actions").evaluate((element) => {
    let parent = element.parentElement;
    while (parent && parent.scrollHeight <= parent.clientHeight + 1)
      parent = parent.parentElement;
    if (parent) parent.scrollTop = parent.scrollHeight;
  });
  await expect(dialog.getByRole("button", { name: "关闭弹窗" })).toBeInViewport(
    { ratio: 1 },
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "课程", exact: true }),
  ).toBeFocused();
});

test("report tabs stay reachable when reading long reports and support keyboard navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openReady(page);
  await goToStage(page, 9);
  const report = page.getByRole("region", { name: "家长学习报告" });
  await report.evaluate(
    (element) => (element.scrollTop = element.scrollHeight),
  );
  const summary = report.getByRole("tab", { name: "本节课总结", exact: true });
  await expect(summary).toBeInViewport({ ratio: 1 });
  await summary.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    report.getByRole("tab", { name: "学习数据", exact: true }),
  ).toBeFocused();
  await expect(
    report.getByRole("tab", { name: "学习数据", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(
    report.getByRole("tab", { name: "下节课建议", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await expect(summary).toBeFocused();
});

test("landscape tablet keeps all eleven stages above the bottom controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openReady(page);
  for (let stage = 0; stage < 11; stage++) {
    if (stage) await goToStage(page, stage);
    await waitForArtwork(page);
    const lesson = (await page.locator(".lesson-panel").boundingBox())!;
    const footer = (await page.locator(".voice-bar").boundingBox())!;
    expect(
      lesson.y + lesson.height,
      `Stage ${stage + 1} is covered by the footer`,
    ).toBeLessThanOrEqual(footer.y);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBeLessThanOrEqual(768);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(1024);
    const overflow = await page
      .locator(
        ".activity-card,.question-line,.animal-grid,.parent-report,.learning-archive",
      )
      .evaluateAll((elements) =>
        elements.some(
          (element) => element.scrollWidth > element.clientWidth + 1,
        ),
      );
    expect(overflow, `Stage ${stage + 1} overflows horizontally`).toBe(false);
    if ([3, 9, 10].includes(stage))
      await page.screenshot({
        path: `screenshots/m2-refinements/tablet-stage-${stage + 1}.png`,
        fullPage: true,
        animations: "disabled",
      });
  }
});
