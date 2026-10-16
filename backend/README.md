# KEEPHUB Python backend

Implemented API: wallet authentication/profiles, image and encrypted ZIP uploads, projects/releases/discovery, on-chain listing/purchase/library/resale adapters, and Gemini conversations/plans/quota/jobs/output/derivative drafts. External services fail closed when unconfigured; local storage is explicitly a development mode. Real Gemini/IPFS/Modal/L1/Railway acceptance still requires configured services and credentials. See [marketplace handoff](../docs/backend-marketplace-handoff.md).

## Local development

Python 3.12 or newer. Run from `backend/`:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe -m pip install -e ".[dev]"
Copy-Item .env.example .env
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000
```

Linux/macOS use `.venv/bin/python` instead. `requirements.txt` contains the pinned runtime dependencies for Railpack and mirrors `requirements.lock`; keep both files in sync when updating dependencies. `pyproject.toml` contains the development extras.

- Swagger UI: http://127.0.0.1:8000/docs
- Live API contract: http://127.0.0.1:8000/openapi.json
- Exported contract for FE: `openapi.json` (regenerate after interface changes)
- Liveness: `/health/live`; database/schema readiness: `/health/ready`
- SQLite file `utopia.db` persists local data. Runtime does not create tables automatically; migrations are required. PostgreSQL is required when `ENVIRONMENT=production`.

Use `localhost:4173` for the frontend by default, matching the signed message domain and URI. If using `127.0.0.1:4173`, change both AUTH_DOMAIN/AUTH_URI accordingly. Keep the configured frontend origin consistent with the API hostname during local development, or proxy `/api` through Vite: browsers may block cookies between different sites even when CORS allows them.

The bundled Codex Python 3.12 on this workstation lacks ensurepip. Its venv was bootstrapped using system pip's `--python backend/.venv/Scripts/python.exe` support; a normal Python installation can use the commands above directly.

## API delivered

All successful responses wrap the payload in `{ "data": ... }`. Every request receives X-Request-ID; API responses use Cache-Control: no-store. Errors use:

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Sign in with your wallet to continue.",
    "field_errors": {},
    "retryable": false
  },
  "request_id": "opaque-request-id"
}
```

| Method/path | Input/output |
| --- | --- |
| POST `/api/v1/auth/challenges` | `{address, chain_id:658440}` → `{id,message,expires_at}`; sets HttpOnly browser-binding cookie |
| POST `/api/v1/auth/verify` | `{challenge_id,signature}` → `{user:{id,address},csrf_token}`; sets HttpOnly session cookie |
| GET `/api/v1/auth/session` | Current `{user,csrf_token}` or 401 |
| POST `/api/v1/auth/logout` | Requires session, Origin and X-CSRF-Token; revokes session |
| GET `/api/v1/me/profile` | Current profile, authentication required |
| PATCH `/api/v1/me/profile` | Optional `name`, `bio`, `avatar_url`; update only submitted fields; requires session/Origin/CSRF |
| GET `/api/v1/creators/{id}` | Public `{id,name,bio,avatar_url}`, no wallet/session information |
| GET `/api/v1/explore` | Public paginated catalog with three database-backed editorial examples and published listings; supports `q`, `stack`, `page`, `page_size` |
| GET `/api/v1/explore/{id}` | Public example or published project detail; examples carry `is_example:true` and have no purchase/source archive |

`GET /api/v1/projects?include_examples=true` and `GET /api/v1/projects/{id}?include_examples=true` expose the same catalog for the Explore frontend. Without that flag, `/projects` remains limited to published purchasable listings.

Profile limits: name 1–80 characters, bio at most 2000, HTTP(S) avatar URL at most 2048 characters. `avatar_url:null` clears the image. Name/bio cannot be null; unknown fields and empty PATCH are rejected. POST `/api/v1/me/avatar` accepts an actual multipart image and updates avatar_url.

### Frontend login sequence

1. Call the injected wallet's `eth_requestAccounts`, ensure KEEPHUB L1 chain 658440.
2. POST `/auth/challenges` using `credentials:"include"`; sign exactly the returned message with EIP-191 `personal_sign` (UTF-8 message encoded to hex for wallets that require hex parameters).
3. POST `/auth/verify` with the returned ID and signature, again including cookies. The browser-binding cookie from step 2 must be present.
4. Keep `csrf_token` in memory; include it in `X-CSRF-Token` for profile mutations/logout. Recover it after refresh via GET `/auth/session`.
5. On 401 clear the authenticated UI state and reconnect; connection alone never authenticates. Backend messages/fields are English.

All browser fetches need `credentials:"include"`. Browser supplies Origin automatically; do not add a wildcard CORS origin. curl/non-browser integration clients must send an allowed Origin on auth POST and authenticated mutations.

Auth supports EOA wallets using 65-byte personal-sign signatures only. ERC-1271 contract-wallet verification, wallet linking/recovery and access-token purchase are not implemented. Challenges expire in five minutes and are consumed atomically. Sessions expire in 24 hours by default, are stored only as hashes, survive process restart, and are revoked on logout/rotation.

## Tests and checks

```powershell
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/ruff.exe check .
.venv/Scripts/ruff.exe format --check .
```

Tests use disposable signing keys and independent SQLite files, real HTTP application boundaries, signature recovery and migrations. They do not invoke Gemini, IPFS, the deployed L1 or a hosted database. If the desktop sandbox denies pytest's temp-directory access, run tests with the authorized terminal permissions; this is not an application failure.

For local PostgreSQL, configure `DATABASE_URL` in `.env`, run the migration command above, then start the API.
Migration `0006_explore_examples` creates and seeds the three preview rows. `sql/insert_explore_examples.sql` contains an idempotent PostgreSQL `INSERT` for manually restoring those rows after migration; it does not create purchasable listings.

## Railway configuration

Deploying is a separate operation; no Railway service has been created from this package.

1. Configure the API service Root Directory as `/backend` and Builder as Railpack. For an existing service that uses config as code, set Config File to `/backend/railway.toml` ([Railway monorepo docs](https://docs.railway.com/deployments/monorepo)). Set up a persistent PostgreSQL database and backup.
2. Set DATABASE_URL to its PostgreSQL connection URL (SSL as required by the database provider), ENVIRONMENT=production, COOKIE_SECURE=true, AUTH_DOMAIN to the frontend host, AUTH_URI to its HTTPS origin, and FRONTEND_ORIGINS to a JSON array of exact allowed HTTPS origins.
3. Use COOKIE_SAMESITE=none when FE/API are on different sites; cross-site browser cookie policies may still block third-party cookies. For reliable browser sessions prefer custom subdomains of the same site or a frontend same-origin reverse proxy. Same-site deployment can use lax.
4. Railpack installs `requirements.txt` with Python 3.12. Both `railpack.json` and `railway.toml` specify `app.main:create_app` as the API entry point on Railway's PORT. Set the service Config File to `/backend/railway.toml` so this start command applies even if the dashboard has an old custom command such as `uvicorn main:app`. The config also runs `python -m alembic upgrade head` before deployment and checks `/health/ready`; if Railway does not apply the config file, set these values in the service settings.
5. Disable serverless sleep if the demo must remain warm, and monitor actual trial credit usage. Trial credit is not an uptime guarantee or unlimited free hosting.
6. Auth rate limit defaults to 30 requests/minute per ASGI client peer across challenge and verify. Counters live in SQL, shared by workers/restarts. Configure forwarded-client handling only for a verified trusted proxy path; never blindly trust arbitrary X-Forwarded-For. Without trusted proxy configuration, users behind the same proxy may share a limit. Adjust the demo budget intentionally, not by trusting user-supplied IP headers.

For persistent project screenshots and avatars, attach a Railway Volume to the **backend** service at `/data` and keep `STORAGE_BACKEND=local`. Railway supplies `RAILWAY_VOLUME_MOUNT_PATH` automatically; the API stores new media under that path. Alternatively set `STORAGE_BACKEND=supabase` with a private bucket and its server-side credentials. Without either option, production image uploads fail instead of reporting success for files that disappear on redeploy. Images previously stored on ephemeral disk must be uploaded again; a database media row alone cannot restore the file.

If `/api/v1/projects` returns `DATABASE_UNAVAILABLE`, check the backend service's `DATABASE_URL` reference to PostgreSQL, then run `python -m alembic current` in that service. The expected revision is `0006_explore_examples`; run `python -m alembic upgrade head` as the pre-deploy command if it is behind. Confirm `/health/ready` returns 200 before retrying Explore. After deploying this version, backend logs include the request ID, SQL exception class, and SQLSTATE without printing SQL parameters or connection details.

## External acceptance still pending

No cloud services have been provisioned or deployed by this implementation. Configure IPFS and persistent image storage (Supabase or Railway Volume), L1 contract/sponsor, Gemini Free Tier and optional Modal before enabling their flows. Tests distinguish local disk, controlled provider fixtures and real local-EVM integration from external integration. Production PostgreSQL execution and the Railpack image remain to be verified. Avatar binary uploads now exist at POST `/api/v1/me/avatar`; source ZIP upload is POST `/api/v1/projects/{id}/releases`.
