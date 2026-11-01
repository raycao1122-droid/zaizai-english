import { test, expect, type Page } from "@playwright/test";
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
async function service(page: Page, ready = true) {
  await page.route("**/api/voice/config", (r) =>
    r.fulfill({
      json: {
        providers: [{ id: "qwen", configured: true }],
        capabilities: { unit1Teaching: ready },
      },
    }),
  );
  await page.route("**/api/voice/session", (r) =>
    r.fulfill({ json: { token: "unit-entry-test-device-token" } }),
  );
  let selection: any;
  await page.route("**/api/voice/ticket", (r) => {
    selection = r.request().postDataJSON();
    return r.fulfill({ json: { ticket: "unit-entry-test-ticket" } });
  });
  await page.routeWebSocket("**/api/voice/socket?*", (ws) => {
    ws.onMessage(() => {});
    ws.send(JSON.stringify({ type: "ready" }));
  });
  return {
    get selection() {
      return selection;
    },
  };
}
test("default is L1, starts correct curriculum, and the course footer never resets it to Animals", async ({
  page,
}) => {
  const api = await service(page);
  await page.goto("/");
  await expect(page.locator(".unit-activity h1")).toHaveText("Hello, Emma!");
  await expect(
    page.getByRole("heading", { name: "Welcome to our English class!" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "课程", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "从头演示 Animals 示例课", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "开始 / 继续 L1 · Hello, Emma!", exact: true })
    .click();
  await expect
    .poll(() => api.selection?.context?.curriculum?.lessonId)
    .toBe("L1");
  await expect(page.locator(".voice-connection-status")).toContainText(
    "已连接",
  );
  await expect(page.locator(".unit-activity")).toBeVisible();
  mkdirSync("screenshots/unit-entry", { recursive: true });
  await page.screenshot({ path: "screenshots/unit-entry/l1-started.png" });
});
test("legacy null selection migrates to new unit without losing answers or progress", async ({
  page,
}) => {
  await service(page);
  await page.addInitScript(() => {
    if (!localStorage.getItem("seeded")) {
      localStorage.setItem(
        "zaizai.unit1.records.v1",
        JSON.stringify({
          version: 1,
          selected: null,
          progress: {
            L2: {
              stage: 3,
              scenario: "birthday",
              hint: "H1",
              visited: [0, 1, 3],
            },
          },
          records: [],
          checks: [
            { id: "U1-Q2", answer: "I'm nine.", at: "2026-10-31T10:00:00Z" },
          ],
        }),
      );
      localStorage.setItem("seeded", "yes");
    }
  });
  await page.goto("/");
  await expect(page.locator(".unit-activity h1")).toHaveText("Hello, Emma!");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("zaizai.unit1.records.v1")!),
  );
  expect(saved.progress.L2.stage).toBe(3);
  expect(saved.checks).toHaveLength(1);
});
test("explicit Animals selection persists, and a direct L2 link overrides it only once", async ({
  page,
}) => {
  await service(page);
  await page.goto("/?course=animals");
  await expect(
    page.getByRole("heading", { name: "Welcome to our English class!" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome to our English class!" }),
  ).toBeVisible();
  await page.goto("/?course=L2");
  await expect(page.locator(".unit-activity h1")).toHaveText("I’m Nine!");
  await expect.poll(() => page.url()).not.toContain("course=");
  await page.getByRole("button", { name: "课程", exact: true }).click();
  await page.getByRole("button", { name: /^L3 · / }).click();
  await page.reload();
  await expect(page.locator(".unit-activity h1")).toHaveText("Meet My Friend");
});
test("old backend shows a blocking reason in the actual course and does not pretend learning started", async ({
  page,
}) => {
  const api = await service(page, false);
  await page.goto("/?course=L1");
  await expect(page.getByRole("alert")).toContainText("未开始授课");
  await page.getByRole("button", { name: "开始学习", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("尚未更新第一单元教学");
  await expect(
    page.getByRole("button", { name: "开始学习", exact: true }),
  ).toBeEnabled();
  expect(api.selection).toBeUndefined();
  mkdirSync("screenshots/unit-entry", { recursive: true });
  await page.screenshot({
    path: "screenshots/unit-entry/service-not-ready.png",
  });
});
