import { readFile } from "node:fs/promises";
import { ethers } from "ethers";

const { FUJI_RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc", DEPLOYER_PRIVATE_KEY, PLATFORM_ADDRESS, SPONSOR_ADDRESS } = process.env;
if (!DEPLOYER_PRIVATE_KEY || !PLATFORM_ADDRESS || !SPONSOR_ADDRESS) {
  throw new Error("Set DEPLOYER_PRIVATE_KEY, PLATFORM_ADDRESS, and SPONSOR_ADDRESS in the environment.");
}
if (!ethers.isAddress(PLATFORM_ADDRESS) || !ethers.isAddress(SPONSOR_ADDRESS)) {
  throw new Error("PLATFORM_ADDRESS and SPONSOR_ADDRESS must be valid EVM addresses.");
}
const provider = new ethers.JsonRpcProvider(FUJI_RPC_URL);
async function readBeforeDeployment(request) {
  try {
    return await request();
  } catch (error) {
    const response = `${error?.info?.responseStatus ?? ""} ${error?.info?.responseBody ?? ""}`;
    if (response.includes("429") || response.includes("1015")) {
      throw new Error(
        "Fuji RPC is rate-limiting requests. No deployment transaction was sent. Wait and retry, or set FUJI_RPC_URL in contracts/.env to a Fuji RPC from another provider."
      );
    }
    throw error;
  }
}
const network = await readBeforeDeployment(() => provider.getNetwork());
if (network.chainId !== 43113n) throw new Error(`Expected Avalanche Fuji chain 43113, got ${network.chainId}.`);
const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
if ((await readBeforeDeployment(() => provider.getBalance(deployer.address))) === 0n) throw new Error("Deployer has no test AVAX for deployment gas.");
const artifact = JSON.parse(await readFile(new URL("../artifacts/UTopiaMarketplace.json", import.meta.url), "utf8"));
const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
const contract = await factory.deploy(PLATFORM_ADDRESS, SPONSOR_ADDRESS);
const receipt = await contract.deploymentTransaction().wait();
console.log(JSON.stringify({ chainId: 43113, address: await contract.getAddress(), transactionHash: receipt.hash }, null, 2));
