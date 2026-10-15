# Backend / Solidity integration handoff — 16 October 2026

## Responsibility split

- **Python** issues an expiring browser-bound signing challenge containing a random nonce, verifies the EOA signature, creates the account on first valid login, and manages persistent hashed sessions. Connecting an address alone grants nothing. Profile/project/file ownership and CSRF derive from the authenticated session.
- **Solidity** owns listing prices/terms, EIP-712 purchase nonces, native escrow settlement, ERC-721 access tokens, current holder and atomic resale. The server never grants purchased source access from a browser flag, CID or arbitrary transaction hash.
- User reconfirmed **Avalanche Fuji, chain ID 43113**, on 16 October 2026. Historical NIMBL scripts/docs do not change the backend's configured network. No mainnet transactions or public deployments were performed.

## API added under /api/v1

| Group | Endpoints |
| --- | --- |
| Auth/profile | Existing auth challenges/verify/session/logout and profile APIs; POST `/me/avatar` adds actual image upload |
| Discovery/projects | GET/POST `/projects`, GET/PATCH `/projects/{id}`, GET `/me/projects`; query q/stack/creator_id/page/page_size |
| Files/releases | POST `/projects/{id}/images`, GET `/media/{id}`, POST/GET `/projects/{id}/releases`, GET `/projects/{id}/releases/{releaseId}/download` |
| Listing on chain | POST `/projects/{id}/chain-transaction` returns create/update calldata for the creator wallet; POST `/projects/{id}/publish` verifies matching chain listing before publishing |
| Commerce | POST `/purchase-intents`, POST `/purchase-intents/{id}/confirm`, GET `/purchase-intents/{id}` |
| Library | GET `/me/entitlements`, GET `/entitlements/{id}`, GET `/entitlements/{id}/releases/{releaseId}/download` |
| Resale | POST `/resale-offers`, GET `/resale-offers/{tokenId}`, POST `/resale-offers/{tokenId}/cancel`; preparation does not claim the offer is active until its wallet transaction lands |
| Gemini | conversations/list/history/messages/sources, estimates, versioned plans/revisions, explicit plan confirm, GET `/jobs/{id}`, private `/outputs/{id}/download` |
| Intake/derivatives | POST `/gemini/source-imports`, POST `/outputs/{id}/project-draft` |

All session mutations require Origin and X-CSRF-Token. Upload uses multipart `file`; releases also need `version` and Idempotency-Key. Source release IDs and purchased terms hashes are immutable snapshots. Public release responses never contain nonce/wrapped_key. Downloads verify the current holder before decryption, including after transfer. New releases in the same listing remain free for current holders; a new listing grants no inherited entitlement.

## Local run and storage

Run migrations after updating dependencies:

```powershell
cd backend
.venv/Scripts/python.exe -m pip install -r requirements.lock
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
```

Development defaults use local disk explicitly. The first encrypted upload creates `.local/master.key` and ciphertext under `.local/objects`; keep both if restoring local data. This is not IPFS and is never silently used in production. The `.local` directory is git-ignored. ZIP inspection rejects traversal, symlinks, encrypted archives, canonical path collisions, oversized expansion and unusable archives. Images are decoded/re-encoded PNG, with pixel and byte limits. No uploaded code runs on the API host.

Production source storage requires SOURCE_STORAGE_BACKEND=ipfs, IPFS_API_URL pointing to a **Kubo-compatible RPC base** (server calls `/api/v0/add?pin=true` and `/api/v0/cat`), optional IPFS_API_AUTHORIZATION, and STORAGE_MASTER_KEY (base64 of exactly 32 random bytes). Source is encrypted with a fresh per-release AES-GCM key; that key is envelope-encrypted under the master key, with release-bound associated data. Back up the database and protected master key together. Losing either prevents source recovery.

Production images/output require STORAGE_BACKEND=supabase with SUPABASE_URL, SUPABASE_SERVICE_KEY and an existing **private** SUPABASE_BUCKET. Access is proxied through backend authorization. Configure PUBLIC_API_URL to the public HTTPS backend origin for image URLs. Pinning API, Supabase bucket and key backup were not provisioned during development.

## On-chain flow and sponsorship limit

1. Compile `contracts/src/UTopiaMarketplace.sol`; ABI is bundled at `backend/app/contract_abi.json`. Re-export it whenever the Solidity ABI changes. Existing token-level hasAccess is retained; hasListingAccess separately checks ownership of any token in the listing.
2. Creator creates the backend draft/uploads source, obtains createListing transaction calldata, signs it in their wallet, and sends its numeric chain listing ID to `/publish`. Backend verifies creator, price, terms hash and permission flags.
3. Buyer creates a purchase intent. Response includes EIP-712 authorization and a **deposit transaction**. The contract spends only the buyer's prepaid native balance, not native funds magically pulled from their EOA.
4. The buyer funds escrow with test AVAX and pays gas for that **setup deposit**. The buyer then signs the purchase authorization off-chain; Python relays the fixed contract call, and the designated sponsor pays **purchase transaction gas**.
5. Price is split into 10% platform credit and the remainder seller credit, with integer rounding. Credit holders withdraw via contract withdrawCredit; deposits not spent can be withdrawn. No upstream royalty is taken.
6. Python stores the exact signed transaction/hash before broadcasting and verifies canonical receipts/contract events and confirmations before showing confirmed. Repeat confirm/poll does not create another purchase. On uncertain broadcast, inspect/poll the same intent rather than create another one.
7. Resale preparation is wallet calldata; settlement transfers only that token atomically. Independent tokens held by the same or other users remain effective. Previously downloaded files cannot be recalled.

Set FUJI_RPC_URL, MARKETPLACE_CONTRACT_ADDRESS, SPONSOR_PRIVATE_KEY, CHAIN_CONFIRMATIONS and funding before real use. The sponsor must match the immutable deployed sponsor. Operate **one API relayer process / one replica per sponsor key** for this MVP; local locks do not coordinate signer nonce allocation across independent deployments. Multiple relayer replicas require a dedicated durable nonce/relay service before scaling.

This escrow design provides sponsored purchases but **does not provide gas-free deposit onboarding, listing creation or withdrawals**. Gas for those actions is outside the original purchase-only sponsorship decision. Fuji deployment and real account balances still need a separate live acceptance run.

## Gemini Free Tier and workers

The backend uses google-genai and never switches to an alternate model or paid project automatically. Configure GEMINI_API_KEY, an available Free Tier GEMINI_MODEL, GEMINI_FREE_TIER_ENABLED=true and explicit token budgets: GEMINI_INITIAL_QUOTA, GEMINI_ANALYSIS_BUDGET, GEMINI_GENERATION_BUDGET, GEMINI_TRIAL_END (Unix timestamp). The boolean is a deployment attestation, **not a Google billing switch**; use a Free Tier project/key. No provider/model or numeric trial budget is guessed.

Run a separate Railway service from the same backend revision with a custom start command `python -m app.worker`, sharing the database and private storage configuration. API queues durable jobs; it does not run AI in long HTTP requests. Missing AI configuration returns GEMINI_UNAVAILABLE before quota allocation/usage.

User selects one or multiple exact releases. Estimate precedes analysis; messages never confirm generation. New messages/source/stack changes invalidate unconfirmed plans. Explicit latest-revision confirmation atomically reserves quota and queues one generation per plan. Quota is one allocation per account, no daily reset/top-up/purchase reward. Known failed usage is charged; unused reservations are released. Unknown provider outcomes keep their reservation for manual reconciliation and are not retried blindly.

Plan creation/revision accepts an optional `generation_budget` below the configured maximum, so users can revise scope and reserve a smaller budget. These values are disclosed token ceilings, not a promise of successful composition within every arbitrarily small budget. EIP-712 uint256 message values, including price/nonce, are decimal strings for JavaScript precision; use BigInt/ethers when preparing wallet quantities.

Output ZIP includes run instructions, provenance and upstream license notices. Without configured sandbox, build is explicitly `not-run`. Optional Modal validation uses MODAL_APP_NAME, a prebuilt SANDBOX_IMAGE with required dependencies, and trusted server-side SANDBOX_BUILD_COMMAND. SDK credentials are MODAL_TOKEN_ID/MODAL_TOKEN_SECRET; they are not injected into sandbox jobs. Network is blocked in the sandbox, so package dependencies must already be in the image. A failed build is recorded as failed and blocks derivative publishing. No Modal or Gemini calls were verified with real credentials in this session.

Open-source intake retains origin, archive hash and license evidence. Recognition alone does not grant rights: exact archive SHA256 must be pre-reviewed and listed in APPROVED_OPEN_SOURCE_HASHES. Unknown/unreviewed or incompatible sources stay blocked. This is a conservative deployment policy, not an automatic legal opinion. Derivative drafts recheck all source rights and preserve provenance before reusing the ordinary encrypted publishing flow.

## Deployment/readiness

Railway uses Railpack with `/backend` as the root, `requirements.txt` for pinned dependencies, `railpack.json` for the API start command, and `/backend/railway.toml` for API migration and readiness settings where config as code is available. Use PostgreSQL, Secure session cookies and correct frontend CORS/CSRF settings. Health readiness checks all registered tables, so migrations 0001–0005 must complete before traffic. Keep API and worker deployments on the same revision. Do not store keys, source files or job outputs in an ephemeral Railway filesystem.

Remaining live acceptance: Railpack image/PostgreSQL, real IPFS pin/retrieve, Supabase persistence/key restore, Fuji deployment/sponsor funding, real Gemini Free Tier composition and Modal build, Railway/Frontend cookie flow. Local fixtures and a real disposable local EVM do not prove those external integrations.
