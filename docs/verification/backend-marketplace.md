# Backend marketplace verification — 16 October 2026

## Scope delivered in code

Wallet identity/session foundation retained; project CRUD/discovery, actual image/ZIP upload, AES-GCM envelope encryption, versioned releases, storage adapters, current-holder downloads, numeric on-chain listing binding, purchase intents/EIP-712 relaying, library/resale, Gemini conversations/estimates/plans/quota/jobs/outputs, conservative open-source intake and derivative draft publication.

Solidity retains the existing ERC-721/EIP-712 ABI and adds listing-level access without replacing token-level hasAccess. Independent holdings are supported, including retaining another entitlement after resale. User confirmed Fuji instead of historical NIMBL configuration.

## Executed evidence

- Backend full suite with LOCAL_EVM_TEST=1: **73 passed**. One dependency deprecation warning from Starlette's httpx test client, no failures.
- The suite includes a real disposable Ganache EVM (chain 43113), actual Solidity deployment, Python signature login, encrypted upload, creator listing transaction, buyer escrow deposit, sponsored purchase, canonical receipt verification, library/source download and resale with old/new holder source access.
- Solidity: **5 local-EVM scenario groups passed**, covering independent buyers, 90/10 rounding/credits, sponsored purchase balances, original terms, multiple holdings, resale atomicity, transfer bypass, stale/replayed/wrong-domain authorizations and withdrawals.
- Google provider tests use controlled fixtures, explicitly not a real Gemini call. Queue/confirmation, three source projects, plan invalidation, quota shortage, known failed usage, uncertain outcome reservation and output/provenance were exercised.
- Upload tests verify actual ciphertext files, tamper integrity failure, traversal/canonical collision rejection, image normalization, idempotent releases and free updates against a gateway fixture.
- Alembic upgrade/downgrade/re-upgrade through migrations 0001–0005 passes on SQLite.
- Ruff lint/format and dependency check passed; Compose configuration parses.

## Explicit remaining acceptance

No Railway project was created/deployed. Docker Engine remains unavailable, so Linux container startup and PostgreSQL runtime were not verified locally. Real IPFS pin persistence, Supabase permissions/key backup and restore, Fuji deployment/sponsor funding, Gemini Free Tier project/model budgets and Modal build credentials are absent and remain external acceptance prerequisites.

Local disk mode is labeled local and disabled for production source/file persistence. Sandbox build defaults to not-run when unavailable; no successful model/build result is invented. Unknown/unreviewed open-source snapshots stay blocked. The sponsor key requires one API relayer process before scaling; deposit setup gas is not sponsored.

Three delegated implementation agents hit an account usage limit. The parent completed integration, tests and self-review; there was no fresh independent final review of this expanded delivery. Earlier identity-only review does not cover all new modules.
