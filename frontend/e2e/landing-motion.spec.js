import { test, expect } from "@playwright/test";
test("sections slide up into place and slide away again reversibly with native scrolling", async ({
  page,
}) => {
  await page.goto("/");
  const anchor = page
    .locator("[data-landing-slide]")
    .filter({ has: page.locator("#creators") });
  await expect(anchor).toHaveCount(1);
  const position = await anchor.evaluate(
    (el) => el.getBoundingClientRect().top + scrollY,
  );
  await page.evaluate((top) => scrollTo(0, top - innerHeight * 0.85), position);
  const section = page.locator("#creators");
  await expect
    .poll(() =>
      section.evaluate((el) =>
        parseFloat(getComputedStyle(el).translate.split(" ").at(-1)),
      ),
    )
    .toBeGreaterThan(5);
  await page.evaluate((top) => scrollTo(0, top - innerHeight * 0.15), position);
  await expect
    .poll(() => section.evaluate((el) => getComputedStyle(el).translate))
    .toBe("0px");
  const end = await anchor.evaluate(
    (el) => el.getBoundingClientRect().bottom + scrollY,
  );
  await page.evaluate((bottom) => scrollTo(0, bottom - innerHeight * 0.2), end);
  await expect
    .poll(() =>
      section.evaluate((el) =>
        parseFloat(getComputedStyle(el).translate.split(" ").at(-1)),
      ),
    )
    .toBeLessThan(-5);
  await page.evaluate((top) => scrollTo(0, top - innerHeight * 0.15), position);
  await expect
    .poll(() => section.evaluate((el) => getComputedStyle(el).translate))
    .toBe("0px");
  await page.evaluate((top) => scrollTo(0, top - innerHeight * 0.85), position);
  await expect
    .poll(() =>
      section.evaluate((el) =>
        parseFloat(getComputedStyle(el).translate.split(" ").at(-1)),
      ),
    )
    .toBeGreaterThan(5);
});
test("hero artwork follows scrolling and navigation cancels section motion", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.locator(".hero-flora");
  await expect
    .poll(() =>
      card.evaluate((el) =>
        el.getAnimations().some((a) => a.id === "landing-orbit-hero-flora"),
      ),
    )
    .toBe(true);
  const initial = await card.evaluate((el) => getComputedStyle(el).translate);
  await page.evaluate(() => window.scrollTo(0, 320));
  await expect
    .poll(() => card.evaluate((el) => getComputedStyle(el).translate))
    .not.toBe(initial);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator(".creator-cover").scrollIntoViewIfNeeded();
  expect(
    await page
      .locator(".creator-cover")
      .evaluate((el) => el.getAnimations().length),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Explore projects", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/explore/);
  expect(
    await page.evaluate(() =>
      document.getAnimations().some((a) => a.id.startsWith("landing-")),
    ),
  ).toBe(false);
});
test("focused controls stay stable while their section scrolls", async ({
  page,
}) => {
  await page.goto("/");
  const tab = page.getByRole("tab", { name: /Frontend/ });
  await tab.focus();
  await page.evaluate(() => scrollBy(0, 300));
  await expect
    .poll(() =>
      page
        .locator("#creators")
        .evaluate((el) => getComputedStyle(el).translate),
    )
    .toBe("0px");
  await expect(tab).toBeFocused();
});
test("reduced motion cancels enhancements, including a preference change mid-page", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getAnimations().filter((a) => a.id.startsWith("landing-"))
            .length,
      ),
    )
    .toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getAnimations().filter((a) => a.id.startsWith("landing-"))
            .length,
      ),
    )
    .toBe(0);
  await page.reload();
  await page.locator(".creator-cover").scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () =>
        document.getAnimations().filter((a) => a.id.startsWith("landing-"))
          .length,
    ),
  ).toBe(0);
  await expect(
    page.getByRole("heading", { name: /More than a link/ }),
  ).toBeVisible();
});
test("mobile motion stays bounded and keeps the original layout usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 300));
  for (const selector of [
    ".creator-cover",
    ".fee-sticker",
    ".mini-profile",
    ".final-doodle",
  ]) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "artifacts/landing-motion-mobile.png",
    fullPage: true,
  });
});
