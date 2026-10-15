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
          json: async () => ({ data: { items: [], total: 0 } }),
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
  const unsafe = createService({
    mode: "api",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ url: "javascript:alert(1)" }),
    }),
  });
  await assert.rejects(unsafe.call("library.download", { id: "a" }), {
    code: "INVALID_URL",
  });
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
    await assert.rejects(s.call("auth.session"), { code: "UNAUTHENTICATED" });
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
