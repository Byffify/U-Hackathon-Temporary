import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import ganache from 'ganache';
import { ethers } from 'ethers';
execFileSync(process.execPath,['scripts/compile.mjs'],{stdio:'inherit'});
const artifact=JSON.parse(fs.readFileSync('artifacts/UTopiaMarketplace.json'));
const fields=(pairs)=>pairs.map(([name,type])=>({name,type}));
const primaryTypes={Purchase:fields([['listingId','uint256'],['buyer','address'],['price','uint256'],['termsHash','bytes32'],['nonce','uint256'],['deadline','uint256']])};
const resaleTypes={ResalePurchase:fields([['tokenId','uint256'],['buyer','address'],['seller','address'],['price','uint256'],['termsHash','bytes32'],['nonce','uint256'],['deadline','uint256']])};
async function setup(t){
 const rpc=ganache.provider({logging:{quiet:true},chain:{chainId:658440,hardfork:'cancun'}});t.after(()=>rpc.disconnect());
 const provider=new ethers.BrowserProvider(rpc);provider.pollingInterval=10;
 const wallets=Object.values(rpc.getInitialAccounts()).map(a=>new ethers.Wallet(a.secretKey,provider));
 const signers=await Promise.all(wallets.map((_,i)=>provider.getSigner(i)));
 const [creator,platform,sponsor,buyer,other]=signers;
 const c=await new ethers.ContractFactory(artifact.abi,artifact.bytecode,creator).deploy(platform.address,sponsor.address);await c.waitForDeployment();
 const domain={name:'UTopiaMarketplace',version:'1',chainId:658440,verifyingContract:await c.getAddress()};
 const terms=ethers.id('v1');const deadline=BigInt((await provider.getBlock('latest')).timestamp+3600);
 await(await c.createListing(101n,terms,true,false)).wait();
 const fund=async(signer,amount=1000n)=>{await(await c.connect(signer).deposit({value:amount})).wait();};
 const request=async(signer=buyer,overrides={})=>{const r={listingId:1n,buyer:signer.address,price:101n,termsHash:terms,nonce:await c.nonces(signer.address),deadline,...overrides};return[r,await wallets[signers.findIndex(s=>s.address===signer.address)].signTypedData(domain,primaryTypes,r)];};
 const buy=async(signer=buyer)=>{const args=await request(signer);await(await c.connect(sponsor).buy(...args)).wait();return args;};
 return{rpc,provider,wallets,signers,c,creator,platform,sponsor,buyer,other,domain,terms,deadline,fund,request,buy};
}
test('multiple buyers receive independent listing access, exact credits, and purchase gas sponsorship',async t=>{
 const x=await setup(t);await x.fund(x.buyer);await x.fund(x.other);
 const before=await x.provider.getBalance(x.buyer.address);await x.buy();await x.buy(x.other);
 assert.equal(await x.c.ownerOf(1n),x.buyer.address);assert.equal(await x.c.ownerOf(2n),x.other.address);
 assert.equal(await x.c.creditOf(x.creator.address),182n);assert.equal(await x.c.creditOf(x.platform.address),20n);
 assert.equal(await x.c.depositOf(x.buyer.address),899n);assert.equal(await x.provider.getBalance(x.buyer.address),before);
 assert.equal(await x.c.hasListingAccess(1n,x.other.address),true,'second entitlement must authorize listing access');
});
test('independent holdings survive one resale and listing changes preserve bought terms',async t=>{
 const x=await setup(t);await x.fund(x.buyer);await x.fund(x.other);await x.buy();await x.buy();
 await(await x.c.updateListing(1n,200n,ethers.id('v2'),false,true)).wait();
 const right=await x.c.entitlements(1n);assert.equal(right.termsHash,x.terms);assert.equal(right.allowResale,true);assert.equal(right.allowDerivativeSale,false);
 await(await x.c.connect(x.buyer).offerResale(1n,51n,x.deadline)).wait();
 const r={tokenId:1n,buyer:x.other.address,seller:x.buyer.address,price:51n,termsHash:x.terms,nonce:0n,deadline:x.deadline};
 const sig=await x.wallets[4].signTypedData(x.domain,resaleTypes,r);await(await x.c.connect(x.sponsor).buyResale(r,sig)).wait();
 assert.equal(await x.c.ownerOf(1n),x.other.address);assert.equal(await x.c.ownerOf(2n),x.buyer.address);
 assert.equal(await x.c.hasListingAccess(1n,x.buyer.address),true);assert.equal(await x.c.hasListingAccess(1n,x.other.address),true);
 assert.equal(await x.c.entitlementCount(1n,x.buyer.address),1n);assert.equal(await x.c.creditOf(x.buyer.address),46n);
 assert.equal(await x.c.creditOf(x.platform.address),25n);assert.equal((await x.c.resaleOffers(1n)).price,0n);
});
test('authorization rejects price, terms, nonce, expiry, chain, contract, non-sponsor, and replay',async t=>{
 const x=await setup(t);await x.fund(x.buyer);const valid=await x.request();
 await assert.rejects(x.c.connect(x.other).buy(...valid));
 for(const override of[{price:102n},{termsHash:ethers.id('bad')},{nonce:2n},{deadline:1n}])await assert.rejects(x.c.connect(x.sponsor).buy(...await x.request(x.buyer,override)));
 for(const domain of[{...x.domain,chainId:1},{...x.domain,verifyingContract:x.other.address}]){
 const sig=await x.wallets[3].signTypedData(domain,primaryTypes,valid[0]);await assert.rejects(x.c.connect(x.sponsor).buy(valid[0],sig));}
 assert.equal(await x.c.depositOf(x.buyer.address),1000n);assert.equal(await x.c.nextTokenId(),1n);await x.buy();await assert.rejects(x.c.connect(x.sponsor).buy(...valid));
});
test('atomic resale rejects unpaid/cancelled offers and transfer bypass including approved operators',async t=>{
 const x=await setup(t);await x.fund(x.buyer);await x.buy();
 await assert.rejects(x.c.connect(x.other).offerResale(1n,51n,x.deadline));
 await assert.rejects(x.c.connect(x.buyer).transferFrom(x.buyer.address,x.other.address,1n));
 await(await x.c.connect(x.buyer).approve(x.other.address,1n)).wait();await assert.rejects(x.c.connect(x.other).transferFrom(x.buyer.address,x.other.address,1n));
 await(await x.c.connect(x.buyer).offerResale(1n,51n,x.deadline)).wait();
 const r={tokenId:1n,buyer:x.other.address,seller:x.buyer.address,price:51n,termsHash:x.terms,nonce:0n,deadline:x.deadline};const sig=await x.wallets[4].signTypedData(x.domain,resaleTypes,r);
 await assert.rejects(x.c.connect(x.sponsor).buyResale(r,sig));assert.equal(await x.c.ownerOf(1n),x.buyer.address);assert.equal(await x.c.nonces(x.other.address),0n);
 await x.fund(x.other);await(await x.c.connect(x.buyer).cancelResale(1n)).wait();await assert.rejects(x.c.connect(x.sponsor).buyResale(r,sig));assert.equal(await x.c.depositOf(x.other.address),1000n);
});
test('recorded resale denial survives new permissions; withdrawals conserve escrow',async t=>{
 const x=await setup(t);await(await x.c.updateListing(1n,101n,x.terms,false,false)).wait();await x.fund(x.buyer);await x.buy();
 await(await x.c.updateListing(1n,101n,x.terms,true,true)).wait();await assert.rejects(x.c.connect(x.buyer).offerResale(1n,50n,x.deadline));
 await assert.rejects(x.c.connect(x.other).updateListing(1n,1n,x.terms,true,true));
 await(await x.c.connect(x.buyer).withdrawDeposit(899n)).wait();assert.equal(await x.c.depositOf(x.buyer.address),0n);
 await(await x.c.withdrawCredit()).wait();assert.equal(await x.c.creditOf(x.creator.address),0n);assert.equal(await x.provider.getBalance(await x.c.getAddress()),10n);
});
