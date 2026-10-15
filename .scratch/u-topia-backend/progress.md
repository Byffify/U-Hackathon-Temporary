# Execution ledger — backend-for-frontend plan

Plan: docs/superpowers/plans/2026-10-15-backend-for-frontend.md

- User accepted the proposed backend plan and authorized implementation in this workspace.
- Workspace is a copied project without .git; work in place. No branch/worktree/commit can be created against a missing repository.
- Start with delivery A (identity/profile/API foundation). Later integrations must not be claimed as complete without credentials and real evidence.
- Public HTTP API is the test boundary described in the approved plan. Tests use actual signed disposable test wallets and real persistent SQLAlchemy storage.
- Docker CLI exists, but Docker Engine is not running. SQLite is used for local/test feedback; PostgreSQL support and migrations must be delivered, PostgreSQL execution evidence remains separate until an engine is available.
- Pre-flight: A provides authenticated identity/session and public profile IDs consumed by B/E. Use opaque UUID strings; wallet stored checksummed and unique.
- Ruling: use installed bundled Python 3.12, matching proposed runtime. Its venv bootstrap lacks ensurepip; use system pip's --python to install into this venv, without changing global packages.
- RED: health test initially failed because app did not exist; then passed after application factory/config.
- RED: login tests failed on missing database module; GREEN after persistent identity/session implementation.
- Security regression: zero ECDSA signature raised eth_keys.BadSignature; explicitly rejected as 401, suite green.
- RED: SQL throttle and readiness tests failed (201 instead of 429; missing ready endpoint); GREEN after atomic shared SQL limiter and schema readiness.
- RED: migration test failed on missing Alembic configuration; GREEN after migration delivery.
- RED: partial PATCH cleared bio, oversized avatar URL passed, OpenAPI response schema was empty; GREEN after partial-update semantics, URL bounds, response models and CSRF header schema.
- Reviewer: independently inspected delivery A; confirmed fixes above and non-ASCII CSRF comparison. No remaining high-confidence important findings. Its test execution was blocked by sandbox temp-directory access, not an independent pass.
- Final verification: 42 tests passed; Ruff check/format, dependency check, Compose config parse passed. Actual local migrations and live Uvicorn /health/live + /health/ready + /openapi.json HTTP smoke passed.
- Delivered identity foundation. Remaining acceptance: actual PostgreSQL/Docker/Railway/FE integration. Parent-plan B–H remain unimplemented; avatar binary upload belongs to storage delivery, current image field supports URL only.

## Expanded delivery — 16 October 2026

- User requested original marketplace scope and explicitly separated Python auth/accounts/sessions from Solidity rights/purchases; accepted plan remains the implementation basis.
- Git now exists on main with user changes; work continued in place without discarding changes or pushing/committing. Corrected the invalid ENVIRONMENT=ENVIRONMENT example while expanding configuration.
- Reused the team's existing numeric-ID ERC-721/EIP-712 ABI. Preserved token hasAccess and added hasListingAccess; multiple independent holdings work.
- User reconfirmed Avalanche Fuji (43113), not historical NIMBL.
- Added modules, migrations 0002–0005, bundled ABI, dependencies and refreshed OpenAPI. External services fail closed when unconfigured.
- Delegated contract/commerce/Gemini tasks hit usage limits; parent completed missing worker/source integration, tests and self-review. No independent final expanded-delivery review.
- RED missing source APIs → GREEN encrypted upload/download/idempotency/traversal checks. Further tests caught canonical path collisions and derivative parent/child transaction ordering.
- RED Solidity independent holdings/listing access → GREEN with token API preserved and listing counts added.
- Final verified: 73 backend tests with real disposable local EVM; 5 Solidity scenario groups; Ruff/dependency checks. No cloud deployment. Pending checks in docs/verification/backend-marketplace.md.
