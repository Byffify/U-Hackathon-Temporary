import { readFileSync, mkdirSync, mkdtempSync } from "node:fs";
import path from "node:path";
import ganache from "ganache";
import { ethers } from "ethers";
import { readMarketplaceSnapshot } from "../../frontend/src/lib/marketplace.js";

mkdirSync(".test-data", { recursive: true });
const dbPath = mkdtempSync(path.resolve(".test-data", "bridge-"));
const injected = ganache.provider({ logging: { quiet: true }, chain: { chainId: 174511 }, database: { dbPath } });
const provider = new ethers.BrowserProvider(injected);
const key = Object.values(injected.getInitialAccounts())[0].secretKey;
const signer = new ethers.Wallet(key, provider);
const artifact = JSON.parse(readFileSync("artifacts/UTopiaMarketplace.json", "utf8"));
const market = await new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer).deploy(signer.address, signer.address);
await market.waitForDeployment();
const snapshot = await readMarketplaceSnapshot({ injected, account: signer.address, contractAddress: await market.getAddress() });
if (snapshot.address !== await market.getAddress() || snapshot.rights !== "0" || snapshot.deposit !== "0.0")
  throw new Error("Frontend contract read did not match deployed contract state.");
console.log("Frontend read verified against a locally deployed Solidity contract.");
