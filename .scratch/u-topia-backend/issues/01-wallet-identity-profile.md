# 01: Wallet identity and profile foundation

Parent: [Backend foundation spec](../spec.md)
What to build: FastAPI application with persistent wallet-signature sessions, own/public profile API, SQL migrations and reproducible local/deployment setup.
Blocked by: None (can start immediately).
Status: ready-for-agent
Completion: implementation delivered; hosted/PostgreSQL acceptance pending

## Acceptance criteria

- [x] Challenge bound to wallet, Fuji, domain/URI, browser and expiry; verify signature and consume once.
- [x] Persistent hashed opaque sessions with expiry, rotation and logout.
- [x] Public profile and session-authorized partial profile update; CSRF/Origin checks.
- [x] Common success/error envelopes, OpenAPI and FE integration instructions.
- [x] Atomic SQL auth throttle persists across process restart.
- [x] Alembic migration upgrade/downgrade verified on SQLite.
- [x] 42 HTTP/config/migration tests, lint/format/dependency check and live local health smoke.
- [x] Dockerfile, Compose and Railway config prepared; Compose config parsed.
- [ ] Run the Docker image and tests against a running PostgreSQL instance.
- [ ] Provision Railway/database and verify actual deployed FE cookie/session integration.

Avatar URL editing works; binary avatar upload requires the later storage delivery. No other parent-plan deliveries are marked complete here.

## Verification evidence

[Backend verification](../../../docs/verification/backend-identity.md)
