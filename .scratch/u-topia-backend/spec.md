# Backend delivery A — Wallet identity and profiles

Status: ready-for-agent
Scope: first executable delivery of the user-approved backend plan. Remaining marketplace/Gemini/contract deliveries stay in the parent plan.
Parent: ../../docs/superpowers/plans/2026-10-15-backend-for-frontend.md

## Behavior

- Python 3.12/FastAPI, SQLAlchemy and Alembic; PostgreSQL for hosted deployment, SQLite for local/tests.
- `/api/v1/auth/challenges` takes wallet address and Fuji chain ID 43113, issues server-rendered EIP-4361-style personal-sign message bound to configured domain/URI, random nonce and five-minute expiry. Bind challenge to an HttpOnly browser cookie, so a signature from another browser cannot log the victim into the attacker's wallet.
- `/auth/verify` takes challenge ID and signature, recovers signer using EIP-191, validates one-time browser-bound challenge and creates/reuses user with an opaque session cookie. Only EOA personal-sign is supported initially; contract-wallet signature validation is not implemented.
- Persist only session-token hashes, expiry and revocation. Sessions expire after 24 hours. Every protected request verifies the server session. Logout revokes the token.
- GET session returns user + CSRF token for authenticated browser. Unsafe session mutations need configured Origin and matching X-CSRF-Token. Challenge/verify also require configured Origin; no client-provided signed message or domain is trusted.
- Public profiles contain ID, name, avatar URL and bio; never session/wallet details. Own profile endpoint updates only the current user. Profile fields reject extras and unsafe avatar URL schemes. Avatar file upload is deferred until a real object-storage adapter is configured; URL-based profile image works now.
- Return consistent `{data}` / `{error:{code,message,field_errors,retryable},request_id}` responses. OpenAPI records cookie/header security. Errors never include signatures, session values or database configuration.
- Production requires HTTPS origins and Secure cookies, explicit domain/URI and persistent PostgreSQL. Startup must not silently create schema; Alembic is the schema authority.

## Verification boundary

HTTP integration tests with disposable EOA keys and temp persistent database: login/profile roundtrip, signature mismatch/expiry/replay, wrong chain, browser binding, cookie flags, CSRF/Origin, logout/restart, validation envelope, readiness and migration roundtrip. Rate limit auth issuance/verification at the application boundary, backed by database so restart/multiple workers do not reset the budget.

## Delivery limits

No external credentials or Railway deployment has been supplied. PostgreSQL runtime tests need an available database; Docker Engine currently unavailable. No purchase/source/Gemini claims from this delivery. Missing integrations are not replaced with successful fixtures in runtime endpoints.
