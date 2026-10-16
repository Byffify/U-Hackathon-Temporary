import { formatAvax, splitSale } from "../../utils/pricing.js";
import { CHAIN_ID } from "../../lib/network.js";

export const priceText = (units = "0") => formatAvax(BigInt(units));
export function priceUnits(value) {
  const { total } = splitSale(value);
  if (total <= 0n) throw new Error("Enter a price greater than zero.");
  return String(total);
}
export function archiveError(file) {
  if (!file) return "Choose a source ZIP archive.";
  if (!file.name.toLowerCase().endsWith(".zip")) return "Choose a ZIP archive.";
  if (!file.size)
    return "The archive is empty. Choose a ZIP containing your source.";
  if (file.size > 100 * 1024 * 1024)
    return "The archive must be 100 MB or smaller.";
  return null;
}
export function safeReturn(value) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/library";
}
export function walletError(error) {
  if (error?.code === "CHALLENGE_INVALID")
    return new Error(
      "Wallet sign-in expired or its browser cookie was blocked. Refresh the page and try again.",
    );
  return error?.code === 4001
    ? new Error(
        "The wallet request was declined. Try again when you are ready.",
      )
    : error;
}
export function safeDownloadUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return ["https:", "http:", "blob:"].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function imageError(file) {
  if (!file) return "Choose a screenshot image.";
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    return "Choose a PNG, JPEG, or WebP image.";
  if (!file.size || file.size > 5 * 1024 * 1024)
    return "Choose a nonempty image up to 5 MB.";
  return null;
}

export function paymentReceipt(storage, id) {
  const raw = storage.getItem(`utopia:payment:${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      "The saved payment response could not be read. Check purchase status before trying again.",
    );
  }
}

export function assertPurchaseBinding(
  purchase,
  { projectId, offerId = null, purchaseId },
) {
  if (!purchase || purchase.projectId !== projectId)
    throw new Error("This purchase belongs to another project.");
  if ((purchase.offerId || null) !== (offerId || null))
    throw new Error("This purchase belongs to another offer.");
  if (!purchase.id || (purchaseId && purchase.id !== purchaseId))
    throw new Error(
      "The service returned a different purchase. Check your purchase status.",
    );
  return purchase;
}

async function fundPurchase({ purchase, provider, storage }) {
  const authorization = purchase.authorization;
  const price = BigInt(authorization.message.price);
  const balance = BigInt(purchase.funding?.balance_wei ?? 0);
  if (balance >= price) return;
  const transaction = purchase.funding?.deposit_transaction;
  if (
    Number(transaction?.chain_id) !== CHAIN_ID ||
    transaction.to?.toLowerCase() !==
      authorization.domain?.verifyingContract?.toLowerCase() ||
    !/^0x[0-9a-fA-F]*$/.test(transaction.data || "")
  )
    throw new Error("The backend returned an invalid deposit transaction.");
  const key = `utopia:deposit:${purchase.id}`;
  let deposit;
  try {
    deposit = JSON.parse(storage.getItem(key) || "null");
  } catch {
    throw new Error("The saved deposit transaction could not be read.");
  }
  if (deposit?.confirmed) return;
  if (!deposit) {
    storage.setItem("utopia:payment:probe", "ready");
    storage.removeItem("utopia:payment:probe");
    const hash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: authorization.message.buyer,
          to: transaction.to,
          data: transaction.data,
          value: `0x${(price - balance).toString(16)}`,
        },
      ],
    });
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash || ""))
      throw new Error(
        "The wallet returned an invalid deposit transaction hash.",
      );
    deposit = { hash };
    storage.setItem(key, JSON.stringify(deposit));
  }
  let receipt;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [deposit.hash],
    });
    if (receipt) break;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  if (!receipt)
    throw new Error(
      "Your deposit is still pending. Continue this purchase shortly.",
    );
  if (BigInt(receipt.status ?? 0) !== 1n)
    throw new Error("The deposit transaction failed. Check your wallet.");
  storage.setItem(key, JSON.stringify({ ...deposit, confirmed: true }));
}

export async function finishWalletPurchase({
  purchase,
  provider,
  service,
  storage,
  onReceipt,
}) {
  let receipt = paymentReceipt(storage, purchase.id);
  if (!receipt) {
    if (!provider?.request)
      throw new Error("Open your wallet to complete this purchase.");
    if (!purchase.walletRequest)
      throw new Error("Check purchase status to recover the payment request.");
    // Verify recovery storage before opening a consequential wallet request.
    storage.setItem("utopia:payment:probe", "ready");
    storage.removeItem("utopia:payment:probe");
    const chainId = await provider.request({ method: "eth_chainId" });
    if (Number(chainId) !== CHAIN_ID)
      throw new Error("Switch your wallet to Avalanche L1 to continue.");
    if (purchase.authorization) {
      const buyer = purchase.authorization.message?.buyer;
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      if (
        Number(purchase.authorization.domain?.chainId) !== CHAIN_ID ||
        !buyer ||
        !Array.isArray(accounts) ||
        accounts[0]?.toLowerCase() !== buyer.toLowerCase()
      )
        throw new Error(
          "Connect the buyer wallet on Avalanche L1 to continue.",
        );
      await fundPurchase({ purchase, provider, storage });
    }
    const result = await provider.request(purchase.walletRequest);
    if (purchase.authorization && !/^0x[0-9a-fA-F]{130}$/.test(result || ""))
      throw new Error("The wallet returned an invalid purchase signature.");
    receipt = { result };
    storage.setItem(`utopia:payment:${purchase.id}`, JSON.stringify(receipt));
  }
  onReceipt?.();
  const result = await service.call("purchases.confirm", {
    id: purchase.id,
    result: receipt.result,
  });
  if (result.status === "confirmed")
    storage.removeItem(`utopia:payment:${purchase.id}`);
  if (result.status === "confirmed")
    storage.removeItem(`utopia:deposit:${purchase.id}`);
  return result;
}
