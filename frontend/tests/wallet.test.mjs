import test from "node:test";
import assert from "node:assert/strict";
import {
  connectBrowserWallet,
  signInWithWallet,
  publishProjectWithWallet,
  walletErrorMessage,
} from "../src/lib/wallet.js";

test("wallet requests an account only after an explicit connect action", async () => {
  const methods = [];
  const address = "0x1111111111111111111111111111111111111111";
  const provider = {
    request: async ({ method }) => {
      methods.push(method);
      return [address];
    },
  };
  assert.equal(await connectBrowserWallet(provider), address);
  assert.deepEqual(methods, ["eth_requestAccounts"]);
});

test("missing and declined wallet access have actionable messages", async () => {
  await assert.rejects(connectBrowserWallet(null), (error) =>
    walletErrorMessage(error).includes("Core or MetaMask"),
  );
  const provider = {
    request: async () => {
      throw { code: 4001 };
    },
  };
  await assert.rejects(connectBrowserWallet(provider), (error) =>
    walletErrorMessage(error).includes("declined"),
  );
});

test("wallet sign-in signs the exact backend challenge and verifies it", async () => {
  const address = "0x1111111111111111111111111111111111111111";
  const signature = `0x${"ab".repeat(65)}`;
  const challenge = { id: "challenge-1", message: "Sign in to KEEPHUB 🌱" };
  const calls = [];
  const provider = {
    request: async (request) => {
      calls.push(request);
      if (request.method === "eth_requestAccounts") return [address];
      if (request.method === "eth_chainId") return "0xa0c08";
      if (request.method === "personal_sign") return signature;
      if (request.method === "eth_accounts") return [address];
      throw new Error(`Unexpected wallet method: ${request.method}`);
    },
  };
  const serviceCalls = [];
  const service = {
    call: async (operation, payload) => {
      serviceCalls.push({ operation, payload });
      return operation === "auth.challenge" ? challenge : { id: "user-1" };
    },
  };
  assert.deepEqual(await signInWithWallet(service, provider), { id: "user-1" });
  assert.deepEqual(
    calls.map(({ method }) => method),
    ["eth_requestAccounts", "eth_chainId", "personal_sign", "eth_accounts"],
  );
  assert.deepEqual(calls[2].params, [
    `0x${Buffer.from(challenge.message, "utf8").toString("hex")}`,
    address,
  ]);
  assert.deepEqual(serviceCalls, [
    { operation: "auth.challenge", payload: { address, chainId: "0xa0c08" } },
    {
      operation: "auth.verify",
      payload: { challengeId: challenge.id, signature },
    },
  ]);
});

test("wallet sign-in stops before verification on the wrong network or changed account", async () => {
  const address = "0x1111111111111111111111111111111111111111";
  const otherAddress = "0x2222222222222222222222222222222222222222";
  const serviceCalls = [];
  const service = {
    call: async (operation) => {
      serviceCalls.push(operation);
      return { id: "challenge-1", message: "Sign in" };
    },
  };
  const wrongNetwork = {
    request: async ({ method }) =>
      method === "eth_requestAccounts" ? [address] : "0x1",
  };
  await assert.rejects(signInWithWallet(service, wrongNetwork), {
    code: "WRONG_NETWORK",
  });
  assert.deepEqual(serviceCalls, []);
  const changedAccount = {
    request: async ({ method }) => {
      if (method === "eth_requestAccounts") return [address];
      if (method === "eth_chainId") return "0xa0c08";
      if (method === "personal_sign") return `0x${"ab".repeat(65)}`;
      if (method === "eth_accounts") return [otherAddress];
      throw new Error(`Unexpected wallet method: ${method}`);
    },
  };
  await assert.rejects(
    signInWithWallet(service, changedAccount),
    /selected wallet changed/,
  );
  assert.deepEqual(serviceCalls, ["auth.challenge"]);
});

test("publishing adds and switches to the configured L1 before preparing a listing", async () => {
  const address = "0x1111111111111111111111111111111111111111";
  const methods = [];
  let chainId = "0x1";
  let added = false;
  const provider = {
    request: async ({ method, params }) => {
      methods.push(method);
      if (method === "eth_chainId") return chainId;
      if (method === "wallet_switchEthereumChain") {
        assert.equal(params[0].chainId, "0xa0c08");
        if (!added) throw { code: 4902 };
        chainId = params[0].chainId;
        return null;
      }
      if (method === "wallet_addEthereumChain") {
        assert.equal(params[0].nativeCurrency.symbol, "PINEM");
        assert.equal(params[0].chainId, "0xa0c08");
        added = true;
        return null;
      }
      if (method === "eth_requestAccounts") return [address];
      throw new Error(`Unexpected wallet method: ${method}`);
    },
  };
  await assert.rejects(
    publishProjectWithWallet({
      service: {
        call: async (operation) => {
          assert.equal(operation, "projects.chainTransaction");
          throw new Error("Reached chain transaction preparation");
        },
      },
      provider,
      storage: { getItem: () => null },
      address,
      project: {
        id: "project-1",
        terms_hash: `0x${"cd".repeat(32)}`,
        price_wei: "100",
      },
    }),
    /Reached chain transaction preparation/,
  );
  assert.deepEqual(methods, [
    "eth_chainId",
    "wallet_switchEthereumChain",
    "wallet_addEthereumChain",
    "wallet_switchEthereumChain",
    "eth_chainId",
    "eth_requestAccounts",
  ]);
});

test("publish creates an L1 listing and retries API publication without another transaction", async () => {
  const address = "0x1111111111111111111111111111111111111111";
  const contract = "0x2222222222222222222222222222222222222222";
  const hash = `0x${"ab".repeat(32)}`;
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
  let sends = 0;
  const provider = {
    request: async ({ method, params }) => {
      if (method === "eth_chainId") return "0xa0c08";
      if (method === "eth_requestAccounts") return [address];
      if (method === "eth_sendTransaction") {
        sends += 1;
        assert.equal(params[0].to, contract);
        return hash;
      }
      if (method === "eth_getTransactionReceipt")
        return {
          status: "0x1",
          logs: [
            {
              address: contract,
              topics: [
                "0x20dbedde9b1788c58cedd25f7d6da06117594afa3671625aab02d5ad1cac76f5",
                `0x${7n.toString(16).padStart(64, "0")}`,
                `0x${address.slice(2).padStart(64, "0")}`,
              ],
            },
          ],
        };
      throw new Error(`Unexpected wallet method: ${method}`);
    },
  };
  let publishAttempts = 0;
  const service = {
    call: async (operation, payload) => {
      if (operation === "projects.chainTransaction") {
        assert.deepEqual(payload, { id: "project-1" });
        return { chain_id: 658440, to: contract, data: "0x1234", value: "0" };
      }
      assert.equal(operation, "projects.publish");
      assert.deepEqual(payload, { id: "project-1", chainListingId: "7" });
      publishAttempts += 1;
      if (publishAttempts === 1) throw new Error("Network interrupted");
      return { id: "project-1", published: true };
    },
  };
  const request = {
    service,
    provider,
    storage,
    address,
    project: {
      id: "project-1",
      terms_hash: `0x${"cd".repeat(32)}`,
      price_wei: "100",
      chain_listing_id: null,
    },
  };
  await assert.rejects(
    publishProjectWithWallet(request),
    /Network interrupted/,
  );
  assert.equal(sends, 1);
  assert.equal((await publishProjectWithWallet(request)).published, true);
  assert.equal(sends, 1);
  assert.equal(data.size, 0);
});

test("publishing stops before a chain transaction on the wrong network", async () => {
  let called = false;
  await assert.rejects(
    publishProjectWithWallet({
      service: { call: async () => (called = true) },
      provider: { request: async () => "0x1" },
      storage: { getItem: () => null },
      address: "0x1111111111111111111111111111111111111111",
      project: { id: "project-1" },
    }),
    /Avalanche L1/,
  );
  assert.equal(called, false);
});
