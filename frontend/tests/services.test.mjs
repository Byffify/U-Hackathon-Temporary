import test from "node:test";
import assert from "node:assert/strict";
import { createService } from "../src/services/index.js";
const memory = () => {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  };
};
test("demo session and library persist across service instances without archive bytes", async () => {
  const storage = memory(),
    s = createService({ storage });
  assert.equal(await s.call("auth.session"), null);
  await assert.rejects(s.call("library.list"), { code: "UNAUTHENTICATED" });
  await s.call("auth.demoLogin", { account: "buyer" });
  assert.equal((await s.call("library.list")).length, 3);
  assert.equal(
    (await createService({ storage }).call("auth.session")).id,
    "buyer",
  );
  assert.equal(
    (await s.call("library.download", { id: "ent-buyer-flora" })).unavailable,
    true,
  );
});
test("resale transfers only the selected entitlement and preserves purchased terms", async () => {
  const s = createService({ storage: memory() });
  await s.call("auth.demoLogin", { account: "buyer" });
  const offer = await s.call("resales.create", {
    entitlementId: "ent-buyer-flora",
    priceUnits: "200000000000000000",
  });
  await assert.rejects(
    s.call("resales.create", {
      entitlementId: "ent-buyer-flora",
      priceUnits: "200000000000000000",
    }),
    { code: "OFFER_EXISTS" },
  );
  await s.call("auth.demoLogin", { account: "creator" });
  const purchase = await s.call("purchases.create", {
    projectId: "flora",
    offerId: offer.id,
    idempotencyKey: "transfer-1",
  });
  assert.deepEqual(
    await s.call("purchases.create", {
      projectId: "flora",
      offerId: offer.id,
      idempotencyKey: "transfer-1",
    }),
    purchase,
  );
  const held = await s.call("library.get", { id: purchase.entitlementId });
  assert.equal(held.resaleAllowed, true);
  assert.equal((await s.call("resales.get", { id: offer.id })).status, "sold");
  await s.call("auth.demoLogin", { account: "buyer" });
  assert.equal((await s.call("library.list")).length, 2);
  await assert.rejects(s.call("library.download", { id: held.id }), {
    code: "FORBIDDEN",
  });
});
test("listing ownership, validated upload metadata, and publishing are enforced", async () => {
  const storage = memory(),
    s = createService({ storage });
  await s.call("auth.demoLogin", { account: "buyer" });
  await assert.rejects(
    s.call("projects.save", { id: "creator-demo", title: "stolen" }),
    { code: "FORBIDDEN" },
  );
  await assert.rejects(
    s.call("projects.save", {
      demoUrl: "javascript:alert(1)",
      priceUnits: "500000000000000000",
    }),
    { code: "INVALID_URL" },
  );
  await s.call("auth.demoLogin", { account: "creator" });
  await assert.rejects(s.call("projects.publish", { id: "creator-demo" }), {
    code: "INCOMPLETE_PROJECT",
  });
  await s.call("projects.save", {
    id: "creator-demo",
    title: "Starter",
    priceUnits: "100000000000000000",
  });
  await s.call("projects.upload", {
    projectId: "creator-demo",
    file: { name: "starter.zip", size: 20, secretBytes: "NEVER_STORE_THIS" },
  });
  const project = await s.call("projects.publish", { id: "creator-demo" });
  assert.equal(project.status, "published");
  assert.equal(
    storage.getItem("utopia.demo.v1").includes("NEVER_STORE_THIS"),
    false,
  );
  await s.call("auth.demoLogin", { account: "buyer" });
  const purchase = await s.call("purchases.create", {
    projectId: project.id,
    idempotencyKey: "buy-1",
  });
  await assert.rejects(
    s.call("purchases.create", {
      projectId: project.id,
      idempotencyKey: "buy-2",
    }),
    { code: "ALREADY_OWNED" },
  );
  await s.call("auth.demoLogin", { account: "creator" });
  await s.call("projects.save", {
    id: project.id,
    resaleAllowed: false,
    license: "Changed listing terms",
  });
  await s.call("auth.demoLogin", { account: "buyer" });
  assert.equal(
    (await s.call("library.get", { id: purchase.entitlementId })).resaleAllowed,
    true,
  );
  const offer = await s.call("resales.create", {
    entitlementId: purchase.entitlementId,
    priceUnits: "10",
  });
  const resale = await s.call("resales.get", { id: offer.id });
  assert.equal(resale.terms.resaleAllowed, true);
  assert.notEqual(resale.terms.license, resale.project.license);
});
test("API uses authenticated requests, structured errors, and never falls back to fixtures", async () => {
  const calls = [],
    s = createService({
      mode: "api",
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [],
            meta: { page: 1, page_size: 20, total: 0 },
          }),
        };
      },
    });
  await s.call("projects.list", { q: "cart & search" });
  assert.equal(calls[0].url, "/api/v1/projects?q=cart+%26+search");
  assert.equal(calls[0].options.credentials, "include");
  const failing = createService({
    mode: "api",
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: "EXPIRED", message: "Session expired" },
      }),
    }),
  });
  await assert.rejects(failing.call("auth.session"), {
    code: "EXPIRED",
    message: "Session expired",
  });
  const offline = createService({
    mode: "api",
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });
  await assert.rejects(offline.call("projects.list"), {
    code: "NETWORK_ERROR",
  });
  await assert.rejects(s.call("library.download", { id: "a" }), {
    code: "INVALID_REQUEST",
  });
});

test("API auth and profiles follow the delivered backend contract", async () => {
  const calls = [];
  const s = createService({
    mode: "api",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const result = url.endsWith("/auth/session")
        ? {
            user: {
              id: "user-1",
              address: "0x1111111111111111111111111111111111111111",
            },
            csrf_token: "csrf-1",
          }
        : url.endsWith("/auth/challenges")
          ? { id: "challenge-1", message: "Sign in to KEEPHUB" }
          : url.endsWith("/auth/verify")
            ? {
                user: {
                  id: "user-1",
                  address: "0x1111111111111111111111111111111111111111",
                },
                csrf_token: "csrf-1",
              }
            : url.endsWith("/me/profile") || url.endsWith("/creators/creator-1")
              ? {
                  id: "user-1",
                  name: "Creator",
                  bio: "Maker",
                  avatar_url: "https://example.test/avatar.png",
                }
              : { logged_out: true };
      return { ok: true, status: 200, json: async () => ({ data: result }) };
    },
  });
  assert.equal((await s.call("auth.session")).id, "user-1");
  assert.equal(
    (
      await s.call("auth.challenge", {
        address: "0x1111111111111111111111111111111111111111",
        chainId: "0xa0c08",
      })
    ).id,
    "challenge-1",
  );
  await s.call("auth.verify", {
    challengeId: "challenge-1",
    address: "0x1111111111111111111111111111111111111111",
    signature: "0xsignature",
  });
  assert.equal(
    (await s.call("profiles.get")).avatarUrl,
    "https://example.test/avatar.png",
  );
  await s.call("profiles.update", {
    name: "Creator",
    bio: "Maker",
    avatarUrl: "https://example.test/avatar.png",
  });
  await s.call("profiles.get", { id: "creator-1" });
  await s.call("auth.logout");
  assert.equal(calls[1].url, "/api/v1/auth/challenges");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    address: "0x1111111111111111111111111111111111111111",
    chain_id: 658440,
  });
  assert.deepEqual(JSON.parse(calls[2].options.body), {
    challenge_id: "challenge-1",
    signature: "0xsignature",
  });
  assert.equal(calls[3].url, "/api/v1/me/profile");
  assert.equal(calls[4].options.headers["X-CSRF-Token"], "csrf-1");
  assert.deepEqual(JSON.parse(calls[4].options.body), {
    name: "Creator",
    bio: "Maker",
    avatar_url: "https://example.test/avatar.png",
  });
  assert.equal(calls[5].url, "/api/v1/creators/creator-1");
  assert.equal(calls[6].options.headers["X-CSRF-Token"], "csrf-1");
});

test("API Explore maps published project data, media and pagination", async () => {
  const calls = [];
  const project = {
    id: "project-1",
    creator_id: "creator-1",
    creator_name: "Jane",
    title: "A storefront",
    description: "Products and cart",
    stack: "React",
    demo_url: "https://example.test/demo",
    price_wei: "500000000000000000",
    license_terms: "Use and modify",
    resale_allowed: true,
    derivative_allowed: false,
    published: true,
    images: ["/api/v1/media/image-1"],
  };
  const s = createService({
    mode: "api",
    baseUrl: "https://api.example.test/api/v1",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: url.includes("/projects/") ? { ...project } : [project],
          meta: { page: 2, page_size: 20, total: 21 },
        }),
      };
    },
  });
  const list = await s.call("projects.list", {
    q: "cart",
    stack: "React",
    page: 2,
    creatorId: "creator-1",
  });
  assert.equal(
    calls[0].url,
    "https://api.example.test/api/v1/projects?q=cart&stack=React&page=2&creator_id=creator-1",
  );
  assert.equal(calls[0].options.credentials, "include");
  assert.deepEqual(
    { total: list.total, page: list.page, pageSize: list.pageSize },
    { total: 21, page: 2, pageSize: 20 },
  );
  assert.equal(list.items[0].creator, "Jane");
  assert.equal(list.items[0].priceUnits, project.price_wei);
  assert.equal(
    list.items[0].screenshots[0],
    "https://api.example.test/api/v1/media/image-1",
  );
  const detail = await s.call("projects.get", { id: "project-1" });
  assert.equal(detail.creatorId, "creator-1");
  assert.equal(detail.license, "Use and modify");
});

test("API Explore fetches only published backend projects", async () => {
  const calls = [];
  const project = {
    id: "project-1",
    creator_id: "creator-1",
    creator_name: "Creator",
    title: "Published storefront",
    description: "A storefront",
    stack: "React",
    price_wei: "500000000000000000",
    license_terms: "Preview only",
    published: true,
    images: [],
  };
  const service = createService({
    mode: "api",
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        status: 200,
        json: async () =>
          url.includes("/project-1")
            ? { data: project }
            : {
                data: [project],
                meta: { page: 1, page_size: 20, total: 1, stacks: ["React"] },
              },
      };
    },
  });
  const list = await service.call("explore.list", { q: "storefront" });
  assert.equal(calls[0], "/api/v1/projects?q=storefront");
  assert.equal(list.items[0].isExample, false);
  assert.equal(list.items[0].status, "published");
  assert.deepEqual(list.stacks, ["React"]);
  assert.equal(
    (await service.call("explore.get", { id: "project-1" })).title,
    "Published storefront",
  );
  assert.equal(calls[1], "/api/v1/projects/project-1");
});

test("an unauthenticated initial API session is a signed-out state", async () => {
  const s = createService({
    mode: "api",
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: "UNAUTHENTICATED", message: "Sign in" },
      }),
    }),
  });
  assert.equal(await s.call("auth.session"), null);
});
test("Gemini API operations use chatId and allow standalone external source import", async () => {
  const calls = [],
    s = createService({
      mode: "api",
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return { ok: true, status: 200, json: async () => ({ data: {} }) };
      },
    });
  await s.call("gemini.get", { chatId: "chat-1" });
  assert.equal(calls[0].url, "/api/v1/gemini/sessions/chat-1");
  await s.call("gemini.import", {
    url: "https://example.com/project.zip",
    license: "MIT",
  });
  assert.equal(calls[1].url, "/api/v1/gemini/import");
});
test("prices use integer smallest units and creator profiles are public", async () => {
  const s = createService({ storage: memory() });
  assert.equal(
    (await s.call("projects.get", { id: "flora" })).priceUnits,
    "500000000000000000",
  );
  assert.equal(
    (await s.call("profiles.get", { id: "maya" })).name,
    "Maya Chen",
  );
  await s.call("auth.demoLogin", { account: "creator" });
  await assert.rejects(
    s.call("projects.save", { id: "creator-demo", priceUnits: "0.5" }),
    { code: "INVALID_PRICE" },
  );
  assert.equal(
    (await s.call("projects.save", { id: "creator-demo", priceUnits: "123" }))
      .priceUnits,
    "123",
  );
});

test("API project screenshot upload saves backend fields without image URLs", async () => {
  const requests = [];
  const s = createService({
    mode: "api",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        status: 201,
        json: async () =>
          url.endsWith("/auth/verify")
            ? { data: { csrf_token: "csrf", user: { id: "creator" } } }
            : url.endsWith("/images")
              ? { data: { id: "image-1", url: "/api/v1/media/image-1" } }
              : { data: { id: "project-1" } },
      };
    },
  });
  await s.call("auth.verify", {
    challengeId: "challenge",
    signature: "signed",
  });
  await s.call("projects.save", {
    title: "Demo",
    description: "Screenshot test",
    stack: ["React", "Vite"],
    demoUrl: "https://example.com",
    priceUnits: "10000000000000000",
    license: "Personal use",
    resaleAllowed: false,
    derivativeAllowed: false,
    screenshots: [],
  });
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    title: "Demo",
    description: "Screenshot test",
    stack: "React, Vite",
    demo_url: "https://example.com",
    price_wei: "10000000000000000",
    license_terms: "Personal use",
    resale_allowed: false,
    derivative_allowed: false,
  });
  const file = new Blob(["image"], { type: "image/png" });
  await s.call("images.upload", { projectId: "project-1", file });
  assert.equal(requests[2].url, "/api/v1/projects/project-1/images");
  assert.equal(requests[2].options.headers["X-CSRF-Token"], "csrf");
  assert.equal(requests[2].options.body.get("file").type, "image/png");
  assert.equal(requests[2].options.body.get("file").size, file.size);
  await s.call("projects.save", { id: "project-1", demoUrl: "" });
  assert.deepEqual(JSON.parse(requests[3].options.body), { demo_url: null });
});

test("API screenshot uploads resolve media URLs against the backend origin", async () => {
  const service = createService({
    mode: "api",
    baseUrl: "https://backend.example.test/api/v1",
    fetchImpl: async () => ({
      ok: true,
      status: 201,
      json: async () => ({
        data: { id: "image-1", url: "/api/v1/media/image-1" },
      }),
    }),
  });
  const uploaded = await service.call("images.upload", {
    projectId: "project-1",
    file: new Blob(["image"], { type: "image/png" }),
  });
  assert.equal(
    uploaded.url,
    "https://backend.example.test/api/v1/media/image-1",
  );
});

test("API purchase follows purchase-intent routes and sends the confirm idempotency key", async () => {
  const requests = [];
  const authorization = {
    primaryType: "Purchase",
    domain: { chainId: 658440, verifyingContract: `0x${"12".repeat(20)}` },
    message: { buyer: `0x${"34".repeat(20)}`, price: "100" },
    types: {},
  };
  const service = createService({
    mode: "api",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: "intent-1",
            project_id: "project-1",
            status: "pending",
            authorization,
            funding: { balance_wei: "0" },
          },
        }),
      };
    },
  });
  const intent = await service.call("purchases.create", {
    projectId: "project-1",
    idempotencyKey: "create-1",
  });
  assert.equal(requests[0].url, "/api/v1/purchase-intents");
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    project_id: "project-1",
  });
  assert.equal(requests[0].options.headers["Idempotency-Key"], "create-1");
  assert.equal(intent.projectId, "project-1");
  assert.equal(intent.walletRequest.method, "eth_signTypedData_v4");
  await service.call("purchases.confirm", {
    id: "intent-1",
    result: `0x${"ab".repeat(65)}`,
  });
  assert.equal(requests[1].url, "/api/v1/purchase-intents/intent-1/confirm");
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    signature: `0x${"ab".repeat(65)}`,
  });
  assert.equal(requests[1].options.headers["Idempotency-Key"], "intent-1");
});

test("API source ZIP upload uses the backend release route and required metadata", async () => {
  const requests = [];
  const s = createService({
    mode: "api",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        status: 201,
        json: async () => ({ data: { id: "release-1", version: "1.0.0" } }),
      };
    },
  });
  const file = new Blob(["source"], { type: "application/zip" });
  await s.call("projects.upload", {
    projectId: "dbb58595-ac46-4eb2-9f85-e9a196c4ca48",
    file,
    version: "1.0.0",
    idempotencyKey: "upload-1",
  });
  assert.equal(
    requests[0].url,
    "/api/v1/projects/dbb58595-ac46-4eb2-9f85-e9a196c4ca48/releases",
  );
  assert.equal(requests[0].options.body.get("version"), "1.0.0");
  assert.equal(requests[0].options.headers["Idempotency-Key"], "upload-1");
});

test("API workspace retrieves saved drafts from the creator endpoint", async () => {
  const requests = [];
  const draft = {
    id: "saved-draft",
    creator_id: "creator-1",
    title: "Saved project",
    description: "Work in progress",
    stack: "React",
    demo_url: null,
    price_wei: "10000000000000000",
    license_terms: "Personal use",
    resale_allowed: false,
    derivative_allowed: false,
    published: false,
  };
  const s = createService({
    mode: "api",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [draft] }),
      };
    },
  });
  const result = await s.call("projects.list", { mine: true, page: 1 });
  assert.equal(requests[0].url, "/api/v1/me/projects");
  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, "saved-draft");
  assert.equal(result.items[0].status, "draft");
});

test("API library reads the buyer entitlement endpoint and maps project names", async () => {
  const requests = [];
  const s = createService({
    mode: "api",
    fetchImpl: async (url) => {
      requests.push(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: "7",
              project_id: "project-1",
              project_title: "Published portfolio",
              resale_allowed: false,
              derivative_allowed: true,
            },
          ],
        }),
      };
    },
  });
  const rights = await s.call("library.list");
  assert.deepEqual(requests, ["/api/v1/me/entitlements"]);
  assert.equal(rights[0].projectId, "project-1");
  assert.equal(rights[0].title, "Published portfolio");
  assert.equal(rights[0].derivativeAllowed, true);
});

test("API library detail loads its project and release and links to the protected ZIP", async () => {
  const requests = [];
  const s = createService({
    mode: "api",
    fetchImpl: async (url) => {
      requests.push(url);
      const data = url.endsWith("/entitlements/7")
        ? {
            id: "7",
            project_id: "project-1",
            project_title: "Published portfolio",
            resale_allowed: false,
            derivative_allowed: true,
          }
        : url.endsWith("/projects/project-1/releases")
          ? [{ id: "release-1", version: "1.0.0" }]
          : {
              id: "project-1",
              title: "Published portfolio",
              description: "Portfolio source",
              stack: "React",
              price_wei: "100",
              license_terms: "Use and modify",
              published: true,
            };
      return { ok: true, status: 200, json: async () => ({ data }) };
    },
  });
  const entitlement = await s.call("library.get", { id: "7" });
  assert.deepEqual(requests, [
    "/api/v1/entitlements/7",
    "/api/v1/projects/project-1",
    "/api/v1/projects/project-1/releases",
  ]);
  assert.equal(entitlement.project.title, "Published portfolio");
  assert.equal(entitlement.project.latestReleaseId, "release-1");
  assert.deepEqual(
    await s.call("library.download", { id: "7", releaseId: "release-1" }),
    {
      url: "/api/v1/entitlements/7/releases/release-1/download",
      filename: "source.zip",
    },
  );
  assert.equal(requests.length, 3);
});

test("API publish sends the required chain listing id", async () => {
  const requests = [];
  const s = createService({
    mode: "api",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () =>
          url.endsWith("/releases")
            ? { data: [{ id: "release-1" }] }
            : { data: {} },
      };
    },
  });
  const releases = await s.call("projects.releases", { id: "project-1" });
  assert.equal(releases[0].id, "release-1");
  await s.call("projects.chainTransaction", { id: "project-1" });
  await s.call("projects.publish", {
    id: "project-1",
    chainListingId: "7",
  });
  assert.equal(requests[0].url, "/api/v1/projects/project-1/releases");
  assert.equal(requests[1].url, "/api/v1/projects/project-1/chain-transaction");
  assert.equal(requests[2].url, "/api/v1/projects/project-1/publish");
  assert.deepEqual(JSON.parse(requests[2].options.body), {
    chain_listing_id: "7",
  });
});

test("API 401 dispatches the session-expired event", async () => {
  const previous = globalThis.window,
    target = new EventTarget();
  let expired = 0;
  target.addEventListener("utopia:unauthorized", () => expired++);
  globalThis.window = target;
  try {
    const s = createService({
      mode: "api",
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        json: async () => ({
          error: { code: "UNAUTHENTICATED", message: "Expired" },
        }),
      }),
    });
    assert.equal(await s.call("auth.session"), null);
    assert.equal(expired, 0);
    await assert.rejects(s.call("library.list"), { code: "UNAUTHENTICATED" });
    assert.equal(expired, 1);
    const unstructured = createService({
      mode: "api",
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        json: async () => {
          throw new Error("HTML response");
        },
      }),
    });
    await assert.rejects(unstructured.call("library.list"), {
      code: "HTTP_401",
    });
    assert.equal(expired, 2);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
test("demo confirms purchases and rejects unverified derivative drafts", async () => {
  const s = createService({ storage: memory() });
  await s.call("auth.demoLogin", { account: "creator" });
  const purchase = await s.call("purchases.create", {
    projectId: "flora",
    idempotencyKey: "confirm-test",
  });
  assert.equal(purchase.status, "confirmed");
  assert.equal(
    (await s.call("purchases.confirm", { id: purchase.id })).status,
    "confirmed",
  );
  await assert.rejects(
    s.call("projects.save", {
      title: "Pretend generated source",
      outputRef: "other-users-job",
    }),
    { code: "OUTPUT_UNAVAILABLE" },
  );
});
test("new releases require a fresh owned upload and screenshot metadata stores no bytes", async () => {
  const s = createService({ storage: memory() });
  await s.call("auth.demoLogin", { account: "creator" });
  await s.call("projects.upload", {
    projectId: "creator-demo",
    file: { name: "first.zip", size: 10 },
  });
  await s.call("projects.publish", { id: "creator-demo" });
  await assert.rejects(
    s.call("projects.release", { id: "creator-demo", version: "2.0.0" }),
    { code: "NEW_ARCHIVE_REQUIRED" },
  );
  const image = await s.call("images.upload", {
    projectId: "creator-demo",
    file: { name: "screen.png", type: "image/png", size: 100 },
  });
  assert.equal(image.mime, "image/png");
  assert.equal(
    (await s.call("projects.get", { id: "creator-demo" })).images.length,
    1,
  );
});
