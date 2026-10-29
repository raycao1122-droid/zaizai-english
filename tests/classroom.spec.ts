import { test, expect, type Page } from "@playwright/test";

async function openClass(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Can you find the dog?" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.decode()));
  });
}

async function closeToast(page: Page) {
  const close = page.getByRole("button", { name: "关闭状态提示" });
  if (await close.isVisible()) await close.click();
}

for (const [width, height] of [
  [1536, 1024],
  [1440, 900],
  [1280, 800],
  [1920, 1080],
  [390, 844],
]) {
  test(`layout and original artwork load at ${width}x${height}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height });
    await openClass(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(
      page.getByRole("button", { name: "选择 rabbit" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "下一步", exact: true }),
    ).toBeVisible();
    const overlaps = await page
      .locator(".emma-panel,.lesson-panel,.conversation-panel,.voice-bar")
      .evaluateAll((nodes) => {
        const rects = nodes.map((e) => e.getBoundingClientRect());
        return rects.some((a, i) =>
          rects
            .slice(i + 1)
            .some(
              (b) =>
                Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1,
            ),
        );
      });
    expect(overlaps).toBe(false);
    if (width >= 1280) {
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight),
      ).toBeLessThanOrEqual(height);
      for (const card of await page
        .getByRole("button", { name: /^选择 / })
        .all()) {
        const box = (await card.boundingBox())!;
        expect(box.height).toBeGreaterThan(115);
      }
    }
    await page.screenshot({
      path: `screenshots/${width === 1536 ? "01-default" : `layout-${width}x${height}`}.png`,
      fullPage: true,
      animations: "disabled",
    });
    expect(errors).toEqual([]);
  });
}

test("wrong choice, hint, correct choice and feedback are visible", async ({
  page,
}) => {
  await openClass(page);
  await page.getByRole("button", { name: "选择 cat", exact: true }).click();
  await expect(page.locator(".animal-cat")).toHaveClass(/incorrect/);
  await expect(page.locator(".feedback")).toContainText("Not quite");
  await page.getByRole("button", { name: "提示我一下" }).click();
  await expect(
    page.getByText("你能找到小狗吗？", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "选择 dog", exact: true }).click();
  await expect(page.locator(".animal-dog")).toHaveClass(/correct/);
  await expect(page.locator(".feedback")).toContainText("Great!");
  await expect(page.locator(".message-bubble").last()).toContainText(
    "It’s a dog!",
  );
  await closeToast(page);
  await page.screenshot({
    path: "screenshots/02-interaction.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "收起提示" }).click();
  await expect(
    page.getByText("你能找到小狗吗？", { exact: true }),
  ).not.toBeVisible();
});

test("panel switches, collapses, expands, and preserves notes", async ({
  page,
}) => {
  await openClass(page);
  await page.getByRole("tab", { name: "学习提示" }).click();
  await expect(page.getByText("Take your time.")).toBeVisible();
  await page.getByRole("tab", { name: "课堂笔记" }).click();
  await page
    .getByRole("textbox", { name: "本次课堂笔记" })
    .fill("rabbit — 兔子");
  await page.getByRole("button", { name: "加入当前单词" }).click();
  const before = (await page.locator(".lesson-panel").boundingBox())!.width;
  await page.getByRole("button", { name: "收起辅助面板" }).click();
  await expect(
    page.getByRole("complementary", { name: "课堂辅助面板" }),
  ).not.toBeVisible();
  expect(
    (await page.locator(".lesson-panel").boundingBox())!.width,
  ).toBeGreaterThan(before + 250);
  await page.screenshot({
    path: "screenshots/03-panel-collapsed.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "展开辅助面板" }).click();
  await expect(page.getByRole("textbox", { name: "本次课堂笔记" })).toHaveValue(
    "rabbit — 兔子\ndog",
  );
  await page.getByRole("tab", { name: "课堂对话" }).click();
  await expect(page.locator(".message-bubble")).toContainText("Hi, Zaizai!");
});

test("progress, directory, final step and reset stay within M1", async ({
  page,
}) => {
  await openClass(page);
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Can you find the cat?" }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "2",
  );
  await page.getByRole("button", { name: "课程目录", exact: true }).click();
  await page.getByRole("button", { name: /4\s*找一找兔子/ }).click();
  await expect(
    page.getByRole("heading", { name: "Can you find the rabbit?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "5",
  );
  await page.getByRole("button", { name: "再练一次", exact: true }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await expect(
    page.getByRole("heading", { name: "Can you find the dog?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "选择 dog" }).click();
  await page.getByRole("button", { name: "重新开始", exact: true }).click();
  await expect(page.locator(".animal-card.correct")).toHaveCount(0);
});

test("all eight voice states are simulation and never request devices", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "__deviceRequests", {
      value: 0,
      writable: true,
    });
    if (navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = async () => {
        (window as unknown as { __deviceRequests: number }).__deviceRequests++;
        throw new Error("Device access is forbidden in M1");
      };
  });
  await openClass(page);
  const selector = page.getByRole("combobox", { name: "语音模拟状态" });
  await expect(selector).toHaveValue("listening");
  for (const state of [
    "speaking",
    "listening",
    "thinking",
    "correcting",
    "muted",
    "paused",
    "disconnected",
    "idle",
  ]) {
    await selector.selectOption(state);
    await expect(selector).toHaveValue(state);
  }
  await page.getByRole("button", { name: "麦克风 模拟", exact: true }).click();
  await expect(selector).toHaveValue("muted");
  await page.getByRole("button", { name: "已静音 模拟", exact: true }).click();
  await page.getByRole("button", { name: "切换语音模拟状态" }).click();
  await expect(selector).toHaveValue("listening");
  await page.getByRole("button", { name: "摄像头尚未接入" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "不会请求摄像头或麦克风权限",
  );
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __deviceRequests: number }).__deviceRequests,
    ),
  ).toBe(0);
});

test("pause blocks answers and progress, resume restores them", async ({
  page,
}) => {
  await openClass(page);
  await page.getByRole("button", { name: "暂停课堂", exact: true }).click();
  await expect(page.getByRole("button", { name: "选择 dog" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "下一步", exact: true }),
  ).toBeDisabled();
  await page
    .locator(".device-controls")
    .getByRole("button", { name: "继续课堂" })
    .click();
  await expect(page.getByRole("button", { name: "选择 dog" })).toBeEnabled();
  await page.getByRole("button", { name: "快", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "快", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("exit and reenter preserve lesson; restart returns to first exercise", async ({
  page,
}) => {
  await openClass(page);
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "退出课堂", exact: true }).click();
  await page.getByRole("button", { name: "确认退出" }).click();
  await expect(page.getByRole("heading", { name: "课堂已退出" })).toBeVisible();
  await page.getByRole("button", { name: "重新进入课堂" }).click();
  await expect(
    page.getByRole("heading", { name: "Can you find the cat?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "退出课堂", exact: true }).click();
  await page.getByRole("button", { name: "确认退出" }).click();
  await page.getByRole("button", { name: "从头开始" }).click();
  await expect(
    page.getByRole("heading", { name: "Can you find the dog?" }),
  ).toBeVisible();
});

test("other navigation is explicit, dialogs close with Escape and restore focus", async ({
  page,
}) => {
  await openClass(page);
  for (const name of ["课程", "单词本", "错题本", "学习报告"]) {
    const trigger = page
      .getByRole("navigation")
      .getByRole("button", { name, exact: true });
    await trigger.click();
    await expect(page.getByRole("dialog")).toContainText(`「${name}」待开发。`);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test("settings translation and text answers are local and explicit", async ({
  page,
}) => {
  await openClass(page);
  await expect(page.locator(".translation")).toHaveCount(0);
  await page.getByRole("button", { name: "在在的课堂设置" }).click();
  await page.getByRole("checkbox", { name: "显示中文翻译" }).check();
  await page.getByRole("button", { name: "关闭弹窗" }).click();
  await expect(page.locator(".translation")).toContainText("你好，在在");
  const input = page.getByRole("textbox", { name: "输入英文模拟回答" });
  await input.fill("dog");
  await page.getByRole("button", { name: "发送模拟回答" }).click();
  await expect(page.locator(".animal-dog")).toHaveClass(/correct/);
  await input.fill("hello Emma");
  await input.press("Enter");
  await expect(page.locator(".message-bubble").last()).toContainText(
    "Let’s practice one animal word: dog.",
  );
  await page.getByRole("button", { name: "模拟播放课堂提问" }).click();
  await expect(page.locator(".toast")).toContainText("尚未接入音频或语音 API");
});

test("M1 refinement: notes and unsent answer survive exit and reentry", async ({
  page,
}) => {
  await openClass(page);
  await page.getByRole("tab", { name: "课堂笔记" }).click();
  await page
    .getByRole("textbox", { name: "本次课堂笔记" })
    .fill("rabbit — 兔子");
  await page
    .getByRole("textbox", { name: "输入英文模拟回答" })
    .fill("It's a dog");
  await page.getByRole("button", { name: "退出课堂", exact: true }).click();
  await page.getByRole("button", { name: "确认退出" }).click();
  await page.getByRole("button", { name: "重新进入课堂" }).click();
  await expect(page.getByRole("tab", { name: "课堂笔记" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("textbox", { name: "本次课堂笔记" })).toHaveValue(
    "rabbit — 兔子",
  );
  await expect(
    page.getByRole("textbox", { name: "输入英文模拟回答" }),
  ).toHaveValue("It's a dog");
});

test("M1 refinement: pause preserves an unsent answer until resume", async ({
  page,
}) => {
  await openClass(page);
  const input = page.getByRole("textbox", { name: "输入英文模拟回答" });
  await input.fill("dog");
  await page.getByRole("button", { name: "暂停课堂", exact: true }).click();
  await expect(input).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "发送模拟回答" }),
  ).toBeDisabled();
  await expect(input).toHaveValue("dog");
  await closeToast(page);
  await page.screenshot({
    path: "screenshots/05-paused-draft.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .locator(".device-controls")
    .getByRole("button", { name: "继续课堂" })
    .click();
  await expect(input).toBeEnabled();
  await expect(input).toHaveValue("dog");
  await input.press("Enter");
  await expect(page.locator(".animal-dog")).toHaveClass(/correct/);
});

test("M1 refinement: paused classroom also locks directory navigation", async ({
  page,
}) => {
  await openClass(page);
  await page.getByRole("button", { name: "暂停课堂", exact: true }).click();
  await page.getByRole("button", { name: "课程目录", exact: true }).click();
  const target = page.getByRole("button", { name: /4\s*找一找兔子/ });
  await expect(target).toBeDisabled();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await page.keyboard.press("Escape");
  await page
    .locator(".device-controls")
    .getByRole("button", { name: "继续课堂" })
    .click();
  await page.getByRole("button", { name: "课程目录", exact: true }).click();
  await target.click();
  await expect(
    page.getByRole("heading", { name: "Can you find the rabbit?" }),
  ).toBeVisible();
});

test("M1 refinement: wrong choice still allows a useful animal hint", async ({
  page,
}) => {
  await openClass(page);
  await page.getByRole("button", { name: "选择 cat", exact: true }).click();
  await page.getByRole("button", { name: "提示我一下" }).click();
  await expect(page.locator(".hint-text")).toContainText("floppy ears");
  await closeToast(page);
  await page.screenshot({
    path: "screenshots/04-retry-hint.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "收起提示" }).click();
  await expect(page.locator(".hint-text")).toHaveCount(0);
  await expect(page.locator(".feedback")).toContainText("Not quite");
  await page.getByRole("button", { name: "提示我一下" }).click();
  await page.getByRole("button", { name: "选择 dog", exact: true }).click();
  await expect(page.locator(".feedback")).toContainText("Great!");
});

test("M1 refinement: reset restores default panel, draft and lesson state", async ({
  page,
}) => {
  await openClass(page);
  await page.getByRole("tab", { name: "课堂笔记" }).click();
  await page
    .getByRole("textbox", { name: "本次课堂笔记" })
    .fill("practice rabbit");
  await page.getByRole("textbox", { name: "输入英文模拟回答" }).fill("rabbit");
  await page.getByRole("button", { name: "收起辅助面板" }).click();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "重新开始", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "课堂辅助面板" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "课堂对话" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("textbox", { name: "输入英文模拟回答" }),
  ).toHaveValue("");
  await page.getByRole("tab", { name: "课堂笔记" }).click();
  await expect(page.getByRole("textbox", { name: "本次课堂笔记" })).toHaveValue(
    "",
  );
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
});
