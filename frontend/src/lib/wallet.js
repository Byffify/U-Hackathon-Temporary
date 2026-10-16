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
  const chainId = await provider.request({ method: "eth_chainId" });
  if (Number(chainId) !== 43113) {
    const error = new Error(
      "Switch your wallet to Avalanche Fuji, then connect again.",
    );
    error.code = "WRONG_NETWORK";
    throw error;
  }
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
