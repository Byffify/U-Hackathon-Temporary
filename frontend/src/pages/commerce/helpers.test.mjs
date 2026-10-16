import test from "node:test";
import assert from "node:assert/strict";
import {
  archiveError,
  priceText,
  priceUnits,
  safeReturn,
  walletError,
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
  assert.match(walletError({ code: "CHALLENGE_INVALID" }).message, /cookie/);
  const failure = new Error("Service unavailable");
  assert.equal(walletError(failure), failure);
});

test("image uploads enforce real image metadata", () => {
  assert.match(imageError({ type: "application/zip", size: 10 }), /PNG/);
  assert.match(
    imageError({ type: "image/png", size: 5 * 1024 * 1024 + 1 }),
    /5 MB/,
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
      method === "eth_chainId" ? "0xa0c08" : (++sends, "0xtransaction"),
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

test("purchase intent deposits missing funds, signs typed data, and retries confirmation safely", async () => {
  const records = new Map();
  const storage = {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value),
    removeItem: (key) => records.delete(key),
  };
  const buyer = `0x${"34".repeat(20)}`;
  const contract = `0x${"12".repeat(20)}`;
  const signature = `0x${"ab".repeat(65)}`;
  const hash = `0x${"cd".repeat(32)}`;
  const methods = [];
  const provider = {
    request: async ({ method, params }) => {
      methods.push(method);
      if (method === "eth_chainId") return "0xa0c08";
      if (method === "eth_requestAccounts") return [buyer];
      if (method === "eth_sendTransaction") {
        assert.equal(params[0].value, "0x3c");
        return hash;
      }
      if (method === "eth_getTransactionReceipt") return { status: "0x1" };
      if (method === "eth_signTypedData_v4") return signature;
      throw new Error(`Unexpected wallet method ${method}`);
    },
  };
  let attempts = 0;
  const service = {
    call: async (operation, payload) => {
      assert.equal(operation, "purchases.confirm");
      assert.equal(payload.result, signature);
      if (++attempts === 1) throw new Error("Network interrupted");
      return { id: "intent-1", status: "confirmed" };
    },
  };
  const purchase = {
    id: "intent-1",
    authorization: {
      domain: { chainId: 658440, verifyingContract: contract },
      message: { buyer, price: "100" },
    },
    funding: {
      balance_wei: "40",
      deposit_transaction: {
        chain_id: 658440,
        to: contract,
        data: "0xd0e30db0",
      },
    },
    walletRequest: {
      method: "eth_signTypedData_v4",
      params: [buyer, "{}"],
    },
  };
  await assert.rejects(
    finishWalletPurchase({ purchase, provider, service, storage }),
    /Network interrupted/,
  );
  assert.equal(
    methods.filter((method) => method === "eth_sendTransaction").length,
    1,
  );
  const result = await finishWalletPurchase({
    purchase,
    provider,
    service,
    storage,
  });
  assert.equal(result.status, "confirmed");
  assert.equal(
    methods.filter((method) => method === "eth_sendTransaction").length,
    1,
  );
  assert.equal(
    methods.filter((method) => method === "eth_signTypedData_v4").length,
    1,
  );
  assert.equal(paymentReceipt(storage, "intent-1"), null);
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
