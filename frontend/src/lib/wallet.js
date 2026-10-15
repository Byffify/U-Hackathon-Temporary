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

export function walletErrorMessage(error) {
  if (error.code === "WALLET_UNAVAILABLE") return error.message;
  if (error.code === 4001)
    return "Connection was declined. You can try again when you’re ready.";
  return "Connection failed. Check your wallet and try again.";
}
