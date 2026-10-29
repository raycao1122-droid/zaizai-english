import { test, expect, type Page } from "@playwright/test";
import { openReady, openExercise, waitForArtwork } from "./helpers";
import { mkdirSync } from "node:fs";
test.use({
  launchOptions: {
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  },
});
const config = {
  providers: [
    {
      id: "qwen",
      name: "通义千问",
      configured: true,
      implemented: true,
      status: "可连接",
    },
    { id: "doubao", configured: false },
    { id: "openai", configured: false },
  ],
};
async function service(page: Page, authorized = true, configured = true) {
  await page.route("**/api/voice/config", (r) =>
    r.fulfill({ json: configured ? config : { providers: [] } }),
  );
  await page.route("**/api/voice/session", (r) =>
    r.fulfill(
      authorized
        ? { json: { token: "test-only-short-lived-access-token" } }
        : {
            status: 401,
            json: { error: "当前设备尚未授权，请联系课堂管理员。" },
          },
    ),
  );
  await page.route("**/api/voice/ticket", (r) =>
    r.fulfill({ json: { ticket: "single-use-test-ticket" } }),
  );
}
test("classroom settings expose no admin forms, environment variables or deployment documents", async ({
  page,
}) => {
  await service(page);
  await openReady(page);
  await expect(
    page.getByRole("button", { name: "开始语音", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "AI 服务配置", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "在在的课堂设置" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await expect(dialog).not.toContainText(
    /AI 服务配置|DASHSCOPE|CLASSROOM_ACCESS_CODE|Render|Environment|API Key|后端地址|测试连接/,
  );
});
test("model preference persists but the old browser deployment address is retired", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("zaizai.voice.backend.v1", "https://obsolete.example"),
  );
  await service(page);
  await openReady(page);
  await page
    .getByRole("combobox", { name: "实时语音模型" })
    .selectOption("doubao");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "实时语音模型" }),
  ).toHaveValue("doubao");
  expect(
    await page.evaluate(() => localStorage.getItem("zaizai.voice.backend.v1")),
  ).toBeNull();
  await page.getByRole("button", { name: "开始语音", exact: true }).click();
  await expect(page.locator(".voice-connection-status")).toContainText(
    "未配置",
  );
});
test("unauthorized devices receive an ordinary access error and never get a setup form", async ({
  page,
}) => {
  await service(page, false);
  await openReady(page);
  await page.getByRole("button", { name: "开始语音", exact: true }).click();
  await expect(page.locator(".voice-connection-status")).toContainText(
    "尚未授权",
  );
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "实时语音模型" }),
  ).toBeEnabled();
});
test("one-time access link is exchanged once in StrictMode and removed from URL, with tokens only in memory", async ({
  page,
}) => {
  await service(page, false);
  let exchanged = 0;
  await page.route("**/api/voice/authorize", (r) => {
    exchanged++;
    expect(r.request().postDataJSON()).toEqual({ grant: "test-device-invite" });
    return r.fulfill({ json: { token: "test-only-grant-access-token" } });
  });
  await page.goto("/#classroom-access=test-device-invite");
  await expect(page.locator(".voice-connection-status")).toContainText(
    "语音已就绪",
  );
  expect(page.url()).not.toContain("classroom-access");
  expect(exchanged).toBe(1);
  const storage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  );
  expect(storage).not.toMatch(
    /test-device-invite|test-only-grant-access-token/,
  );
});
test("microphone denial provides a useful error and releases the model selector", async ({
  page,
}) => {
  await service(page);
  await page.addInitScript(() =>
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () =>
        Promise.reject(new DOMException("test denial", "NotAllowedError")),
    }),
  );
  await openReady(page);
  await page.getByRole("button", { name: "开始语音", exact: true }).click();
  await expect(page.locator(".voice-connection-status")).toContainText(
    "麦克风权限被拒绝",
  );
  await expect(
    page.getByRole("combobox", { name: "实时语音模型" }),
  ).toBeEnabled();
});
test("authorized users stream microphone/captions, interrupt, mute, reconnect and preserve lesson state without configuration", async ({
  page,
}) => {
  await service(page);
  let relay: import("@playwright/test").WebSocketRoute | undefined;
  let frames = 0;
  const messages: { type: string; muted?: boolean }[] = [];
  await page.routeWebSocket("**/api/voice/socket?*", (ws) => {
    relay = ws;
    ws.onMessage((raw) => {
      const e = JSON.parse(String(raw));
      messages.push(e);
      if (e.type === "audio") frames++;
    });
    ws.send(JSON.stringify({ type: "ready" }));
  });
  await openExercise(page);
  await page.getByRole("button", { name: "开始语音", exact: true }).click();
  await expect(page.locator(".voice-connection-status")).toContainText(
    "已连接",
  );
  await expect(
    page.getByRole("combobox", { name: "实时语音模型" }),
  ).toBeDisabled();
  await expect.poll(() => frames).toBeGreaterThan(0);
  relay!.send(
    JSON.stringify({
      type: "subtitle",
      speaker: "在在",
      id: "student",
      text: "I like dogs.",
      final: true,
    }),
  );
  relay!.send(JSON.stringify({ type: "response-started" }));
  relay!.send(
    JSON.stringify({
      type: "audio",
      audio: Buffer.alloc(4800).toString("base64"),
    }),
  );
  relay!.send(
    JSON.stringify({
      type: "subtitle-delta",
      speaker: "Emma",
      id: "teacher",
      text: "Do you like cats?",
    }),
  );
  await expect(page.locator(".message-bubble").last()).toContainText(
    "Do you like cats?",
  );
  relay!.send(JSON.stringify({ type: "interrupted" }));
  await expect(page.locator(".voice-center")).toHaveClass(/voice-listening/);
  await page.getByRole("button", { name: "语音静音", exact: true }).click();
  await expect
    .poll(() => messages.some((e) => e.type === "mute" && e.muted))
    .toBeTruthy();
  const before = frames;
  await page.waitForTimeout(150);
  expect(frames).toBeLessThanOrEqual(before + 1);
  await page.getByRole("button", { name: "取消静音", exact: true }).click();
  await expect.poll(() => frames).toBeGreaterThan(before);
  await page.getByRole("button", { name: "选择 cat", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Can you find the dog?" }),
  ).toBeVisible();
  relay!.close({ code: 1011, reason: "test disconnect" });
  await expect(page.locator(".voice-connection-status")).toContainText(
    "已断开",
  );
  await page.getByRole("button", { name: "重新连接", exact: true }).click();
  await expect(page.locator(".voice-connection-status")).toContainText(
    "已连接",
  );
  await page.getByRole("button", { name: "暂停课堂", exact: true }).click();
  await expect(page.locator(".voice-connection-status")).toContainText(
    "已断开",
  );
  await page
    .getByRole("button", { name: "继续课堂", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "开始语音", exact: true }).click();
  await expect(page.locator(".voice-connection-status")).toContainText(
    "已连接",
  );
  await page.getByRole("button", { name: "重新开始", exact: true }).click();
  await expect(page.locator(".voice-connection-status")).toContainText(
    "已断开",
  );
});
for (const [width, height] of [
  [1536, 1024],
  [1024, 768],
  [390, 844],
]) {
  test(`classroom with no administrative data at ${width}x${height}`, async ({
    page,
  }) => {
    await service(page);
    await page.setViewportSize({ width, height });
    await openReady(page);
    await waitForArtwork(page);
    mkdirSync("screenshots/voice-simple", { recursive: true });
    await page
      .getByRole("combobox", { name: "实时语音模型" })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `screenshots/voice-simple/classroom-${width}.png`,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.getByRole("button", { name: "在在的课堂设置" }).click();
    await page.screenshot({
      path: `screenshots/voice-simple/settings-${width}.png`,
    });
    await expect(
      page.getByRole("button", { name: "关闭弹窗", exact: true }),
    ).toBeInViewport();
    await expect(page.getByRole("dialog")).not.toContainText(
      /DASHSCOPE|API Key|Render|后端地址/,
    );
  });
}
