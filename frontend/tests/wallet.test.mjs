import test from "node:test";
import assert from "node:assert/strict";
import { connectBrowserWallet, walletErrorMessage } from "../src/lib/wallet.js";

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
