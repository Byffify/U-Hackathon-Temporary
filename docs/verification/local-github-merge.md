# Local / GitHub merge — 16 October 2026

Requested integration of the current Desktop checkout with GitHub `origin/main`.

- Saved local Gemini integration, manual-test corrections and test config isolation in commit `3558e2f` before merging.
- Fetched remote tip `c26eb99`, including `df6a318` (backend), `89fcb47` (chain) and `c26eb99` (frontend).
- Resolved two conflicts while retaining changes from both sides:
  - `contracts/.env.example`: blank platform/sponsor values and hidden deployer-key prompting from remote, plus local deployment cautions and historical Fuji instructions.
  - `frontend/src/services/index.js`: local Gemini API adapter plus the remote service object and Library/image-response mappings. Preserved the service variable needed for recursive project/release lookups.
- Test Settings now explicitly ignore `.env` files so workstation auth origins/credentials cannot silently change fixture behavior. This was verified after reproducing ORIGIN_FORBIDDEN failures caused by the workstation's 127.0.0.1 origin differing from test fixtures' localhost origin.
- Did not change populated runtime .env files, local data or credentials. The ignored `.env.development.local` proxy override remains local-only.

## Verification on combined code

- Backend: **81 passed, 1 skipped** (opt-in local-EVM test), one existing Starlette/httpx deprecation warning.
- Frontend Node suite: **50 passed**.
- Frontend UI suite: **20 passed** across 7 files.
- Frontend production build: **passed**.
- `git diff --cached --check`, deploy script syntax and staged credential-assignment pattern scan: passed; no unresolved conflict paths.

These checks do not assert public-chain deployment, hosted Railway acceptance, or a full successful live Gemini generation. No push or deployment was performed as part of this merge preparation.
