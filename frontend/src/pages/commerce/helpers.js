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
    const result = await provider.request(purchase.walletRequest);
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
  return result;
}
