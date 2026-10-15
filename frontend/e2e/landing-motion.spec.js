import { test, expect } from "@playwright/test";
test("hero word width expands and contracts with the displayed word and reduced motion stays static", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Your work deserves a next chapter.",
  );
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    const window = page.locator(".hero-word-window");
    const widths = [];
    for (const time of [500, 3500, 6500, 9500]) {
      await page.evaluate((time) => {
        for (const animation of document
          .getAnimations()
          .filter((a) =>
            ["landing-word-loop", "landing-word-width"].includes(a.id),
          )) {
          animation.pause();
          animation.currentTime = time;
        }
      }, time);
      widths.push((await window.boundingBox()).width);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect(widths[2]).toBeGreaterThan(widths[0] + 10);
    expect(widths[3]).toBeLessThan(widths[2]);
    await page.evaluate(() => {
      for (const animation of document
        .getAnimations()
        .filter((a) =>
          ["landing-word-loop", "landing-word-width"].includes(a.id),
        )) {
        animation.currentTime = 5800;
      }
    });
    const middle = (await window.boundingBox()).width;
    expect(middle).toBeGreaterThan(widths[1]);
    expect(middle).toBeLessThan(widths[2]);
    await page.screenshot({ path: `artifacts/hero-words-${width}.png` });
  }
  expect(
    await page
      .locator(".highlight-word svg")
      .evaluate((el) => el.getAnimations()[0].effect.getTiming().iterations),
  ).toBe(Infinity);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page
        .locator(".hero-word-track")
        .evaluate((el) => el.getAnimations().length),
    )
    .toBe(0);
  await expect(page.locator(".hero-word-track")).toHaveCSS("transform", "none");
});
test("desktop panels pin after their content and the next panel covers them reversibly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const panels = page.locator("[data-landing-slide]");
  const first = panels.nth(0);
  const next = panels.nth(1);
  await expect(first).toHaveCSS("position", "sticky");
  const height = await first.evaluate((el) => el.offsetHeight);
  await page.evaluate(
    (y) => scrollTo({ top: y, behavior: "instant" }),
    height - 200,
  );
  await expect
    .poll(() =>
      first.evaluate((el) => Math.round(el.getBoundingClientRect().top)),
    )
    .toBe(Math.round(Math.min(88, 900 - height)));
  const before = await next.evaluate((el) => el.getBoundingClientRect().top);
  await page.evaluate(() => scrollBy({ top: 150, behavior: "instant" }));
  expect(
    await next.evaluate((el) => el.getBoundingClientRect().top),
  ).toBeLessThan(before);
  await expect
    .poll(() =>
      first
        .locator(":scope > *")
        .evaluate((el) => parseFloat(getComputedStyle(el).filter.slice(5))),
    )
    .toBeGreaterThan(0);
  await expect(next.locator(":scope > *")).toHaveCSS("filter", "none");
  await page.screenshot({ path: "artifacts/landing-stack-desktop.png" });
  await page.keyboard.press("Tab");
  await expect(first).toHaveCSS("position", "static");
  await expect(first.locator(":scope > *")).toHaveCSS("filter", "none");
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect
    .poll(() =>
      first.evaluate((el) => Math.round(el.getBoundingClientRect().top)),
    )
    .toBeGreaterThanOrEqual(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(first).toHaveCSS("position", "static");
  expect(await first.evaluate((el) => el.style.top)).toBe("");
  expect(await first.evaluate((el) => el.style.zIndex)).toBe("");
  await expect(first.locator(":scope > *")).toHaveCSS("filter", "none");
});
test("sections slide up into place and slide away again reversibly with native scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
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
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page
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
  await page.setViewportSize({ width: 768, height: 900 });
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
