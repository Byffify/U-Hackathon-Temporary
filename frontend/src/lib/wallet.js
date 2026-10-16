import {
  CHAIN_ID,
  CHAIN_ID_HEX,
  CHAIN_RPC_URL,
  NATIVE_TOKEN_SYMBOL,
  NETWORK_NAME,
} from "./network.js";

async function ensureWalletNetwork(provider) {
  if (Number(await provider.request({ method: "eth_chainId" })) === CHAIN_ID)
    return;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (error) {
    if (error?.code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: CHAIN_ID_HEX,
          chainName: NETWORK_NAME,
          rpcUrls: [CHAIN_RPC_URL],
          nativeCurrency: {
            name: NATIVE_TOKEN_SYMBOL,
            symbol: NATIVE_TOKEN_SYMBOL,
            decimals: 18,
          },
        },
      ],
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  }
  if (Number(await provider.request({ method: "eth_chainId" })) !== CHAIN_ID) {
    const error = new Error(
      `Switch your wallet to ${NETWORK_NAME} (chain ${CHAIN_ID}).`,
    );
    error.code = "WRONG_NETWORK";
    throw error;
  }
}

/** Requests address access only: this is not a backend login or a payment. */
export async function connectBrowserWallet(provider = globalThis.ethereum) {
  if (!provider?.request) {
    const error = new Error(
      "No browser wallet found. Open this page in a browser with Core or MetaMask installed, then try again.",
    );
    error.code = "WALLET_UNAVAILABLE";
    throw error;
  }
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts?.length) throw new Error("No account was selected.");
  return accounts[0];
}

export async function signInWithWallet(
  service,
  provider = globalThis.ethereum,
) {
  const address = await connectBrowserWallet(provider);
  await ensureWalletNetwork(provider);
  const chainId = CHAIN_ID_HEX;
  const challenge = await service.call("auth.challenge", { address, chainId });
  if (!challenge?.id || typeof challenge.message !== "string")
    throw new Error("The sign-in challenge is invalid. Try again.");
  const hexMessage = Array.from(
    new TextEncoder().encode(challenge.message),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const signature = await provider.request({
    method: "personal_sign",
    params: [`0x${hexMessage}`, address],
  });
  if (!/^0x[0-9a-fA-F]{130}$/.test(signature))
    throw new Error("The wallet returned an invalid signature. Try again.");
  const currentAccounts = await provider.request({ method: "eth_accounts" });
  if (
    !currentAccounts?.some(
      (account) => account.toLowerCase() === address.toLowerCase(),
    )
  )
    throw new Error("The selected wallet changed. Connect again to retry.");
  return service.call("auth.verify", {
    challengeId: challenge.id,
    signature,
  });
}

export function walletErrorMessage(error) {
  if (error.code === "WALLET_UNAVAILABLE") return error.message;
  if (error.code === 4001)
    return "Connection was declined. You can try again when you’re ready.";
  return "Connection failed. Check your wallet and try again.";
}

// keccak256 of ListingCreated(uint256,address,uint256,bytes32).
const LISTING_CREATED_TOPIC =
  "0x20dbedde9b1788c58cedd25f7d6da06117594afa3671625aab02d5ad1cac76f5";
// keccak256 of ListingUpdated(uint256,uint256,bytes32).
const LISTING_UPDATED_TOPIC =
  "0x89dfd0ffe03945838ade72c4fcc0c4682890e303189bb83c5d5b75985acc9e21";

function listingFromReceipt(receipt, contract, address, existingId) {
  if (BigInt(receipt?.status ?? 0) !== 1n)
    throw new Error(`The listing transaction failed on ${NETWORK_NAME}.`);
  const eventTopic = existingId ? LISTING_UPDATED_TOPIC : LISTING_CREATED_TOPIC;
  const event = receipt.logs?.find(
    (log) =>
      log.address?.toLowerCase() === contract.toLowerCase() &&
      log.topics?.[0]?.toLowerCase() === eventTopic,
  );
  if (!event || !/^0x[0-9a-fA-F]{64}$/.test(event.topics[1] || ""))
    throw new Error("The wallet receipt has no matching listing event.");
  const listingId = BigInt(event.topics[1]).toString();
  if (listingId === "0" || (existingId && listingId !== String(existingId)))
    throw new Error("The wallet receipt belongs to a different listing.");
  if (
    !existingId &&
    event.topics[2]?.slice(-40).toLowerCase() !== address.slice(2).toLowerCase()
  )
    throw new Error("The wallet receipt belongs to a different creator.");
  return listingId;
}

export async function publishProjectWithWallet({
  service,
  provider,
  storage,
  project,
  address,
}) {
  if (!provider?.request)
    throw new Error(
      "Open this page in a browser with Core or MetaMask to publish.",
    );
  await ensureWalletNetwork(provider);
  const selected = await connectBrowserWallet(provider);
  if (!address || selected.toLowerCase() !== address.toLowerCase())
    throw new Error("Connect the wallet that owns this project to publish.");
  if (!project?.id || !project.terms_hash || !project.price_wei)
    throw new Error("Save the project draft before publishing.");

  const key = `utopia:listing:${project.id}`;
  const fingerprint = [
    project.id,
    project.terms_hash,
    project.price_wei,
    address.toLowerCase(),
    String(project.chain_listing_id || ""),
  ].join(":");
  let pending;
  try {
    pending = JSON.parse(storage.getItem(key) || "null");
  } catch {
    throw new Error("The saved listing transaction could not be read.");
  }
  if (pending && pending.fingerprint !== fingerprint) {
    storage.removeItem(key);
    pending = null;
  }
  if (!pending) {
    const tx = await service.call("projects.chainTransaction", {
      id: project.id,
    });
    if (
      Number(tx?.chain_id) !== CHAIN_ID ||
      !/^0x[0-9a-fA-F]{40}$/.test(tx.to || "") ||
      !/^0x[0-9a-fA-F]+$/.test(tx.data || "")
    )
      throw new Error("The backend returned an invalid listing transaction.");
    // Verify recovery storage before asking the wallet to send a transaction.
    storage.setItem(`${key}:probe`, "ready");
    storage.removeItem(`${key}:probe`);
    const hash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: selected,
          to: tx.to,
          data: tx.data,
          value: `0x${BigInt(tx.value).toString(16)}`,
        },
      ],
    });
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash || ""))
      throw new Error("The wallet returned an invalid transaction hash.");
    pending = { hash, contract: tx.to, fingerprint };
    storage.setItem(key, JSON.stringify(pending));
  }

  let receipt;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [pending.hash],
    });
    if (receipt) break;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  if (!receipt)
    throw new Error(
      "The L1 transaction is still pending. Try publishing again shortly.",
    );
  let chainListingId;
  try {
    chainListingId = listingFromReceipt(
      receipt,
      pending.contract,
      selected,
      project.chain_listing_id,
    );
  } catch (error) {
    if (BigInt(receipt.status ?? 0) !== 1n) storage.removeItem(key);
    throw error;
  }
  const published = await service.call("projects.publish", {
    id: project.id,
    chainListingId,
  });
  storage.removeItem(key);
  return published;
}
