import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, mkdtempSync } from "node:fs";
import path from "node:path";
import ganache from "ganache";
import solc from "solc";
import { ethers } from "ethers";

const source = readFileSync(new URL("../src/UTopiaMarketplace.sol", import.meta.url), "utf8");
const input = {
  language: "Solidity",
  sources: { "UTopiaMarketplace.sol": { content: source } },
  settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun", outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } },
};
const output = JSON.parse(solc.compile(JSON.stringify(input), {
  import: (name) => {
    try { return { contents: readFileSync(path.resolve("node_modules", name), "utf8") }; }
    catch { return { error: `Missing import ${name}` }; }
  },
}));
const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
assert.deepEqual(errors, []);
const compiled = output.contracts["UTopiaMarketplace.sol"].UTopiaMarketplace;

async function fixture() {
  mkdirSync(".test-data", { recursive: true });
  const dbPath = mkdtempSync(path.resolve(".test-data", "ganache-"));
  const server = ganache.provider({ logging: { quiet: true }, chain: { chainId: 174511 }, database: { dbPath } });
  const provider = new ethers.BrowserProvider(server);
  const keys = Object.values(server.getInitialAccounts()).map((account) => account.secretKey);
  const [platform, sponsor, creator, buyer, other] = keys.map((key) => new ethers.Wallet(key, provider));
  const factory = new ethers.ContractFactory(compiled.abi, compiled.evm.bytecode.object, platform);
  const market = await factory.deploy(platform.address, sponsor.address);
  await market.waitForDeployment();
  assert.equal(await market.CHAIN_ID(), 174511n);
  const termsHash = ethers.id("license-v1");
  const price = ethers.parseEther("1");
  await (await market.connect(creator).createListing(price, termsHash, true, true)).wait();
  return { provider, market, platform, sponsor, creator, buyer, other, termsHash, price };
}

async function signPurchase({ provider, market, buyer, price, termsHash }, overrides = {}) {
  const nonce = await market.nonces(buyer.address);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const value = { listingId: 1n, buyer: buyer.address, price, termsHash, nonce, deadline, ...overrides };
  const domain = { name: "UTopiaMarketplace", version: "1", chainId: Number((await provider.getNetwork()).chainId), verifyingContract: await market.getAddress() };
  const types = { Purchase: [
    { name: "listingId", type: "uint256" }, { name: "buyer", type: "address" },
    { name: "price", type: "uint256" }, { name: "termsHash", type: "bytes32" },
    { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
  ] };
  return { value, signature: await buyer.signTypedData(domain, types, value) };
}

async function signResale({ provider, market, other, buyer, termsHash }, price) {
  const value = {
    tokenId: 1n, buyer: other.address, seller: buyer.address, price, termsHash,
    nonce: await market.nonces(other.address),
    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
  };
  const domain = { name: "UTopiaMarketplace", version: "1", chainId: Number((await provider.getNetwork()).chainId), verifyingContract: await market.getAddress() };
  const types = { ResalePurchase: [
    { name: "tokenId", type: "uint256" }, { name: "buyer", type: "address" },
    { name: "seller", type: "address" }, { name: "price", type: "uint256" },
    { name: "termsHash", type: "bytes32" }, { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ] };
  return { value, signature: await other.signTypedData(domain, types, value) };
}

test("sponsor settles signed purchase using buyer deposit and credits exact 90/10", async () => {
  const f = await fixture();
  await (await f.market.connect(f.buyer).deposit({ value: f.price })).wait();
  const balanceBefore = await f.provider.getBalance(f.buyer.address);
  const { value, signature } = await signPurchase(f);
  await (await f.market.connect(f.sponsor).buy(value, signature)).wait();
  assert.equal(await f.provider.getBalance(f.buyer.address), balanceBefore);
  assert.equal(await f.market.ownerOf(1), f.buyer.address);
  assert.equal(await f.market.creditOf(f.creator.address), ethers.parseEther("0.9"));
  assert.equal(await f.market.creditOf(f.platform.address), ethers.parseEther("0.1"));
  assert.equal(await f.market.depositOf(f.buyer.address), 0n);
  await assert.rejects(f.market.connect(f.sponsor).buy(value, signature));
});

test("two buyers get separate rights and later listing edits preserve purchased terms", async () => {
  const f = await fixture();
  for (const buyer of [f.buyer, f.other]) {
    await (await f.market.connect(buyer).deposit({ value: f.price })).wait();
    const signed = await signPurchase({ ...f, buyer });
    await (await f.market.connect(f.sponsor).buy(signed.value, signed.signature)).wait();
  }
  const nextTerms = ethers.id("license-v2");
  await (await f.market.connect(f.creator).updateListing(1, ethers.parseEther("2"), nextTerms, false, false)).wait();
  assert.equal(await f.market.ownerOf(1), f.buyer.address);
  assert.equal(await f.market.ownerOf(2), f.other.address);
  assert.equal((await f.market.entitlements(1)).termsHash, f.termsHash);
  assert.equal((await f.market.entitlements(2)).termsHash, f.termsHash);
  assert.equal(await f.market.hasAccess(1, f.buyer.address), true);
});

test("wrong signer, changed price and expiry cannot spend a buyer deposit", async () => {
  const f = await fixture();
  await (await f.market.connect(f.buyer).deposit({ value: f.price })).wait();
  const signed = await signPurchase(f);
  await assert.rejects(f.market.connect(f.other).buy(signed.value, signed.signature));
  await assert.rejects(f.market.connect(f.sponsor).buy({ ...signed.value, price: 1n }, signed.signature));
  const expired = await signPurchase(f, { deadline: 1n });
  await assert.rejects(f.market.connect(f.sponsor).buy(expired.value, expired.signature));
  assert.equal(await f.market.depositOf(f.buyer.address), f.price);
});

test("permitted resale transfers one entitlement and splits resale proceeds", async () => {
  const f = await fixture();
  await (await f.market.connect(f.buyer).deposit({ value: f.price })).wait();
  const original = await signPurchase(f);
  await (await f.market.connect(f.sponsor).buy(original.value, original.signature)).wait();
  await assert.rejects(f.market.connect(f.buyer).transferFrom(f.buyer.address, f.other.address, 1));

  const resalePrice = ethers.parseEther("0.5");
  const offerDeadline = BigInt(Math.floor(Date.now() / 1000) + 7200);
  await (await f.market.connect(f.buyer).offerResale(1, resalePrice, offerDeadline)).wait();
  await (await f.market.connect(f.other).deposit({ value: resalePrice })).wait();
  const signed = await signResale(f, resalePrice);
  await (await f.market.connect(f.sponsor).buyResale(signed.value, signed.signature)).wait();
  assert.equal(await f.market.ownerOf(1), f.other.address);
  assert.equal(await f.market.hasAccess(1, f.buyer.address), false);
  assert.equal(await f.market.hasAccess(1, f.other.address), true);
  assert.equal(await f.market.creditOf(f.buyer.address), ethers.parseEther("0.45"));
  assert.equal(await f.market.creditOf(f.platform.address), ethers.parseEther("0.15"));
  await assert.rejects(f.market.connect(f.sponsor).buyResale(signed.value, signed.signature));
});

test("resale remains forbidden when the original purchased terms forbid it", async () => {
  const f = await fixture();
  await (await f.market.connect(f.creator).updateListing(1, f.price, f.termsHash, false, false)).wait();
  await (await f.market.connect(f.buyer).deposit({ value: f.price })).wait();
  const signed = await signPurchase(f);
  await (await f.market.connect(f.sponsor).buy(signed.value, signed.signature)).wait();
  await assert.rejects(f.market.connect(f.buyer).offerResale(1, f.price, BigInt(Math.floor(Date.now() / 1000) + 3600)));
});
