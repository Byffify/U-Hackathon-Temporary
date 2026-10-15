# U-topia

React + JavaScript frontend, built with Vite. The creator landing page adapts `FASTWORK_SELLING_UX_UI_SPEC_TH.md` to the agreed U-topia business rules.

Python Backend foundation is now in [`backend/`](backend/README.md): FastAPI wallet-signature login, persistent sessions, public/own profiles, SQL migrations, HTTP tests, and Railway Railpack configuration. Frontend integration and marketplace/Gemini/contract services are not connected yet. See the backend README for local commands and exact delivery limits.

## Run

Node.js 22.12+ required. From `frontend/`:

```sh
npm install
npm run dev
npm run check
npm test
npm run test:ui
npm run test:browser
npm run build
```

Default local URL: http://127.0.0.1:4173. Browser tests start their own server on 4187 and require `npx playwright install chromium` once. Production hosting must rewrite application routes to index.html; proxy `/api/v1` to the backend before that fallback.

## Modes

Copy frontend/.env.example to frontend/.env.local. `VITE_SERVICE_MODE=demo` is the default: sample listings and simulated metadata persist locally, with clearly labeled demo account login. No real payment, encryption, source delivery or Gemini call occurs. Uploaded file bytes are not persisted. External license verification and downloadable source/generated ZIPs are unavailable in demo; no fake archive is supplied.

Use `VITE_SERVICE_MODE=api` and `VITE_API_BASE_URL=/api/v1` to connect the backend. Requests use authenticated cookies. API failure never falls back to fixtures. The current backend supplies Fuji wallet authentication and profiles; the remaining proposed routes in docs/frontend-api.md require server implementation. Do not put server keys in Vite environment variables.

## Pages

Landing; Explore/search/filter; project details and public creators; wallet authentication; profile settings; creator project drafts, screenshots, ZIP publishing and releases; purchase confirmation/recovery; Library, downloads and updates; license resale; Gemini conversations, source context, quota review, explicit generation confirmation and output history; 404 and recovery states.
API mode connects the backend wallet-signature authentication and profile endpoints. Source encryption/IPFS uploads, payment contracts and gas sponsorship, source downloads, and AI generation are not yet backed by live services. Example projects are illustrative, not purchasable listings.

Gemini replaces U-Bot, supports one or many authorized source releases, and creates ZIPs only through the connected backend after explicit confirmation. See docs/adr/0011-gemini-conversations-and-single-project-work.md.

## Working agreements

- Product specification and task progress: .scratch/u-topia-frontend/.
- Backend handoff contract: docs/frontend-api.md (proposal awaiting teammate agreement).
- Visual source and token commands: frontend/DESIGN.md; `npm run tokens` and `npm run check:design`.
- Shared behavior ownership: frontend/UX-CONTRACT.md.
- Verification evidence and live integration limits: docs/verification/frontend-marketplace.md.

Live Avalanche Fuji, gas sponsorship, IPFS source encryption and Gemini ZIP generation require separate real-service acceptance. Tests of development fixtures do not establish those integrations.
