import { test, expect, type Page, type WebSocketRoute } from "@playwright/test";
import { openReady } from "./helpers";
import { mkdirSync } from "node:fs";
test.use({
  launchOptions: {
    executablePath: "/usr/bin/chromium",
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  },
});
async function setup(page: Page, unit1 = true) {
  await page.route("**/api/voice/config", (r) =>
    r.fulfill({
      json: {
        providers: [{ id: "qwen", configured: true }],
        capabilities: { lessonSpeech: true, unit1Teaching: unit1 },
      },
    }),
  );
  await page.route("**/api/voice/session", (r) =>
    r.fulfill({ json: { token: "unit-test-authorized-device-token" } }),
  );
  await page.route("**/api/voice/ticket", (r) =>
    r.fulfill({ json: { ticket: "unit-test-ticket" } }),
  );
  let relay: WebSocketRoute | undefined;
  const controls: Record<string, unknown>[] = [];
  await page.routeWebSocket("**/api/voice/socket?*", (ws) => {
    relay = ws;
    ws.onMessage((raw) => {
      const e = JSON.parse(String(raw));
      if (e.type !== "audio") controls.push(e);
    });
    ws.send(JSON.stringify({ type: "ready" }));
  });
  return {
    get relay() {
      return relay!;
    },
    controls,
  };
}
async function choose(page: Page, id: string) {
  await page.getByRole("button", { name: "课程", exact: true }).click();
  await page
    .getByRole("button", { name: new RegExp("^" + id + " · ") })
    .click();
}
async function run(page: Page) {
  await page.getByRole("button", { name: /^(开始学习|继续学习)$/ }).click();
  await expect(page.locator(".voice-connection-status")).toContainText(
    "已连接",
  );
}
for (const [width, height] of [
  [1536, 1024],
  [1024, 768],
  [390, 844],
])
  test(`four real lessons, synchronized assets, independent hints and retained Animals at ${width}`, async ({
    page,
  }) => {
    await setup(page);
    await page.setViewportSize({ width, height });
    await openReady(page);
    for (const id of ["L1", "L2", "L3", "L4"]) {
      await choose(page, id);
      await expect(page.locator(".unit-activity")).toBeVisible();
      await expect(page.locator(".unit-scene-image img")).toHaveCount(0);
      await run(page);
      await page
        .getByRole("button", { name: "2. 情境讲解", exact: true })
        .click();
      await expect(page.locator(".unit-scene-image img")).toHaveAttribute(
        "src",
        new RegExp(
          id === "L1"
            ? "emma_greeting"
            : id === "L2"
              ? "birthday"
              : id === "L3"
                ? "school_friends"
                : "conversation",
        ),
      );
      expect(
        await page
          .locator(".unit-scene-image img")
          .evaluate(
            (im: HTMLImageElement) => im.complete && im.naturalWidth > 0,
          ),
      ).toBeTruthy();
      await page
        .getByRole("button", { name: "4. 迁移任务", exact: true })
        .click();
      await expect(page.locator(".unit-scene-image img")).toHaveCount(0);
      await page
        .getByRole("combobox", { name: "提示等级", exact: true })
        .selectOption("H1");
      await expect(page.locator(".unit-scene-image img")).toHaveAttribute(
        "src",
        /school_welcome/,
      );
    }
    await page
      .getByRole("button", { name: "学习记录（0）", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "本机学习记录" }),
    ).toContainText("尚无真实回答");
    mkdirSync("screenshots/unit1", { recursive: true });
    await page.locator(".unit-activity").evaluate((e) => (e.scrollTop = 0));
    await page.screenshot({
      path: `screenshots/unit1/lesson-${width}.png`,
      fullPage: width === 390,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.getByRole("button", { name: "课程", exact: true }).click();
    await page
      .getByRole("button", { name: "返回 Animals 示例课", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Welcome to our English class!",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".unit-activity")).toHaveCount(0);
  });
test("real ASR evidence, paused recording guard, objective checks and persistent progress never create oral scores", async ({
  page,
}) => {
  const service = await setup(page);
  await openReady(page);
  await choose(page, "L1");
  await run(page);
  const ctx = {
    lessonId: "L1",
    stageId: "warmup",
    scenarioId: "school",
    hintRequested: "H0",
    question: "What's your name?",
    taskId: "L1-warmup",
  };
  service.relay.send(
    JSON.stringify({
      type: "subtitle",
      speaker: "在在",
      id: "actual-one",
      text: "I'm Zaizai.",
      final: true,
      evidenceContext: ctx,
    }),
  );
  await page
    .getByRole("button", { name: "学习记录（1）", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "本机学习记录" }),
  ).toContainText("I'm Zaizai.");
  await expect(
    page.getByRole("region", { name: "本机学习记录" }),
  ).toContainText("暂无");
  await page.getByLabel("教材文字回答").fill("My name is Zaizai.");
  await page.getByRole("button", { name: "记录文字回答", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "本机学习记录" }),
  ).toContainText("文字输入 · 非口语");
  await page.getByRole("button", { name: "知识检查", exact: true }).click();
  const q = page.locator(".unit-checks fieldset").first();
  await q.getByRole("button", { name: "I'm nine.", exact: true }).click();
  await expect(q).toContainText("需重试");
  await q.getByRole("button", { name: "I'm Zaizai.", exact: true }).click();
  await expect(q).toContainText("本次选择正确");
  await page.getByRole("button", { name: "暂停课堂", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "记录文字回答", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "下一环节", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.locator(".unit-activity")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "学习记录（2）", exact: true }),
  ).toBeVisible();
  await run(page);
  await page
    .getByRole("button", { name: "学习记录（2）", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "本机学习记录" }),
  ).toContainText("发音分：未实现");
  await page.getByRole("button", { name: "知识检查", exact: true }).click();
  await expect(page.locator(".unit-checks")).toContainText("最近一次正确 1 题");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出学习记录", exact: true }).click();
  expect((await download).suggestedFilename()).toBe(
    "zaizai-unit1-learning-records.json",
  );
});
test("a stale voice backend cannot silently teach Animals for an imported lesson", async ({
  page,
}) => {
  await setup(page, false);
  let tickets = 0;
  await page.route("**/api/voice/ticket", (r) => {
    tickets++;
    return r.fulfill({ json: { ticket: "forbidden" } });
  });
  await openReady(page);
  await choose(page, "L2");
  await page.getByRole("button", { name: "开始学习", exact: true }).click();
  await expect(page.locator(".voice-connection-status")).toContainText(
    "尚未更新第一单元教学",
  );
  expect(tickets).toBe(0);
});

test("independent oral evidence needs verified voice answers in two contexts and cannot use displayed answers", async ({
  page,
}) => {
  const service = await setup(page);
  await openReady(page);
  await choose(page, "L1");
  await run(page);
  const send = (
    id: string,
    scenarioId: string,
    stageId: string,
    hintRequested: string,
  ) =>
    service.relay.send(
      JSON.stringify({
        type: "subtitle",
        speaker: "在在",
        id,
        text: "Evidence " + id,
        final: true,
        evidenceContext: {
          lessonId: "L1",
          stageId,
          scenarioId,
          hintRequested,
          question: "What's your name?",
          taskId: "L1-" + stageId,
        },
      }),
    );
  send("school", "school", "mission", "H0");
  send("assisted", "birthday", "context", "H3");
  await page
    .getByRole("button", { name: "学习记录（2）", exact: true })
    .click();
  async function verify(text: string) {
    const row = page.locator(".unit-records article").filter({ hasText: text });
    await row.getByRole("combobox", { name: /复核正确性/ }).selectOption("yes");
    await row.getByRole("combobox", { name: /复核提示/ }).selectOption("H0");
    await row.getByRole("combobox", { name: /复核能力/ }).selectOption("name");
    await row.getByRole("checkbox").check();
  }
  await verify("Evidence school");
  await verify("Evidence assisted");
  await expect(page.locator(".unit-records")).toContainText("暂无");
  send("birthday", "birthday", "mission", "H0");
  await verify("Evidence birthday");
  await expect(page.locator(".unit-records")).toContainText("能力：姓名表达");
});
