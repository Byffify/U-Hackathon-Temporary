import { test, expect } from "@playwright/test";
test("mobile license rows, total and standalone navigation use the existing readable scales", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/connect");
  await page.getByRole("button", { name: "Continue as creator" }).click();
  await page.goto("/checkout/flora");
  await expect(page.getByText("Total", { exact: true })).toBeVisible();
  const total = page.locator(".app-order-total .app-large-price");
  expect(
    await total.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(32);
  const terms = page
    .locator(".app-list-prose")
    .filter({ has: page.getByText("License terms", { exact: true }) });
  const label = await terms.locator("dt").boundingBox(),
    value = await terms.locator("dd").boundingBox();
  expect(label.width).toBeGreaterThan(150);
  expect(value.y).toBeGreaterThanOrEqual(label.y + label.height);
  expect(Math.abs(label.x - value.x)).toBeLessThan(2);
  for (const link of await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link")
    .all()) {
    const box = await link.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("creator links have full touch areas and desktop terms retain their existing order", async ({
  page,
}) => {
  await page.goto("/explore");
  for (const link of await page.locator(".app-creator-link").all())
    expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.goto("/connect");
  await page.getByRole("button", { name: "Continue as creator" }).click();
  await page.goto("/checkout/flora");
  expect(
    await page.locator(".app-list").first().locator("dt").allTextContents(),
  ).toEqual(["License resale", "Sell derivative work", "License terms"]);
});
