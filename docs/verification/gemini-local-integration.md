# Gemini local integration — 16 October 2026

## Delivered

- Frontend Gemini calls the Python conversations/estimates/plans/jobs/private-output API. It maps UI fields to the backend request contract and restores message/plan/generation history.
- Added authenticated `GET /api/v1/gemini/sources`: exact owned releases work without a public-chain connection. Purchased metadata comes from current chain entitlements; chain unavailability omits purchased sources and is disclosed to the UI. Verified private imports are scoped to their owner. Actual analysis/download rechecks rights server-side.
- Source context is synchronized before estimation. Planning and chat jobs are polled; generation still requires explicit confirmation of the latest plan revision. Unknown POST outcomes preserve the original request body, estimate and idempotency key for a safe retry.
- Generation status polling and reload restore jobs. Background analysis polling preserves in-progress form edits. Failed generation does not expose an output download.
- Output download uses a session-authenticated binary request and a temporary browser Blob URL; no public source URL or browser API key is introduced.
- Google rejection codes distinguish access/model/rate limits from temporary unavailability. Unknown outcomes retain quota reservations and are not automatically retried.
- Refreshed backend/openapi.json. No database migration was needed for these additive responses/routes.

## Local setup applied

- Replaced the invalid GEMINI_TRIAL_END value with a 30-day Unix expiry (15 November 2026). This is our demo trial policy, not the API key's expiry.
- Explicitly pinned the local model to `gemini-3.1-flash-lite`, which has a Free Tier according to https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-flash-lite. Runtime fallback remains disabled.
- Google rejected `gemini-2.5-flash` with 404 and the message that it is no longer available to new users. A check of 3.8 Flash returned 503. These are provider responses, not simulated test fixtures.
- Configured Frontend API mode with `/api/v1` proxy to `http://127.0.0.1:8000`, and matching auth/cookie origin `http://127.0.0.1:4173`.
- Applied migrations to the Desktop local database. Started API at 127.0.0.1:8000 and worker from the Desktop backend directory using the already-installed Python 3.12 runtime in the Downloads checkout. Frontend was already running at port 4173 and loaded the changed module/config.
- API `/health/ready` returned ready; live OpenAPI includes source catalog; served Frontend module points at the local proxy.
- Credential values remain only in ignored .env files and are not included in this report. No deployment or public-chain transaction was performed.

## Verification evidence

| Check | Result |
| --- | --- |
| Full Python regression suite | 79 passed, 1 skipped (local EVM opt-in), one existing Starlette/httpx deprecation warning |
| Full Frontend Node tests after review fixes | 46 passed |
| Frontend UI suite before focused review fixes | 18 passed |
| Focused Gemini guidance/recovery UI tests after fixes | 3 passed, including edit preservation on background polling |
| Frontend production build after fixes | Passed |
| Edge headless UI flow after fixes | Passed with mocked Python responses: sources → estimate → plan → explicit confirm → job polling → binary ZIP → reload restores job; no page errors |
| Real Google call on pinned Flash-Lite | Chat returned structured text; 50 input + 7 output tokens |
| Real complete backend/worker smoke with isolated DB and synthetic print('hello') source | Attempt stopped at chat with Google 503 / PROVIDER_UNAVAILABLE; full live plan/generation/ZIP acceptance remains unverified |
| Code review | Two important issues reproduced and fixed (immutable retry body and editable-context preservation); reviewer recheck found no remaining important issue in that scope |

Changed Python modules pass Ruff. Full-repository Ruff also reports an existing import-format issue in app/chain.py from the preceding merge; it was not changed as part of this integration. Browser test responses were mocked and are not evidence of a successful Google generation. The real smoke used synthetic code only, did not execute generated code and did not send user project files.

## Try the UI

1. Open http://127.0.0.1:4173 and log in with the network selected by the current app config (KEEPHUB L1, chain 658440). Personal-sign login does not require a public deployment or token balance.
2. Create a draft in My workspace and upload your own source ZIP. No purchase/deployment is required to use your own release as Gemini context.
3. Open `/gemini`, create a conversation, select the exact release, enter a target stack and instructions.
4. Check analysis quota, send a question or review a plan, then explicitly confirm generation if desired.
5. Keep API and worker running. If a request reports `PROVIDER_UNAVAILABLE`, Google rejected it as temporarily unavailable; do not click repeatedly or switch to demo mode and call it a real AI success. Unknown outcomes may retain a token reservation for reconciliation.

The URL-only external-import form cannot supply the archive/license evidence that the backend requires. It now returns a clear archive-required message. Use an owned release for this demo; the existing multipart source-import API remains available for separately reviewed archives. Derivative-publication and commerce frontend flows are outside this Gemini repair and still need their own integration acceptance.

## Follow-up: localhost sources returned 404

The user's failing request was `http://127.0.0.1:4173/api/v1/gemini/sources`. Direct Backend returned 401, but the Vite proxy returned 404. `loadEnv("development", ...)` confirmed that tracked `.env.development` overrode `.env.local` and routed the relative localhost URL to Railway. The earlier served-module check verified the browser URL, not the proxy destination, and was insufficient.

Created ignored `frontend/.env.development.local` with `API_PROXY_TARGET=http://127.0.0.1:8000`, API mode, and relative `/api/v1`. Verified the effective Vite configuration and repeated the exact failing URL: both direct Backend and Frontend proxy now return 401 (authentication required), rather than 404. Vite picked up the change without a manual process restart.

The local database was empty before this repair; online sessions/projects are not local database records. The user must log in again and upload an owned source locally. This fix proves routing and removes the observed missing-endpoint error; it does not assert that Google 503 unavailability has disappeared. Development instructions now use `.env.development.local` so mode-specific defaults cannot silently override local settings.
