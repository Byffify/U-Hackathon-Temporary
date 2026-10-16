# KEEPHUB contracts

**Active target: KEEPHUB Avalanche L1 (EVM chain ID 658440), native token PINEM.** Confirm `CHAIN_RPC_URL`, `PLATFORM_ADDRESS` and `SPONSOR_ADDRESS` in the git-ignored `.env` (copy `.env.example` if needed), then run `npm run build` and `npm run deploy:l1`. The deploy command reads `.env` and prompts for the private key with hidden input if `DEPLOYER_PRIVATE_KEY` is absent from the shell. The deployer must hold PINEM on this L1 for gas. No public marketplace deployment was performed in this session. Fuji and NIMBL scripts below are historical targets.

Python owns login/account/session; Solidity owns native escrow/EIP-712 purchases and ERC-721 entitlements. `hasAccess(tokenId,holder)` stays token-level; new `hasListingAccess(listingId,holder)` supports independent holdings. Deposit setup and credit withdrawals still require their own gas; only purchase settlement is sponsored. See [backend handoff](../docs/backend-marketplace-handoff.md).

After ABI changes export the compiled ABI to `backend/app/contract_abi.json`. For local-EVM integration, `node scripts/local-test-chain.mjs` starts disposable chain 658440 on port 18545 and writes git-ignored `.local/test-chain.json`; run backend tests with LOCAL_EVM_TEST=1. Never use disposable local fixture keys on public networks. The historical frontend bridge script is not the L1 backend acceptance test.

## Historical NIMBL notes

`src/UTopiaMarketplace.sol` เป็น Solidity contract สำหรับเครือข่ายทดสอบ NIMBL (chain ID 174511) โดยใช้ NIMBL เป็น native gas และสกุลเงินซื้อขาย พร้อม access token แบบ ERC-721 หนึ่ง token ต่อสิทธิ์ที่ซื้อ ตัวสัญญาบันทึก chain ID ณ เวลา deploy และผูก EIP-712 กับ chain นั้น

## ขอบเขตบนเชน

- ผู้สร้างสร้าง/แก้รายการ ราคา และ hash ของเงื่อนไขสิทธิ์เองได้ การแก้รายการมีผลต่อการซื้อครั้งใหม่เท่านั้น สิทธิ์ที่ซื้อแล้วเก็บเงื่อนไขเดิม
- ผู้ซื้อฝาก NIMBL ไว้ใน contract ก่อน แล้วเซ็น EIP-712 `Purchase` ที่ระบุรายการ ราคา hash เงื่อนไข nonce และวันหมดอายุ บัญชี sponsor เท่านั้นที่ส่งธุรกรรม `buy` และจ่าย gas ของธุรกรรมนั้น
- สัญญาหัก 10% แบบจำนวนเต็ม และลงเครดิตอีก 90% ให้ผู้สร้าง เครดิตต้องถอนด้วย `withdrawCredit`; เงินฝากที่ยังไม่ใช้ถอนด้วย `withdrawDeposit`
- เจ้าของ token ขายสิทธิ์เดิมต่อได้เมื่อสิทธิ์ที่ซื้อไว้อนุญาต โดยสร้าง offer และผู้ซื้อใหม่เซ็น `ResalePurchase` จากนั้น sponsor ทำ `buyResale` ซึ่งหักเงินและโอนสิทธิ์ในธุรกรรมเดียว ส่วนแบ่ง 90/10 ใช้กับการขายต่อด้วย
- `hasAccess(tokenId, account)` ตรวจเจ้าของสิทธิ์ปัจจุบัน Backend ยังต้องตรวจ chain 174511, contract address, listing, wallet authentication และ transaction finality ก่อนส่ง ZIP ที่ถอดรหัส
- การขายผลงานต่อยอดเป็นรายการใหม่ ไม่มี royalty ต้นทาง สัญญาบันทึก `allowDerivativeSale` ของสิทธิ์ ณ เวลาซื้อ แต่ backend ต้องตรวจ provenance ของทุก source ก่อนยอมให้เผยแพร่

**ข้อจำกัด:** ผู้ซื้อต้องมี NIMBL และต้องจ่าย gas ของธุรกรรม `deposit` เอง; sponsorship ครอบคลุมธุรกรรม `buy`/`buyResale` เท่านั้น วิธีฝากเงินจึงยังไม่ใช่ประสบการณ์ที่ไม่ต้องถือ gas เลย ไม่มีการอัปโหลด IPFS, เข้ารหัส, ตรวจลายเซ็นเข้าสู่ backend หรือจัดการ U-Bot ใน contract นี้ ห้ามนำไปใช้กับ mainnet โดยไม่มี security review เพิ่มเติม

## ตรวจและเตรียม deploy

จากโฟลเดอร์ `contracts/`:

```sh
npm ci
npm test
npm run compile
npm run test:bridge
```

`test:bridge` ต้องติดตั้ง dependencies ใน `frontend/` ด้วย และตรวจว่า frontend อ่านข้อมูลจาก Solidity contract ที่ deploy บน EVM จำลองได้

ตั้ง environment variables `DEPLOYER_PRIVATE_KEY`, `PLATFORM_ADDRESS`, `SPONSOR_ADDRESS` และ `NIMBL_RPC_URL` (ถ้าไม่ใช้ RPC ที่กำหนดไว้) แล้วรัน:

```sh
npm run deploy:nimbl
```

`deploy:nimbl` ตรวจ chain ID ก่อนส่งธุรกรรม และพิมพ์ contract address กับ transaction hash หลังยืนยัน ห้าม commit private key หรือใส่ไว้ใน command history ของเครื่องร่วมใช้ บัญชี deployer ต้องมี NIMBL สำหรับ gas และบัญชี sponsor ต้องมี NIMBL สำหรับ gas การซื้อ

เครือข่ายนี้ใช้ RPC `https://nodes-prod.43.207.73.245.sslip.io/ext/bc/2BypykXr6eM22uoNFNV6fNcDHQJrN5fUQG5CjbjjQzPYZzjZXh/rpc`, chain ID 174511 และ explorer `https://2bypykxr.firn.gg` หลัง deploy ให้นำ address ไปใส่ `VITE_MARKETPLACE_ADDRESS` ใน `frontend/.env.local`

สคริปต์ `deploy:fuji` และ `deploy:nimbl` เก็บไว้สำหรับเครือข่ายเดิม; frontend ปัจจุบันอ่านเฉพาะ chain 658440
