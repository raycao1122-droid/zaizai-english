import { test, expect } from "@playwright/test";
import { openReady, goToStage, waitForArtwork } from "./helpers";

for (const [width, height] of [
  [1536, 1024],
  [1024, 768],
  [390, 844],
]) {
  test(`review: full material workflow and fixed controls at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const uploads: string[] = [];
    page.on("request", (r) => {
      if (["POST", "PUT"].includes(r.method())) uploads.push(r.url());
    });
    await openReady(page);
    await goToStage(page, 3);
    await page.getByRole("tab", { name: "课堂笔记", exact: true }).click();
    await page
      .getByRole("textbox", { name: "本次课堂笔记" })
      .fill("保留本次课堂笔记");
    await page
      .getByRole("textbox", { name: "输入英文模拟回答" })
      .fill("My draft");
    const open = () =>
      page
        .getByRole("navigation", { name: "主导航" })
        .getByRole("button", { name: "课程", exact: true })
        .click();
    await open();
    const dialog = page.getByRole("dialog", {
      name: "课程与教材",
      exact: true,
    });
    const close = dialog.getByRole("button", { name: "关闭弹窗" });
    const keep = dialog.getByRole("button", {
      name: "继续本次课堂",
      exact: true,
    });
    const restart = dialog.getByRole("button", {
      name: "从头演示 Animals 示例课",
      exact: true,
    });
    for (const control of [close, keep, restart])
      await expect(control).toBeInViewport({ ratio: 1 });
    if (width >= 1024)
      await expect(dialog.locator(".shelf-choose").first()).toBeInViewport({
        ratio: 1,
      });
    await waitForArtwork(page);
    await page.screenshot({
      path: `screenshots/curriculum-review/initial-${width}.png`,
      animations: "disabled",
    });
    const search = dialog.getByRole("textbox", { name: "搜索资料" });
    await search.fill("四年级");
    await expect(dialog.locator(".shelf-card")).toHaveCount(1);
    await expect(dialog.locator(".shelf-card")).toContainText("四年级英语");
    await search.fill("");
    for (const category of ["英语教材", "语文教材", "数学教材", "我的资料"]) {
      await dialog
        .getByRole("navigation", { name: "教材分类" })
        .getByRole("button", { name: category, exact: true })
        .click();
      if (category === "英语教材")
        await expect(dialog.locator(".shelf-card")).toHaveCount(2);
      else await expect(dialog.locator(".empty-state")).toBeVisible();
    }
    await dialog.getByRole("button", { name: "推荐课程", exact: true }).click();
    await dialog
      .getByRole("button", {
        name: "选择教材 四年级英语教材 · 示例条目",
        exact: true,
      })
      .click();
    await expect(dialog.locator(".shelf-card.selected")).toContainText(
      "已选择",
    );
    await expect(dialog.locator(".shelf-recent-grid")).toContainText(
      "四年级英语",
    );
    await dialog
      .locator(".shelf-card.selected")
      .getByRole("button", { name: "查看信息", exact: true })
      .click();
    await expect(dialog.locator(".material-preview")).toContainText("模拟条目");
    await dialog
      .locator(".shelf-card.selected")
      .getByRole("button", { name: "章节目录", exact: true })
      .click();
    await expect(dialog.locator(".material-preview")).toContainText(
      "真实教材解析尚未接入",
    );
    await dialog
      .getByLabel("选择教材文件")
      .setInputFiles({
        name: "验收资料.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.alloc(2048),
      });
    await expect(dialog.locator(".library-message")).toContainText(
      "未上传、未解析",
    );
    await expect(dialog.locator(".shelf-card")).toHaveCount(1);
    await dialog.getByRole("button", { name: "查看信息", exact: true }).click();
    const detail = dialog.locator(".material-preview");
    await expect(detail).toContainText("验收资料.pdf");
    await expect(detail).toContainText("PDF");
    await expect(detail).toContainText("2 KB");
    await dialog
      .getByRole("button", { name: "移除资料 验收资料.pdf", exact: true })
      .click();
    await expect(dialog.locator(".shelf-card")).toHaveCount(0);
    await dialog
      .locator(".modal-body")
      .evaluate((e) => (e.scrollTop = e.scrollHeight));
    for (const control of [close, keep, restart])
      await expect(control).toBeInViewport({ ratio: 1 });
    const body = (await dialog.locator(".modal-body").boundingBox())!,
      footer = (await dialog.locator(".modal-footer").boundingBox())!;
    expect(body.y + body.height).toBeLessThanOrEqual(footer.y + 1);
    await page.screenshot({
      path: `screenshots/curriculum-review/scrolled-${width}.png`,
      animations: "disabled",
    });
    await keep.click();
    await expect(page.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "4",
    );
    await expect(
      page.getByRole("textbox", { name: "本次课堂笔记" }),
    ).toHaveValue("保留本次课堂笔记");
    await expect(
      page.getByRole("textbox", { name: "输入英文模拟回答" }),
    ).toHaveValue("My draft");
    await open();
    await close.click();
    await expect(dialog).not.toBeVisible();
    await open();
    await restart.click();
    await expect(page.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    await page.getByRole("tab", { name: "课堂笔记", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "本次课堂笔记" }),
    ).toHaveValue("");
    await expect(
      page.getByRole("textbox", { name: "输入英文模拟回答" }),
    ).toHaveValue("");
    expect(uploads).toEqual([]);
  });
}
