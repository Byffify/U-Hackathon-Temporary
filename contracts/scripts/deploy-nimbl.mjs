import { readFile } from "node:fs/promises";
import { ethers } from "ethers";

const RPC_URL = "https://nodes-prod.43.207.73.245.sslip.io/ext/bc/2BypykXr6eM22uoNFNV6fNcDHQJrN5fUQG5CjbjjQzPYZzjZXh/rpc";
const { NIMBL_RPC_URL = RPC_URL, DEPLOYER_PRIVATE_KEY, PLATFORM_ADDRESS, SPONSOR_ADDRESS } = process.env;
if (!DEPLOYER_PRIVATE_KEY || !PLATFORM_ADDRESS || !SPONSOR_ADDRESS) {
  throw new Error("Set DEPLOYER_PRIVATE_KEY, PLATFORM_ADDRESS, and SPONSOR_ADDRESS in the environment.");
}
if (!ethers.isAddress(PLATFORM_ADDRESS) || !ethers.isAddress(SPONSOR_ADDRESS)) {
  throw new Error("PLATFORM_ADDRESS and SPONSOR_ADDRESS must be valid EVM addresses.");
}
const provider = new ethers.JsonRpcProvider(NIMBL_RPC_URL);
const network = await provider.getNetwork();
if (network.chainId !== 174511n) throw new Error(`Expected NIMBL test chain 174511, got ${network.chainId}.`);
const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
if ((await provider.getBalance(deployer.address)) === 0n) throw new Error("Deployer has no NIMBL for deployment gas.");
const artifact = JSON.parse(await readFile(new URL("../artifacts/UTopiaMarketplace.json", import.meta.url), "utf8"));
const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
const contract = await factory.deploy(PLATFORM_ADDRESS, SPONSOR_ADDRESS);
const receipt = await contract.deploymentTransaction().wait();
console.log(JSON.stringify({ chainId: 174511, address: await contract.getAddress(), transactionHash: receipt.hash }, null, 2));
