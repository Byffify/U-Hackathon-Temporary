import { test, expect } from "@playwright/test";
async function login(page, account = "buyer") {
  await page.goto("/connect");
  await page.getByRole("button", { name: `Continue as ${account}` }).click();
  await expect(page).toHaveURL(/\/library/);
}
test("public discovery search, details, profile and 404 are connected", async ({
  page,
}) => {
  await page.goto("/explore");
  await expect(
    page.getByRole("heading", { name: "Find your next starting point." }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("Flora");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=Flora/);
  await expect(page.locator(".app-project-card")).toHaveCount(1);
  await page
    .getByRole("link", { name: "Flora storefront", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Flora storefront", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".app-large-price")).toBeVisible();
  await page.getByRole("link", { name: "By Maya Chen" }).click();
  await expect(
    page.getByRole("heading", { name: "Maya Chen", exact: true }),
  ).toBeVisible();
  await page.goto("/missing");
  await expect(
    page.getByRole("heading", { name: "This page is still a blank canvas." }),
  ).toBeVisible();
});
test("login redirect, library unavailable download and completed purchase recover on refresh", async ({
  page,
}) => {
  await page.goto("/checkout/flora");
  await expect(page).toHaveURL(/\/connect\?returnTo=/);
  await page.getByRole("button", { name: "Continue as creator" }).click();
  await expect(page).toHaveURL(/\/checkout\/flora/);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirm demo purchase" }).click();
  await expect(
    page.getByRole("heading", { name: "Your project is ready" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your project is ready" }),
  ).toBeVisible();
  await page.goto("/library");
  await page
    .getByRole("link", { name: /View source and license/ })
    .first()
    .click();
  await page.getByRole("button", { name: /Prepare source download/ }).click();
  await expect(
    page
      .getByText(
        /No source archive is available|no source archive is stored|unavailable|not included|no source ZIP/i,
      )
      .first(),
  ).toBeVisible();
});
test("creator uploads, publishes and adds a release without buying again", async ({
  page,
}) => {
  await login(page, "creator");
  await page.goto("/workspace/projects/creator-demo/edit");
  await page
    .getByLabel("Demo URL", { exact: true })
    .fill("https://example.com");
  await page.getByLabel(/^Source ZIP/).setInputFiles({
    name: "source.zip",
    mimeType: "application/zip",
    buffer: Buffer.from("PK sample fixture"),
  });
  await page.getByRole("button", { name: "Upload source ZIP" }).click();
  await expect(
    page.getByRole("button", { name: "Publish project", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Publish project", exact: true })
    .click();
  await expect(page).toHaveURL(/\/workspace\/projects$/);
  await page.goto("/workspace/projects/creator-demo/releases/new");
  await page.getByLabel(/^Version/).fill("1.1.0");
  await page.getByLabel("Release notes").fill("Updated the example.");
  await page.getByLabel("Updated source ZIP").setInputFiles({
    name: "update.zip",
    mimeType: "application/zip",
    buffer: Buffer.from("PK update fixture"),
  });
  await page.getByRole("button", { name: /Publish release/ }).click();
  await expect(page).toHaveURL(/\/workspace\/projects$/);
});
test("unsaved profile changes require an explicit navigation choice", async ({
  page,
}) => {
  await login(page);
  await page.goto("/settings/profile");
  await page.getByLabel("Display name").fill("Unsaved Name");
  await page
    .getByRole("link", { name: "My library", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page).toHaveURL(/\/settings\/profile/);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.", { exact: true })).toBeVisible();
});
test("Gemini requires quote and explicit confirmation, supports three sources and persists chat", async ({
  page,
}) => {
  await login(page);
  await page.goto("/gemini");
  await page.getByLabel("Conversation name").fill("Three source idea");
  await page.getByRole("button", { name: "Start conversation" }).click();
  await expect(page).toHaveURL(/\/gemini\/chats\//);
  const sources = page
    .getByRole("group", { name: "Available source releases" })
    .getByRole("checkbox");
  await expect(sources).toHaveCount(3);
  for (let i = 0; i < 3; i++) await sources.nth(i).check();
  await page.getByLabel(/Target stack/).fill("React + Node.js");
  await page.getByLabel(/What should/).fill("Combine the selected features.");
  await page.getByRole("button", { name: /Check analysis quota/ }).click();
  await page
    .getByRole("button", { name: /Use 2 quota to review a plan/ })
    .click();
  await expect(
    page.getByRole("heading", { name: /Review plan/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm plan and simulate generation" })
    .click();
  await expect(page.getByText(/simulated/i).last()).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Three source idea" }),
  ).toBeVisible();
  await page
    .getByLabel("What should this project do?")
    .fill("Combine the features and improve navigation.");
  await page.getByRole("button", { name: "Check analysis quota" }).click();
  await page
    .getByRole("button", { name: "Use 2 quota to review a plan" })
    .click();
  await page.reload();
  const confirm = page.getByRole("button", {
    name: "Confirm plan and simulate generation",
  });
  await expect(confirm).toBeEnabled();
  await page.getByLabel("Ask or explain").fill("Also improve accessibility.");
  await expect(confirm).toBeDisabled();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(confirm).toBeDisabled();
});
test("mobile workspace drawer supports keyboard dismissal and navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await login(page);
  await page.getByRole("button", { name: "Open workspace menu" }).click();
  await expect(
    page.getByRole("dialog", { name: "Workspace navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Workspace navigation" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Open workspace menu" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Gemini", exact: true })
    .click();
  await expect(page).toHaveURL(/\/gemini$/);
  await expect(
    page.getByRole("dialog", { name: "Workspace navigation" }),
  ).toBeHidden();
});
test("resale transfers one entitlement while other library projects remain", async ({
  page,
}) => {
  await login(page);
  await page.goto("/library/ent-buyer-flora");
  await page.getByLabel("Resale price in test AVAX").fill("0.4");
  await page.getByRole("button", { name: "Create resale offer" }).click();
  const offerUrl = await page
    .getByRole("link", { name: "View resale offer" })
    .getAttribute("href");
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "creator");
  await page.goto(offerUrl);
  await page.getByRole("link", { name: "Review purchase" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirm demo purchase" }).click();
  await expect(
    page.getByRole("heading", { name: "Your project is ready" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Orbit dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Flora storefront", exact: true }),
  ).toHaveCount(0);
  await page.goto("/library/ent-buyer-flora");
  await expect(page.getByRole("alert")).toContainText(
    "This license is not available to this account.",
  );
});
for (const width of [320, 768, 1440])
  test(`routes render without overflow or runtime errors at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await login(page);
    for (const path of [
      "/",
      "/explore",
      "/projects/flora",
      "/creators/maya",
      "/library",
      "/library/ent-buyer-flora",
      "/settings/profile",
      "/workspace/projects",
      "/workspace/projects/new",
      "/gemini",
      "/checkout/orbit",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(
        page.getByText(/Loading|Checking your session/).first(),
      ).toBeHidden();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        path,
      ).toBe(true);
    }
    expect(errors).toEqual([]);
    await page.goto("/explore");
    await page.screenshot({
      path: `artifacts/explore-${width}.png`,
      fullPage: true,
    });
    await page.goto("/library");
    await page.screenshot({
      path: `artifacts/library-${width}.png`,
      fullPage: true,
    });
    await page.goto("/gemini");
    await page.getByRole("button", { name: "Start conversation" }).click();
    await expect(
      page.getByRole("group", { name: "Available source releases" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/gemini-${width}.png`,
      fullPage: true,
    });
  });
