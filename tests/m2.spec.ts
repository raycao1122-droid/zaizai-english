import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { openReady, openExercise, goToStage, waitForArtwork } from "./helpers";

test("M2 complete lesson proceeds through all 11 stages with explicit mock results", async ({
  page,
}) => {
  await openReady(page);
  const capture = async (number: number, name: string) => {
    await waitForArtwork(page);
    await page.screenshot({
      path: `screenshots/m2/stage-${String(number).padStart(2, "0")}-${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  };
  const next = () =>
    page
      .locator(".voice-bar")
      .getByRole("button", { name: "下一步", exact: true })
      .click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuemax",
    "11",
  );
  await capture(1, "preparation");
  await page
    .locator(".welcome-stage")
    .getByRole("button", { name: "开始上课" })
    .click();
  await expect(
    page.getByRole("heading", { name: "How are you today?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "I’m good!", exact: true }).click();
  await expect(page.locator(".activity-response")).toContainText(
    "Thanks for sharing!",
  );
  await capture(2, "greeting");
  await next();
  await page.locator(".vocabulary-thumbnails button").nth(1).click();
  await expect(
    page.getByRole("heading", { name: "Look! This is a cat." }),
  ).toBeVisible();
  await capture(3, "vocabulary");
  await next();
  await page.getByRole("button", { name: "选择 cat", exact: true }).click();
  await page.getByRole("button", { name: "提示我一下" }).click();
  await page.getByRole("button", { name: "选择 dog", exact: true }).click();
  await expect(page.locator(".feedback")).toContainText("Great!");
  await page.getByRole("button", { name: "关闭状态提示" }).click();
  await capture(4, "listening");
  await next();
  await page.getByRole("button", { name: "模拟再试一次" }).click();
  await page.getByRole("button", { name: "模拟再试一次" }).click();
  await expect(page.getByText("示例切换 2 次")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "模拟发音纠正" }),
  ).toContainText("未录音 / 未评分");
  await capture(5, "pronunciation");
  await next();
  await page
    .getByRole("button", { name: "I like birds.", exact: true })
    .click();
  await expect(page.locator(".sentence-picture")).toContainText(
    "I like birds.",
  );
  await capture(6, "sentence");
  await next();
  await page
    .getByRole("button", { name: "Yes, I have a cat.", exact: true })
    .click();
  await expect(page.locator(".activity-response")).toContainText(
    "favourite animals",
  );
  await capture(7, "scenario");
  await next();
  await expect(
    page.getByRole("heading", { name: "Which animal can fly?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "选择 fish", exact: true }).click();
  await page.getByRole("button", { name: "选择 bird", exact: true }).click();
  await page.getByRole("button", { name: /换一题/ }).click();
  await expect(
    page.getByRole("heading", { name: "Which animal has long ears?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "选择 rabbit", exact: true }).click();
  await page.getByRole("button", { name: "关闭状态提示" }).click();
  await capture(8, "review");
  await next();
  await expect(
    page.getByRole("heading", { name: "Great job, Zaizai!" }),
  ).toBeVisible();
  await expect(page.locator(".session-evidence")).toContainText(
    "点选 5 次 · 提示 1 次 · 模拟重试 2 次",
  );
  await capture(9, "student-summary");
  await next();
  await expect(
    page.getByRole("region", { name: "家长学习报告" }),
  ).toBeVisible();
  await expect(page.locator(".report-notice")).toContainText("全部数据为模拟");
  await capture(10, "parent-report");
  await next();
  await expect(
    page.getByRole("region", { name: "长期英语档案" }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "11",
  );
  await capture(11, "archive");
  await page
    .locator(".voice-bar")
    .getByRole("button", { name: "结束课堂", exact: true })
    .click();
  await page.getByRole("button", { name: "确认退出" }).click();
  await expect(page.getByRole("heading", { name: "课堂已退出" })).toBeVisible();
  await page.getByRole("button", { name: "重新进入课堂" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "11",
  );
});

test("M2 pronunciation retries are disabled while paused and never access devices", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as unknown as { deviceRequests: number }).deviceRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => {
      (window as unknown as { deviceRequests: number }).deviceRequests++;
      throw new Error("M2 must not access devices");
    };
  });
  await openReady(page);
  await goToStage(page, 4);
  await page.getByRole("button", { name: "模拟再试一次" }).click();
  await page.getByRole("button", { name: "暂停课堂", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "模拟再试一次" }),
  ).toBeDisabled();
  await page
    .locator(".device-controls")
    .getByRole("button", { name: "继续课堂" })
    .click();
  await page.getByRole("button", { name: "模拟再试一次" }).click();
  await expect(page.locator(".demo-result")).toContainText(
    "不是对你发音的识别结果",
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { deviceRequests: number }).deviceRequests,
    ),
  ).toBe(0);
});

test("M2 parent report tabs and downloaded CSV retain mock labels and date", async ({
  page,
}) => {
  await openReady(page);
  await goToStage(page, 9);
  const report = page.getByRole("region", { name: "家长学习报告" });
  const contentBottom = await report
    .locator(".report-tab-content")
    .evaluate((element) => element.getBoundingClientRect().bottom);
  const footerTop = await report
    .locator(".report-bottom")
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(footerTop).toBeGreaterThanOrEqual(contentBottom);
  await report.getByRole("tab", { name: "学习数据", exact: true }).click();
  await expect(
    report.getByText("独立回答 · 模拟", { exact: true }),
  ).toBeVisible();
  await expect(report.locator(".report-metrics")).toContainText("8 次");
  await report.getByRole("tab", { name: "发音分析", exact: true }).click();
  await expect(report).toContainText("无真实发音评分");
  await report.getByRole("tab", { name: "课堂表现", exact: true }).click();
  await expect(report).toContainText("星星仅展示报告样式");
  await report.getByRole("tab", { name: "下节课建议", exact: true }).click();
  await expect(report).toContainText("间隔复习");
  const downloadPromise = page.waitForEvent("download");
  await report.getByRole("button", { name: "导出模拟报告" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "zaizai-animals-mock-report-2026-10-28.csv",
  );
  const content = await readFile((await download.path())!, "utf8");
  expect(content).toContain("模拟报告 / 非真实学习评估");
  expect(content).toContain("2026-10-28");
  for (const word of ["dog", "cat", "bird", "rabbit", "fish"])
    expect(content).toContain(`"${word}"`);
});

test("M2 archive trend selection, period and shared review marks work", async ({
  page,
}) => {
  await openReady(page);
  await goToStage(page, 10);
  const archive = page.getByRole("region", { name: "长期英语档案" });
  await archive.getByRole("button", { name: "10-01", exact: true }).click();
  await expect(archive.locator(".selected-session")).toContainText(
    "2026-10-01",
  );
  await archive.getByRole("button", { name: "近 3 次", exact: true }).click();
  await expect(archive.locator(".selected-session")).toContainText(
    "2026-10-28",
  );
  await expect(archive.locator(".chart-dates button")).toHaveCount(3);
  await archive.getByRole("button", { name: "10-15", exact: true }).click();
  await expect(archive.locator(".selected-session")).toContainText(
    "2026-10-15 · 模拟示例值 68",
  );
  await archive.getByRole("tab", { name: "发音成长", exact: true }).click();
  await expect(archive.locator(".selected-session")).toContainText(
    "模拟示例值 65",
  );
  await archive.getByRole("tab", { name: "错题与复习", exact: true }).click();
  const rabbit = archive
    .locator(".review-items>div")
    .filter({ hasText: "rabbit" });
  await rabbit.getByRole("button", { name: "标记复习", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "单词本", exact: true })
    .click();
  const word = page
    .getByRole("dialog")
    .locator(".word-book-grid article")
    .filter({ hasText: "rabbit" });
  await expect(
    word.getByRole("button", { name: "已标记复习" }),
  ).toHaveAttribute("aria-pressed", "true");
  await word.getByRole("button", { name: "已标记复习" }).click();
  await page.keyboard.press("Escape");
  await expect(
    rabbit.getByRole("button", { name: "标记复习", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("M2 selected historical session opens and exports its own report date", async ({
  page,
}) => {
  await openReady(page);
  await goToStage(page, 10);
  await page.getByRole("tab", { name: "课堂记录", exact: true }).click();
  await page
    .locator(".archive-history-row")
    .filter({ hasText: "2026-10-08" })
    .getByRole("button", { name: "查看模拟报告" })
    .click();
  await expect(page.locator(".report-heading")).toContainText("2026-10-08");
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出模拟报告" }).click();
  expect((await promise).suggestedFilename()).toContain("2026-10-08");
});

test("M2 materials register metadata, reject unsupported types and never upload files", async ({
  page,
}) => {
  await openReady(page);
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" || request.method() === "PUT")
      uploads.push(request.url());
  });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "课程", exact: true })
    .click();
  await page.getByLabel("选择教材文件").setInputFiles([
    {
      name: "school-animals.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 mock file; must not be parsed"),
    },
    {
      name: "unsupported.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a supported material"),
    },
  ]);
  await expect(page.locator(".library-message")).toContainText(
    "1 个文件已在本页登记，未上传、未解析",
  );
  await expect(page.locator(".material-list")).not.toContainText(
    "unsupported.txt",
  );
  await page.getByRole("textbox", { name: "搜索资料" }).fill("school-animals");
  await expect(page.locator(".material-row")).toHaveCount(1);
  await page.getByRole("button", { name: "查看信息", exact: true }).click();
  await expect(page.locator(".material-preview")).toContainText(
    "没有读取文件正文、上传文件或解析教材",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "课程", exact: true })
    .click();
  await expect(page.locator(".material-list")).toContainText(
    "school-animals.pdf",
  );
  await page
    .getByRole("button", { name: "移除资料 school-animals.pdf", exact: true })
    .click();
  await expect(page.locator(".material-list")).not.toContainText(
    "school-animals.pdf",
  );
  expect(uploads).toEqual([]);
});

test("M2 word book distinguishes current click mistakes from mock learning records", async ({
  page,
}) => {
  await openExercise(page);
  await page.getByRole("button", { name: "选择 cat", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "错题本", exact: true })
    .click();
  await expect(page.locator(".mistake-row")).toHaveCount(1);
  await expect(page.locator(".mistake-row")).toContainText("目标 dog");
  await expect(page.locator(".mistake-row")).toContainText("选了 cat");
  await page.getByRole("button", { name: "待复习示例", exact: true }).click();
  await expect(page.locator(".word-book-grid article")).toHaveCount(2);
  await page.getByRole("button", { name: "去课堂复习", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Which animal can fly?" }),
  ).toBeVisible();
});

test("M2 paused navigation cannot bypass the classroom guard through the header", async ({
  page,
}) => {
  await openExercise(page);
  await page.getByRole("button", { name: "暂停课堂", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "学习报告", exact: true })
    .click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "4",
  );
  await expect(page.locator(".toast")).toContainText("请先继续课堂");
});

for (const [width, height] of [
  [1280, 800],
  [1440, 900],
  [1920, 1080],
  [390, 844],
]) {
  test(`M2 all 11 states keep the classroom frame usable at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await openReady(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (let index = 0; index < 11; index++) {
      if (index) await goToStage(page, index);
      await waitForArtwork(page);
      await expect(page.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        String(index + 1),
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      if (width >= 1280) {
        expect(
          await page.evaluate(() => document.documentElement.scrollHeight),
        ).toBeLessThanOrEqual(height);
        const horizontalOverflow = await page
          .locator(
            ".lesson-toolbar,.activity-card,.parent-report,.learning-archive,.question-line",
          )
          .evaluateAll((nodes) =>
            nodes.some((node) => node.scrollWidth > node.clientWidth + 1),
          );
        expect(
          horizontalOverflow,
          `Stage ${index + 1} has horizontal overflow`,
        ).toBe(false);
      }
      if (width === 1280 && [0, 4, 9, 10].includes(index))
        await page.screenshot({
          path: `screenshots/m2/tablet-stage-${index + 1}.png`,
          fullPage: true,
          animations: "disabled",
        });
    }
    expect(errors).toEqual([]);
  });
}
