import { test, expect } from "@playwright/test";
import { openReady } from "./helpers";
async function settings(
  page: import("@playwright/test").Page,
  configured: boolean,
) {
  await page.route("**/api/health", (r) =>
    r.fulfill({ json: { configured, capability: "text-only" } }),
  );
  await page.getByRole("button", { name: "在在的课堂设置" }).click();
  await page.getByRole("checkbox", { name: "真实 AI 文字对话（M3）" }).click();
}
test("M3 refuses unavailable backend and retains explicitly simulated mode", async ({
  page,
}) => {
  await openReady(page);
  await settings(page, false);
  await expect(
    page.getByRole("checkbox", { name: "真实 AI 文字对话（M3）" }),
  ).not.toBeChecked();
  await expect(page.locator(".toast")).toContainText("服务未就绪");
});
test("M3 text adapter renders a fixture API reply and no scripted teacher answer", async ({
  page,
}) => {
  await page.route("**/api/classroom/reply", (r) =>
    r.fulfill({
      json: {
        text: "What pet do you like?",
        source: "openai",
        capability: "text-only",
      },
    }),
  );
  await openReady(page);
  await settings(page, true);
  await page.keyboard.press("Escape");
  await page
    .getByRole("textbox", { name: "输入英文 AI 回答" })
    .fill("I like dogs.");
  await page.getByRole("button", { name: "发送 AI 回答" }).click();
  await expect(page.locator(".message-bubble").last()).toContainText(
    "What pet do you like?",
  );
  await expect(
    page.getByRole("textbox", { name: "输入英文 AI 回答" }),
  ).toHaveValue("");
});
test("M3 connection failure retains a retryable draft and does not invent a reply", async ({
  page,
}) => {
  await page.route("**/api/classroom/reply", (r) =>
    r.fulfill({ status: 502, json: { error: "AI 连接失败，请重试。" } }),
  );
  await openReady(page);
  await settings(page, true);
  await page.keyboard.press("Escape");
  const before = await page.locator(".message-bubble").count();
  await page
    .getByRole("textbox", { name: "输入英文 AI 回答" })
    .fill("I like cats.");
  await page.getByRole("button", { name: "发送 AI 回答" }).click();
  await expect(page.locator(".toast")).toContainText("连接失败");
  await expect(
    page.getByRole("textbox", { name: "输入英文 AI 回答" }),
  ).toHaveValue("I like cats.");
  await expect(page.locator(".message-bubble")).toHaveCount(before);
});
