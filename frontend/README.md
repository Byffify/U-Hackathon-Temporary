# KEEPHUB frontend

React, JavaScript, Vite and React Router application. The source moved from `frontend2` into this directory; `frontend/` is the active app.

## Run

Use Node.js 22.12+ and run from this directory:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4173`. `.env.development` routes `/api/v1` through the Vite proxy to the Railway backend. The browser sees the API on its own origin, so wallet challenge and session cookies can be sent back during login. Set `API_PROXY_TARGET` before starting Vite to use another backend.

To test wallet login against a local backend, set `API_PROXY_TARGET=http://127.0.0.1:8080` in `.env.local`. Keep the browser at `http://127.0.0.1:4173` and set the local backend's `AUTH_DOMAIN=127.0.0.1:4173` and `AUTH_URI=http://127.0.0.1:4173`; its `FRONTEND_ORIGINS` must include that origin. Use an injected wallet on the KEEPHUB Avalanche L1 (chain ID 658440). The sign-in prompt is an off-chain signature and needs no PINEM.

## Routes

`/` landing; `/explore`; `/projects/:projectId`; `/creators/:creatorId`; `/connect`; `/resales/:offerId`; `/checkout/:projectId`; `/library`; `/library/:entitlementId`; `/settings/profile`; `/workspace/projects`; `/workspace/projects/new`; `/workspace/projects/:projectId/edit`; `/workspace/projects/:projectId/releases/new`; `/gemini`; `/gemini/chats/:chatId`. Unknown paths show a 404 page. Private routes redirect to `/connect` and return to the requested page after sign-in.

## Modes

`VITE_SERVICE_MODE=api` is the frontend default. `.env.development` uses the same-origin Vite proxy to Railway; `.env.production` calls Railway directly. Use `.env.local` to override the development target. Set `VITE_SERVICE_MODE=demo` in `.env.local` only for offline workflows; it uses browser-local sample data and simulated transactions, with no real source download or Gemini output. API failures do not fall back to demo data.

API mode uses the backend's L1 wallet challenge/verify flow, cookie session, CSRF-protected profile update and sign-out. The wallet signs the exact backend challenge using `personal_sign`; connecting without signing does not create a session. Explore fetches `GET /api/v1/projects` and displays only published projects stored in the backend, with search, technology filter and pagination. Project details come from `GET /api/v1/projects/:id`. Demo mode retains browser-local fixtures for offline workflows. The backend must allow the deployed frontend origin in `FRONTEND_ORIGINS`. Other screens continue to use the existing service integration and need separate end-to-end verification before release.

For a Vercel deployment, set the project Root Directory to `frontend`, Build Command to `npm run build`, and Output Directory to `dist`. The frontend calls Railway directly using the build-time `VITE_API_BASE_URL`; `vercel.json` also retains the same-origin `/api/v1/*` proxy for deployments that override that variable. Direct cross-site wallet sessions require the backend's `FRONTEND_ORIGINS` to include the exact frontend origin and `COOKIE_SAMESITE=none` with `COOKIE_SECURE=true`; browser third-party-cookie restrictions may still block them. Set `AUTH_URI`/`AUTH_DOMAIN` to the deployed frontend origin and host, then redeploy the backend.

## Checks

```sh
npm run check
npm test
npm run test:ui
npm run build
```

Browser tests use Playwright. Install its Chromium or run with an installed Chrome browser by setting `PLAYWRIGHT_CHANNEL=chrome` before `npm run test:browser`.
