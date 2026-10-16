import { readFile } from "node:fs/promises";
import { ethers } from "ethers";

const { CHAIN_ID, CHAIN_RPC_URL, DEPLOYER_PRIVATE_KEY, PLATFORM_ADDRESS, SPONSOR_ADDRESS } = process.env;
if (!CHAIN_ID || !CHAIN_RPC_URL || !DEPLOYER_PRIVATE_KEY || !PLATFORM_ADDRESS || !SPONSOR_ADDRESS) {
  throw new Error("Set CHAIN_ID, CHAIN_RPC_URL, DEPLOYER_PRIVATE_KEY, PLATFORM_ADDRESS, and SPONSOR_ADDRESS.");
}
if (!ethers.isAddress(PLATFORM_ADDRESS) || !ethers.isAddress(SPONSOR_ADDRESS)) {
  throw new Error("PLATFORM_ADDRESS and SPONSOR_ADDRESS must be valid EVM addresses.");
}
if (!/^\d+$/.test(CHAIN_ID) || BigInt(CHAIN_ID) === 0n) {
  throw new Error("CHAIN_ID must be a positive EVM chain ID.");
}

const expectedChainId = BigInt(CHAIN_ID);
const provider = new ethers.JsonRpcProvider(CHAIN_RPC_URL);
const network = await provider.getNetwork();
if (network.chainId !== expectedChainId) {
  throw new Error(`Expected chain ${expectedChainId}, got ${network.chainId}. No deployment transaction was sent.`);
}
const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
if ((await provider.getBalance(deployer.address)) === 0n) {
  throw new Error("Deployer has no native token on this L1 for deployment gas.");
}
const artifact = JSON.parse(await readFile(new URL("../artifacts/UTopiaMarketplace.json", import.meta.url), "utf8"));
const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
const contract = await factory.deploy(PLATFORM_ADDRESS, SPONSOR_ADDRESS);
const receipt = await contract.deploymentTransaction().wait();
console.log(JSON.stringify({ chainId: Number(expectedChainId), address: await contract.getAddress(), transactionHash: receipt.hash }, null, 2));
