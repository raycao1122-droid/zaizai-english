import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { openReady } from "./helpers";
test.use({
  launchOptions: {
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  },
});
const processor = readFileSync("src/voice/capture.worklet.js", "utf8");
for (const rate of [16000, 44100, 48000]) {
  test(`native ${rate}Hz capture produces exactly one second of 16kHz PCM`, () => {
    let Capture: any;
    const frames: ArrayBuffer[] = [];
    runInNewContext(processor, {
      sampleRate: rate,
      Int16Array,
      ArrayBuffer,
      DataView,
      Math,
      AudioWorkletProcessor: class {
        port = { postMessage: (b: ArrayBuffer) => frames.push(b) };
      },
      registerProcessor: (_name: string, c: any) => {
        Capture = c;
      },
    });
    const p = new Capture();
    const data = Float32Array.from(
      { length: rate },
      (_, i) => 0.4 * Math.sin((2 * Math.PI * 1000 * i) / rate),
    );
    for (let i = 0; i < data.length; i += 128)
      p.process([[data.subarray(i, i + 128)]]);
    expect(frames).toHaveLength(25);
    expect(frames.reduce((n, f) => n + f.byteLength, 0)).toBe(32000);
    const view = new DataView(frames[4]);
    let energy = 0;
    for (let i = 0; i < view.byteLength; i += 2)
      energy += (view.getInt16(i, true) / 32768) ** 2;
    expect(Math.sqrt(energy / (view.byteLength / 2))).toBeGreaterThan(0.2);
  });
}
test.describe("mobile audio replay with synthetic microphone and relay audio", () => {
  for (const [width, height] of [
    [1536, 1024],
    [390, 844],
  ]) {
    test(`own recording and Emma voice decode, play, pause microphone and clear on reset ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.route("**/api/voice/config", (r) =>
        r.fulfill({ json: { providers: [{ id: "qwen", configured: true }] } }),
      );
      await page.route("**/api/voice/session", (r) =>
        r.fulfill({ json: { token: "test-only-browser-authorization" } }),
      );
      await page.route("**/api/voice/ticket", (r) =>
        r.fulfill({ json: { ticket: "test-only-single-use-ticket" } }),
      );
      let relay: import("@playwright/test").WebSocketRoute | undefined,
        frameCount = 0;
      const controls: { type: string; muted?: boolean }[] = [];
      let silentFrames = 0;
      await page.routeWebSocket("**/api/voice/socket?*", (ws) => {
        relay = ws;
        ws.onMessage((raw) => {
          const e = JSON.parse(String(raw));
          if (e.type === "audio") {
            frameCount++;
            if (Buffer.from(e.audio, "base64").every((b) => b === 0))
              silentFrames++;
          } else controls.push(e);
        });
        ws.send(JSON.stringify({ type: "ready" }));
      });
      await openReady(page);
      await page.getByRole("button", { name: "开始语音", exact: true }).click();
      await expect(page.locator(".voice-connection-status")).toContainText(
        "已连接",
      );
      await expect(
        page.getByRole("textbox", { name: "输入英文模拟回答" }),
      ).toHaveAttribute("placeholder", "语音会话中，请直接说话");
      await expect(
        page.getByRole("button", { name: "模拟播放Emma对话" }),
      ).toHaveCount(0);
      await expect.poll(() => frameCount).toBeGreaterThan(3);
      relay!.send(
        JSON.stringify({ type: "interrupted", id: "student-recording" }),
      );
      await page.waitForTimeout(350);
      relay!.send(
        JSON.stringify({ type: "thinking", id: "student-recording" }),
      );
      relay!.send(
        JSON.stringify({
          type: "subtitle",
          speaker: "在在",
          id: "student-recording",
          text: "Hello Emma.",
          final: true,
        }),
      );
      relay!.send(JSON.stringify({ type: "response-started" }));
      const pcm = Buffer.alloc(48000);
      for (let i = 0; i < 24000; i++)
        pcm.writeInt16LE(
          Math.round(8000 * Math.sin((2 * Math.PI * 440 * i) / 24000)),
          i * 2,
        );
      relay!.send(
        JSON.stringify({
          type: "audio",
          id: "emma-recording",
          audio: pcm.toString("base64"),
        }),
      );
      relay!.send(
        JSON.stringify({
          type: "subtitle",
          speaker: "Emma",
          id: "emma-recording",
          text: "Hello! What animal do you like?",
          final: true,
        }),
      );
      relay!.send(
        JSON.stringify({ type: "audio-complete", id: "emma-recording" }),
      );
      relay!.send(JSON.stringify({ type: "turn-ended" }));
      const mine = page.getByLabel("在在语音回听"),
        emma = page.getByLabel("Emma语音回听");
      await expect(mine).toBeVisible();
      await expect(emma).toBeVisible();
      await expect
        .poll(() =>
          emma.evaluate(
            (e: HTMLAudioElement) => Number.isFinite(e.duration) && e.duration,
          ),
        )
        .toBeCloseTo(1, 1);
      const header = await mine.evaluate(async (e: HTMLAudioElement) => {
        const b = await (await fetch(e.src)).arrayBuffer();
        const v = new DataView(b);
        return {
          riff: new TextDecoder().decode(b.slice(0, 4)),
          rate: v.getUint32(24, true),
          bytes: v.getUint32(40, true),
          actual: b.byteLength - 44,
        };
      });
      expect(header.riff).toBe("RIFF");
      expect(header.rate).toBe(16000);
      expect(header.bytes).toBe(header.actual);
      expect(header.bytes).toBeGreaterThan(1000);
      await emma.scrollIntoViewIfNeeded();
      await emma.click({ position: { x: 18, y: 18 } });
      await expect
        .poll(() => emma.evaluate((e: HTMLAudioElement) => e.paused))
        .toBe(false);
      await expect
        .poll(() => emma.evaluate((e: HTMLAudioElement) => e.currentTime))
        .toBeGreaterThan(0.05);
      const beforeSilence = silentFrames;
      await expect.poll(() => silentFrames).toBeGreaterThan(beforeSilence);
      expect(controls.some((e) => e.type === "mute")).toBe(false);
      // A real answer arriving during local replay waits, then plays automatically.
      relay!.send(JSON.stringify({ type: "response-started" }));
      relay!.send(
        JSON.stringify({
          type: "audio",
          id: "queued-reply",
          audio: pcm.toString("base64"),
        }),
      );
      await expect(page.locator(".voice-connection-status")).not.toContainText(
        "Emma 正在说话",
      );
      await emma.evaluate((e: HTMLAudioElement) => e.pause());
      await expect(page.locator(".voice-connection-status")).toContainText(
        "Emma 正在说话",
      );
      expect(controls.some((e) => e.type === "mute")).toBe(false);
      await page
        .getByRole("button", { name: "回听我的录音", exact: true })
        .click();
      await expect(page.getByLabel("最近录音回听")).toBeVisible();
      mkdirSync("screenshots/voice-replay", { recursive: true });
      await page.locator(".message-voice-clip").last().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `screenshots/voice-replay/replay-${width}.png`,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      // Neither media nor authorization is persisted in web storage.
      const storage = await page.evaluate(() =>
        JSON.stringify({
          local: { ...localStorage },
          session: { ...sessionStorage },
        }),
      );
      expect(storage).not.toMatch(
        /blob:|audio\/wav|test-only-browser-authorization/,
      );
      await page.getByRole("button", { name: "重新开始", exact: true }).click();
      await expect(page.locator("audio")).toHaveCount(0);
    });
  }
});

test("a suspended mobile AudioContext shows a recovery button and resumes microphone input", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    const list: AudioContext[] = [];
    (window as unknown as { __voiceContexts: AudioContext[] }).__voiceContexts =
      list;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        list.push(this);
      }
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/voice/config", (r) =>
    r.fulfill({ json: { providers: [{ id: "qwen", configured: true }] } }),
  );
  await page.route("**/api/voice/session", (r) =>
    r.fulfill({ json: { token: "test-only-browser-authorization" } }),
  );
  await page.route("**/api/voice/ticket", (r) =>
    r.fulfill({ json: { ticket: "test-only-single-use-ticket" } }),
  );
  let frames = 0;
  await page.routeWebSocket("**/api/voice/socket?*", (ws) => {
    ws.onMessage((raw) => {
      if (JSON.parse(String(raw)).type === "audio") frames++;
    });
    ws.send(JSON.stringify({ type: "ready" }));
  });
  await openReady(page);
  await page.getByRole("button", { name: "开始语音", exact: true }).click();
  await expect.poll(() => frames).toBeGreaterThan(2);
  await page.evaluate(() =>
    (
      window as unknown as { __voiceContexts: AudioContext[] }
    ).__voiceContexts[0].suspend(),
  );
  await expect(
    page.getByRole("button", { name: "恢复声音", exact: true }),
  ).toBeVisible();
  const before = frames;
  await page.getByRole("button", { name: "恢复声音", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "恢复声音", exact: true }),
  ).toHaveCount(0);
  await expect.poll(() => frames).toBeGreaterThan(before);
  await expect(page.locator(".voice-connection-status")).toContainText(
    "已连接",
  );
  await page.getByRole("button", { name: "断开语音", exact: true }).click();
});

test("existing deployed relay without audio item IDs still attaches real audio to the right caption", async ({
  page,
}) => {
  await page.route("**/api/voice/config", (r) =>
    r.fulfill({ json: { providers: [{ id: "qwen", configured: true }] } }),
  );
  await page.route("**/api/voice/session", (r) =>
    r.fulfill({ json: { token: "test-only-browser-authorization" } }),
  );
  await page.route("**/api/voice/ticket", (r) =>
    r.fulfill({ json: { ticket: "test-only-ticket" } }),
  );
  let relay: import("@playwright/test").WebSocketRoute | undefined,
    frames = 0;
  await page.routeWebSocket("**/api/voice/socket?*", (ws) => {
    relay = ws;
    ws.onMessage((raw) => {
      if (JSON.parse(String(raw)).type === "audio") frames++;
    });
    ws.send(JSON.stringify({ type: "ready" }));
  });
  await openReady(page);
  await page.getByRole("button", { name: "开始语音", exact: true }).click();
  await expect.poll(() => frames).toBeGreaterThan(3);
  relay!.send(JSON.stringify({ type: "interrupted" }));
  await page.waitForTimeout(200);
  relay!.send(JSON.stringify({ type: "thinking" }));
  relay!.send(
    JSON.stringify({
      type: "subtitle",
      speaker: "在在",
      id: "legacy-student",
      text: "I like dogs.",
      final: true,
    }),
  );
  relay!.send(JSON.stringify({ type: "response-started" }));
  relay!.send(
    JSON.stringify({
      type: "audio",
      audio: Buffer.alloc(24000).toString("base64"),
    }),
  );
  relay!.send(
    JSON.stringify({
      type: "subtitle",
      speaker: "Emma",
      id: "legacy-teacher",
      text: "What dog do you like?",
      final: true,
    }),
  );
  relay!.send(JSON.stringify({ type: "turn-ended" }));
  await expect(page.getByLabel("在在语音回听")).toBeVisible();
  await expect(page.getByLabel("Emma语音回听")).toBeVisible();
  const teacher = page
    .locator(".message-bubble")
    .filter({ hasText: "What dog do you like?" });
  await expect(teacher.getByLabel("Emma语音回听")).toHaveCount(1);
  await page.getByRole("button", { name: "断开语音", exact: true }).click();
});

test("start stays disabled until a slow service catalog has actually loaded", async ({
  page,
}) => {
  await page.route("**/api/voice/config", async (r) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await r.fulfill({
      json: { providers: [{ id: "qwen", configured: true }] },
    });
  });
  await page.route("**/api/voice/session", (r) =>
    r.fulfill({ status: 401, json: { error: "当前设备尚未授权。" } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "正在准备语音…", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "开始语音", exact: true }),
  ).toBeEnabled();
});
