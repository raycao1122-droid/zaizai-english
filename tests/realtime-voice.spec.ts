import { test, expect, type Page } from "@playwright/test";
import { openExercise, openReady } from "./helpers";
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
      model: "qwen3.8-omni-flash-realtime",
      region: "cn-beijing",
      missing: [],
    },
    { id: "doubao", configured: false },
    { id: "openai", configured: false },
  ],
};
async function service(page: Page, configured = true) {
  await page.route("**/api/voice/config", (r) =>
    r.fulfill({ json: configured ? config : { providers: [] } }),
  );
  await page.route("**/api/voice/login", (r) =>
    r.fulfill({
      json: { token: "test-only-short-lived-access-token", expiresIn: 1800 },
    }),
  );
  await page.route("**/api/voice/test", (r) =>
    r.fulfill({
      json: {
        ok: true,
        message:
          "百炼鉴权及会话配置通过；麦克风、音频播放、字幕与打断仍需设备实测。",
      },
    }),
  );
  await page.route("**/api/voice/ticket", (r) =>
    r.fulfill({ json: { ticket: "one-use-test-ticket" } }),
  );
}
async function openConfig(page: Page) {
  await page.getByRole("button", { name: "AI 服务配置", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "AI 服务配置" })).toBeVisible();
}
async function authorize(page: Page) {
  await page
    .getByLabel("课堂访问口令（不是 API Key）")
    .fill("test-only-classroom-access-code");
  await page.getByRole("button", { name: "验证访问口令", exact: true }).click();
  await expect(
    page.getByText("已授权 · 仅本次页面内存保留，刷新后需重新验证。"),
  ).toBeVisible();
}
test("models default to Qwen, persist across reload, never claim unimplemented adapters ready", async ({
  page,
}) => {
  await service(page, false);
  await openReady(page);
  const select = page.getByRole("combobox", { name: "实时语音模型" });
  await expect(select).toHaveValue("qwen");
  await expect(select.locator("option")).toHaveText([
    "通义千问 · 未配置",
    "豆包实时语音 · 未配置",
    "OpenAI Realtime · 未配置",
  ]);
  await select.selectOption("doubao");
  await page.reload();
  await expect(select).toHaveValue("doubao");
  await openConfig(page);
  await expect(
    page.getByRole("button", { name: "测试连接", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText("状态：适配器尚未接入")).toBeVisible();
});
test("configuration and test connection are explicit, no provider key entry or credential persistence", async ({
  page,
}) => {
  await service(page);
  await openReady(page);
  await openConfig(page);
  await expect(
    page.getByText("DASHSCOPE_API_KEY", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "测试连接", exact: true }),
  ).toBeDisabled();
  await authorize(page);
  await expect(page.getByLabel("课堂访问口令（不是 API Key）")).toHaveValue("");
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(page.locator(".ai-test-result")).toContainText("仍需设备实测");
  const storage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  );
  expect(storage).not.toContain("test-only-short-lived-access-token");
  expect(storage).not.toContain("test-only-classroom-access-code");
  await page.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await page.getByRole("button", { name: "在在的课堂设置" }).click();
  await expect(page.locator(".ai-config-entry")).toBeVisible();
});
test("unreachable backend remains unconfigured and does not request microphone permission", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () => {
        throw new Error("must not request microphone before configuration");
      },
    });
  });
  await page.route("**/api/voice/config", (r) =>
    r.fulfill({ status: 503, body: "service unavailable" }),
  );
  await openReady(page);
  await openConfig(page);
  await expect(page.locator(".ai-service-config")).toContainText(
    "语音后端尚未连接",
  );
  await expect(
    page.getByRole("button", { name: "连接真实语音", exact: true }),
  ).toBeDisabled();
});

test("missing backend, auth failures, API-key misuse and test failures show errors without invented conversation", async ({
  page,
}) => {
  await service(page);
  await page.route("**/api/voice/login", (r) =>
    r.fulfill({ status: 401, json: { error: "课堂访问口令无效。" } }),
  );
  await openReady(page);
  await openConfig(page);
  await page
    .getByLabel("课堂访问口令（不是 API Key）")
    .fill("sk-this-is-not-a-real-provider-key");
  await page.getByRole("button", { name: "验证访问口令", exact: true }).click();
  await expect(page.locator(".ai-test-result")).toContainText(
    "不能填写 API Key",
  );
  await page
    .getByLabel("课堂访问口令（不是 API Key）")
    .fill("wrong-classroom-access");
  await page.getByRole("button", { name: "验证访问口令", exact: true }).click();
  await expect(page.locator(".ai-test-result")).toContainText("口令无效");
  await page.route("**/api/voice/login", (r) =>
    r.fulfill({ json: { token: "test-only-short-lived-access-token" } }),
  );
  await authorize(page);
  await page.route("**/api/voice/test", (r) =>
    r.fulfill({
      status: 502,
      json: { error: "百炼鉴权失败：请检查 Key、地域、业务空间及模型权限。" },
    }),
  );
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(page.locator(".ai-test-result")).toContainText("百炼鉴权失败");
  await page.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await expect(page.locator(".message-bubble")).toHaveCount(1);
});

// Synthetic device/events are test fixtures, not evidence of real Alibaba speech quality.
test.describe("browser audio plumbing with synthetic microphone and relay events", () => {
  test("microphone denial releases the pending connection and permits retry or model selection", async ({
    page,
  }) => {
    await service(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        value: () =>
          Promise.reject(new DOMException("fixture denial", "NotAllowedError")),
      });
    });
    await openReady(page);
    await openConfig(page);
    await authorize(page);
    await page
      .getByRole("button", { name: "连接真实语音", exact: true })
      .click();
    await expect(
      page.locator(".ai-service-config .notice-copy").last(),
    ).toContainText("麦克风权限被拒绝");
    await page.getByRole("button", { name: "关闭弹窗", exact: true }).click();
    await expect(
      page.getByRole("combobox", { name: "实时语音模型" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "重新连接", exact: true }),
    ).toBeVisible();
  });
  test("streaming mic/audio/captions, interruption, mute, locking, course state, disconnect and reconnect", async ({
    page,
  }) => {
    await service(page);
    const received: {
      type: string;
      context?: { prompt: string };
      audio?: string;
      muted?: boolean;
    }[] = [];
    let relay: import("@playwright/test").WebSocketRoute | undefined;
    let micFrames = 0;
    await page.routeWebSocket("**/api/voice/socket?*", (socket) => {
      relay = socket;
      socket.onMessage((raw) => {
        const e = JSON.parse(String(raw));
        received.push(e);
        if (e.type === "audio") micFrames++;
      });
      socket.send(JSON.stringify({ type: "ready" }));
    });
    await openExercise(page);
    await openConfig(page);
    await authorize(page);
    await page
      .getByRole("button", { name: "连接真实语音", exact: true })
      .click();
    await expect(
      page.locator(".ai-service-config .notice-copy").last(),
    ).toContainText("已连接");
    await page.getByRole("button", { name: "关闭弹窗", exact: true }).click();
    await expect(
      page.getByRole("combobox", { name: "实时语音模型" }),
    ).toBeDisabled();
    await expect.poll(() => micFrames).toBeGreaterThan(0);
    relay!.send(
      JSON.stringify({
        type: "subtitle",
        speaker: "在在",
        id: "student1",
        text: "I like dogs.",
        final: true,
      }),
    );
    relay!.send(JSON.stringify({ type: "thinking" }));
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
        id: "teacher1",
        text: "Do you like ",
      }),
    );
    relay!.send(
      JSON.stringify({
        type: "subtitle-delta",
        speaker: "Emma",
        id: "teacher1",
        text: "cats?",
      }),
    );
    await expect(page.locator(".message-bubble").last()).toContainText(
      "Do you like cats?",
    );
    relay!.send(JSON.stringify({ type: "interrupted" }));
    await expect(page.locator(".voice-center")).toHaveClass(/voice-listening/);
    await page.getByRole("button", { name: "语音静音", exact: true }).click();
    await expect
      .poll(() => received.some((e) => e.type === "mute" && e.muted))
      .toBeTruthy();
    const frames = micFrames;
    await page.waitForTimeout(200);
    expect(micFrames).toBeLessThanOrEqual(frames + 1);
    await page.getByRole("button", { name: "取消静音", exact: true }).click();
    await expect.poll(() => micFrames).toBeGreaterThan(frames);
    await page.getByRole("button", { name: "选择 cat", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Can you find the dog?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "断开语音", exact: true }).click();
    await expect(
      page.getByRole("combobox", { name: "实时语音模型" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("heading", { name: "Can you find the dog?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "连接语音", exact: true }).click();
    await expect(page.locator(".voice-connection-status")).toContainText(
      "已连接",
    );
    relay!.close({ code: 1011, reason: "fixture disconnect" });
    await expect(page.locator(".voice-connection-status")).toContainText(
      "已断开",
    );
    await expect(
      page.getByRole("button", { name: "重新连接", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "重新连接", exact: true }).click();
    await expect(page.locator(".voice-connection-status")).toContainText(
      "已连接",
    );
    await page.getByRole("button", { name: "暂停课堂", exact: true }).click();
    await expect(page.locator(".voice-connection-status")).toContainText(
      "已断开",
    );
    await expect(
      page.getByRole("combobox", { name: "实时语音模型" }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "继续课堂", exact: true })
      .first()
      .click();
    await page.getByRole("button", { name: "连接语音", exact: true }).click();
    await expect(page.locator(".voice-connection-status")).toContainText(
      "已连接",
    );
    await page.getByRole("button", { name: "重新开始", exact: true }).click();
    await expect(page.locator(".voice-connection-status")).toContainText(
      "已断开",
    );
    await expect(
      page.getByRole("heading", { name: "Welcome to our English class!" }),
    ).toBeVisible();
  });
});
for (const [width, height] of [
  [1536, 1024],
  [1024, 768],
  [390, 844],
]) {
  test(`real page screenshots and configuration layout ${width}x${height}`, async ({
    page,
  }) => {
    // Deliberately unconfigured screenshot: no fake successful provider claims.
    await page.route("**/api/voice/config", (r) =>
      r.fulfill({ json: { providers: [] } }),
    );
    await page.setViewportSize({ width, height });
    await openReady(page);
    mkdirSync("screenshots/realtime-config", { recursive: true });
    await page.screenshot({
      path: `screenshots/realtime-config/classroom-${width}.png`,
      fullPage: false,
    });
    await expect(
      page.getByRole("combobox", { name: "实时语音模型" }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "实时语音模型" }),
    ).toHaveValue("qwen");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await openConfig(page);
    await page.screenshot({
      path: `screenshots/realtime-config/settings-${width}.png`,
      fullPage: false,
    });
    const dialog = page.getByRole("dialog");
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBeTruthy();
    await expect(
      page.getByRole("button", { name: "关闭弹窗", exact: true }),
    ).toBeInViewport();
    await page
      .getByRole("button", { name: "连接真实语音", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `screenshots/realtime-config/settings-controls-${width}.png`,
      fullPage: false,
    });
    await expect(
      page.getByRole("button", { name: "连接真实语音", exact: true }),
    ).toBeInViewport();
  });
}
