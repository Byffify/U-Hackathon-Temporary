import test from "node:test";
import assert from "node:assert/strict";
import {
  archiveError,
  priceText,
  priceUnits,
  safeReturn,
  walletError,
  screenshotUrl,
  imageError,
  paymentReceipt,
  finishWalletPurchase,
  assertPurchaseBinding,
} from "./helpers.js";

test("commerce prices preserve all 18 decimal places and reject zero", () => {
  assert.equal(priceUnits("0.000000000000000001"), "1");
  assert.equal(priceText("500000000000000000"), "0.5");
  assert.throws(() => priceUnits("0"), /greater than zero/);
  assert.throws(() => priceUnits("-1"));
  assert.throws(() => priceUnits("1.0000000000000000001"));
});

test("archive input requires a nonempty ZIP within the upload limit", () => {
  assert.match(archiveError(null), /Choose/);
  assert.match(archiveError({ name: "source.exe", size: 10 }), /ZIP/);
  assert.match(archiveError({ name: "source.zip", size: 0 }), /empty/);
  assert.match(
    archiveError({ name: "source.zip", size: 100 * 1024 * 1024 + 1 }),
    /100 MB/,
  );
  assert.equal(
    archiveError({ name: "SOURCE.ZIP", size: 100 * 1024 * 1024 }),
    null,
  );
});

test("sign-in return targets cannot escape the application", () => {
  assert.equal(
    safeReturn("/checkout/flora?offer=123"),
    "/checkout/flora?offer=123",
  );
  for (const value of [
    "//attacker.test",
    "https://attacker.test",
    "/\\attacker.test",
    null,
  ])
    assert.equal(safeReturn(value), "/library");
});

test("wallet declines include recovery while other failures retain their identity", () => {
  assert.match(walletError({ code: 4001 }).message, /declined/);
  const failure = new Error("Service unavailable");
  assert.equal(walletError(failure), failure);
});

test("screenshot previews require HTTPS and image uploads enforce real image metadata", () => {
  assert.equal(
    screenshotUrl("https://images.example.com/preview.png"),
    "https://images.example.com/preview.png",
  );
  for (const url of [
    "javascript:alert(1)",
    "http://example.com/a.png",
    "data:image/png;base64,aaaa",
    "/relative.png",
  ])
    assert.equal(screenshotUrl(url), null);
  assert.match(imageError({ type: "application/zip", size: 10 }), /PNG/);
  assert.match(
    imageError({ type: "image/png", size: 10 * 1024 * 1024 + 1 }),
    /10 MB/,
  );
  assert.equal(imageError({ type: "image/webp", size: 100 }), null);
});

test("payment confirmation retries reuse persisted wallet response without another transaction", async () => {
  const records = new Map();
  const storage = {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value),
    removeItem: (key) => records.delete(key),
  };
  let sends = 0;
  const provider = {
    request: async ({ method }) =>
      method === "eth_chainId" ? "0xa869" : (++sends, "0xtransaction"),
  };
  let confirmations = 0;
  const service = {
    call: async (operation, payload) => {
      assert.equal(operation, "purchases.confirm");
      assert.equal(payload.result, "0xtransaction");
      assert.equal(paymentReceipt(storage, "payment").result, "0xtransaction");
      if (++confirmations === 1) throw new Error("Network interrupted");
      return { id: "payment", status: "confirmed" };
    },
  };
  await assert.rejects(
    finishWalletPurchase({
      purchase: {
        id: "payment",
        walletRequest: { method: "eth_sendTransaction", params: [] },
      },
      provider,
      service,
      storage,
    }),
    /Network interrupted/,
  );
  const result = await finishWalletPurchase({
    purchase: { id: "payment" },
    provider: null,
    service,
    storage,
  });
  assert.equal(result.status, "confirmed");
  assert.equal(sends, 1);
  assert.equal(paymentReceipt(storage, "payment"), null);
});

test("checkout only accepts purchase status for its exact project, offer, and purchase reference", () => {
  const confirmed = {
    id: "purchase-b",
    projectId: "project-b",
    offerId: "offer-b",
    status: "confirmed",
  };
  assert.throws(
    () =>
      assertPurchaseBinding(confirmed, {
        projectId: "project-a",
        offerId: "offer-b",
        purchaseId: "purchase-b",
      }),
    /another project/,
  );
  assert.throws(
    () =>
      assertPurchaseBinding(confirmed, {
        projectId: "project-b",
        offerId: "offer-a",
        purchaseId: "purchase-b",
      }),
    /another offer/,
  );
  assert.throws(
    () =>
      assertPurchaseBinding(confirmed, {
        projectId: "project-b",
        offerId: "offer-b",
        purchaseId: "purchase-a",
      }),
    /different purchase/,
  );
  assert.equal(
    assertPurchaseBinding(confirmed, {
      projectId: "project-b",
      offerId: "offer-b",
      purchaseId: "purchase-b",
    }),
    confirmed,
  );
  assert.throws(
    () => assertPurchaseBinding(confirmed, { projectId: "project-b" }),
    /another offer/,
  );
  assert.equal(
    assertPurchaseBinding(
      { ...confirmed, offerId: null },
      { projectId: "project-b" },
    ).status,
    "confirmed",
  );
});
