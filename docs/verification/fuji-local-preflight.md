# Fuji deployment: local preparation

Verified 16 October 2026 in `C:\Users\66809\Desktop\U-Hackathon-Temporary`.

## Completed locally

- Installed contract dependencies with `npm ci` from the existing lockfile.
- `npm run build`: passed, solc 0.8.30, Shanghai EVM, optimized deployment bytecode 14,443 bytes.
- Compiled ABI exactly matches `backend/app/contract_abi.json`; no ABI replacement was needed.
- `npm test`: 5 passed, 0 failed. Covers independent holdings, credit splits, purchased term snapshots, signature replay/domain/nonce restrictions, sponsor restrictions, resale, transfer bypass denial and withdrawals.
- Started disposable Ganache on loopback port 18545 and deployed the actual compiled contract there.
- Backend `LOCAL_EVM_TEST=1 ...python.exe -m pytest -q tests/test_evm_integration.py`: 1 passed. Actual local-EVM test covers publishing, deposit/purchase, library/source delivery, resale and previous-holder access denial.
- Backend code tested is in the Desktop checkout. The test used the existing Python 3.12.14 runtime at `C:\Users\66809\Downloads\U-Hackathon-Temporary\backend\.venv\Scripts\python.exe`; no dedicated Desktop backend venv has been installed yet.
- Created Desktop `backend/.env` only because none existed; uses development/local storage and default Fuji chain 43113 with public Fuji RPC. Did not copy credentials from the Downloads checkout. Contract address and sponsor key are still unset.
- Added `contracts/.env.example`; created a git-ignored `contracts/.env` with public RPC and commented credential fields, ready for the owner to edit.
- Verified runtime `.env` and disposable chain fixture are git-ignored. No public Fuji transaction or cloud deployment was submitted.

## Reproduce the contract checks

```powershell
cd C:\Users\66809\Desktop\U-Hackathon-Temporary\contracts
npm test
npm run build
```

The local HTTP EVM is a disposable test fixture. Its generated keys in `.local/test-chain.json` are not deployer/sponsor credentials for Fuji. It is stopped after validation; restart explicitly if another local integration run is needed.

## Remaining Fuji steps (owner credentials required)

1. Prepare public `PLATFORM_ADDRESS` and `SPONSOR_ADDRESS`, and a test-wallet `DEPLOYER_PRIVATE_KEY`. Sponsor is immutable in this contract.
2. Fund deployer and sponsor with test AVAX on Fuji C-Chain (43113).
3. Fill the three commented fields in `contracts/.env` directly on the workstation. Remove their leading `#`; do not send keys in chat.
4. From `contracts`, use Node 22+ to explicitly load the file and deploy:

   ```powershell
   node --env-file=.env scripts/deploy-fuji.mjs
   ```

   Alternatively set process environment variables and run `npm run deploy:fuji`. That npm command alone does not automatically load `.env`.

5. Save output `address` and `transactionHash`; verify deployment receipt/code on Fuji. `chainId` must be 43113. This creates a new deployment each time it is run.
6. In `backend/.env`, set `MARKETPLACE_CONTRACT_ADDRESS` to that address and `SPONSOR_PRIVATE_KEY` to the key corresponding to the deployed sponsor. Restart the API after configuring it.
7. Connect the Frontend wallet/transaction flows to the same network/address, then test creator listing → buyer deposit → purchase → confirmed entitlement → ZIP download → resale on actual Fuji.

## Independent work still pending

- This is contract deployment preparation, not a completed online demo. Desktop backend runtime/migrations/API start, Gemini key/model configuration and a real Gemini request still require a separate local acceptance run. Existing credentials from another checkout are not assumed present here.
- Frontend service routes for uploads, purchases, library, resale and Gemini still differ from backend routes; complete adapters and transaction flows before claiming browser end-to-end acceptance. See `docs/manual-test-demo.md`.
- VM/Railway hosting, persistent storage and browser HTTPS/cookie acceptance remain separate. Production settings currently require PostgreSQL and reject local file storage; demo-on-VM configuration needs that distinction handled.

## Warnings and verification limits

- npm installation reported 10 dependency advisories (1 low, 2 moderate, 6 high, 1 critical). No automatic dependency upgrades were made. Ganache is used for local tests; audit/remediation is still pending and this is not a security clearance for mainnet.
- Node 24 lacks the bundled native µWS binary for this Ganache version; Ganache falls back to JavaScript. Tests passed with that fallback.
- Sandbox temp-file restrictions blocked the first Ganache run. Successful contract/EVM checks ran outside the sandbox on loopback only.
- Backend test emitted a Starlette/httpx deprecation warning; it passed.
- Local EVM evidence does not prove Fuji RPC availability, sponsor balances, actual deployment, public transaction finality or hosted infrastructure readiness.
