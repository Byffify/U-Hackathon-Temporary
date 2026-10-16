import test from "node:test";
import assert from "node:assert/strict";
import {
  connectBrowserWallet,
  signInWithWallet,
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
  const challenge = { id: "challenge-1", message: "Sign in to U-topia 🌱" };
  const calls = [];
  const provider = {
    request: async (request) => {
      calls.push(request);
      if (request.method === "eth_requestAccounts") return [address];
      if (request.method === "eth_chainId") return "0xa869";
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
    { operation: "auth.challenge", payload: { address, chainId: "0xa869" } },
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
      if (method === "eth_chainId") return "0xa869";
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
