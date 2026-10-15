// Disposable local-only integration fixture. These generated keys never leave this test process/files.
import fs from 'node:fs/promises';
import ganache from 'ganache';
import { ethers } from 'ethers';
const server = ganache.server({logging:{quiet:true}, chain:{chainId:43113,hardfork:'shanghai'}});
await server.listen(18545, '127.0.0.1');
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:18545');
const accounts = Object.entries(server.provider.getInitialAccounts()).map(([address,value])=>({address,key:value.secretKey}));
const creator = await provider.getSigner(accounts[0].address);
const artifact = JSON.parse(await fs.readFile(new URL('../artifacts/UTopiaMarketplace.json',import.meta.url)));
const contract = await new ethers.ContractFactory(artifact.abi, artifact.bytecode, creator).deploy(accounts[1].address, accounts[2].address);
await contract.waitForDeployment();
const dir = new URL('../../.local/',import.meta.url);
await fs.mkdir(dir,{recursive:true});
await fs.writeFile(new URL('test-chain.json',dir), JSON.stringify({rpc:'http://127.0.0.1:18545',address:await contract.getAddress(),accounts}));
console.log('Disposable local EVM ready on port 18545; fixture is git-ignored.');
process.on('SIGINT',async()=>{await server.close();process.exit(0);});
