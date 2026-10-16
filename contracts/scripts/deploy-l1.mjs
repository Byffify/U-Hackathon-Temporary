import { readFile } from "node:fs/promises";
import { emitKeypressEvents } from "node:readline";
import { ethers } from "ethers";

const { CHAIN_ID, CHAIN_RPC_URL, DEPLOYER_PRIVATE_KEY, PLATFORM_ADDRESS, SPONSOR_ADDRESS } = process.env;
const required = { CHAIN_ID, CHAIN_RPC_URL, PLATFORM_ADDRESS, SPONSOR_ADDRESS };
const missing = Object.entries(required).filter(([, value]) => !value).map(([name]) => name);
if (missing.length) {
  throw new Error(`Missing deployment configuration: ${missing.join(", ")}. Fill contracts/.env before deploying.`);
}
if (!ethers.isAddress(PLATFORM_ADDRESS) || !ethers.isAddress(SPONSOR_ADDRESS)) {
  throw new Error("PLATFORM_ADDRESS and SPONSOR_ADDRESS must be valid EVM addresses.");
}
if (!/^\d+$/.test(CHAIN_ID) || BigInt(CHAIN_ID) === 0n) {
  throw new Error("CHAIN_ID must be a positive EVM chain ID.");
}

function promptForPrivateKey() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Run this command in an interactive terminal or set DEPLOYER_PRIVATE_KEY in the current shell.");
  }
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    const wasRaw = input.isRaw;
    let secret = "";
    function finish(error) {
      input.off("keypress", onKeypress);
      input.setRawMode(Boolean(wasRaw));
      input.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(secret.trim());
    }
    function onKeypress(character, key = {}) {
      if (key.ctrl && key.name === "c") return finish(new Error("Deployment cancelled."));
      if (key.name === "return" || key.name === "enter") return finish();
      if (key.name === "backspace" || key.name === "delete") {
        secret = secret.slice(0, -1);
        return;
      }
      if (!key.ctrl && !key.meta && !key.sequence?.startsWith("\u001b") && character) {
        secret += character;
      }
    }
    emitKeypressEvents(input);
    process.stdout.write("Deployer private key (input hidden): ");
    input.setRawMode(true);
    input.resume();
    input.on("keypress", onKeypress);
  });
}

let privateKey = DEPLOYER_PRIVATE_KEY || await promptForPrivateKey();
if (!/^(0x)?[0-9a-fA-F]{64}$/.test(privateKey)) {
  throw new Error("Deployer private key must be 32 bytes of hexadecimal. No transaction was sent.");
}
const expectedChainId = BigInt(CHAIN_ID);
const provider = new ethers.JsonRpcProvider(CHAIN_RPC_URL);
const network = await provider.getNetwork();
if (network.chainId !== expectedChainId) {
  throw new Error(`Expected chain ${expectedChainId}, got ${network.chainId}. No deployment transaction was sent.`);
}
const deployer = new ethers.Wallet(privateKey, provider);
privateKey = undefined;
if ((await provider.getBalance(deployer.address)) === 0n) {
  const symbol = process.env.NATIVE_TOKEN_SYMBOL || "native token";
  throw new Error(`Deployer ${deployer.address} has 0 ${symbol} on chain ${expectedChainId}. Send ${symbol} to this address on this L1 for deployment gas. No transaction was sent.`);
}
const artifact = JSON.parse(await readFile(new URL("../artifacts/UTopiaMarketplace.json", import.meta.url), "utf8"));
const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
const contract = await factory.deploy(PLATFORM_ADDRESS, SPONSOR_ADDRESS);
const receipt = await contract.deploymentTransaction().wait();
console.log(JSON.stringify({ chainId: Number(expectedChainId), address: await contract.getAddress(), transactionHash: receipt.hash }, null, 2));
