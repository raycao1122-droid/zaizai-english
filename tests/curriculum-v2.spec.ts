import { test, expect } from "@playwright/test";
import { openReady } from "./helpers";

test("bookshelf selection, recent items, categories and detail placeholders work", async ({
  page,
}) => {
  await openReady(page);
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "课程", exact: true })
    .click();
  const modal = page.getByRole("dialog", { name: "课程与教材", exact: true });
  await expect(modal.getByText("还没有最近使用的资料")).toBeVisible();
  await modal
    .getByRole("button", {
      name: "选择教材 四年级英语教材 · 示例条目",
      exact: true,
    })
    .click();
  await expect(modal.locator(".shelf-card.selected")).toContainText(
    "四年级英语教材",
  );
  await modal
    .getByRole("navigation", { name: "教材分类" })
    .getByRole("button", { name: "最近使用", exact: true })
    .click();
  await expect(modal.locator(".shelf-card")).toHaveCount(1);
  await modal.getByRole("button", { name: "章节目录", exact: true }).click();
  await expect(modal.locator(".material-preview")).toContainText(
    "真实教材解析尚未接入",
  );
  await modal.getByRole("button", { name: "语文教材", exact: true }).click();
  await expect(modal.locator(".empty-state")).toContainText("尚无资料");
  await modal
    .getByRole("button", { name: "继续本次课堂", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "课程", exact: true })
    .click();
  await expect(modal.locator(".shelf-recent-grid")).toContainText(
    "四年级英语教材",
  );
  await expect(modal.locator(".shelf-card.selected")).toHaveCount(1);
});

for (const [width, height] of [
  [1536, 1024],
  [1024, 768],
  [390, 844],
]) {
  test(`bookshelf V2 fits ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openReady(page);
    await page
      .getByRole("navigation", { name: "主导航" })
      .getByRole("button", { name: "课程", exact: true })
      .click();
    const modal = page.getByRole("dialog", { name: "课程与教材", exact: true });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.decode()));
    });
    expect(
      await modal.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    ).toBe(true);
    expect(
      await modal
        .locator(".shelf-main")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    ).toBe(true);
    await page.screenshot({
      path: `screenshots/curriculum-v2/bookshelf-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await modal
      .getByRole("button", { name: "从头演示 Animals 示例课", exact: true })
      .click();
    await expect(page.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
  });
}
