import { expect, type Page } from "@playwright/test";

export async function goToStage(page: Page, index: number) {
  await page.getByRole("button", { name: "课程目录", exact: true }).click();
  await page.locator(".directory-list button").nth(index).click();
}

export async function waitForArtwork(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
}

export async function openReady(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome to our English class!" }),
  ).toBeVisible();
  await waitForArtwork(page);
}

export async function openExercise(page: Page) {
  await openReady(page);
  await goToStage(page, 3);
  await expect(
    page.getByRole("heading", { name: "Can you find the dog?" }),
  ).toBeVisible();
  await waitForArtwork(page);
}
