# U-topia frontend

React, JavaScript, Vite and React Router application. The source moved from `frontend2` into this directory; `frontend/` is the active app.

## Run

Use Node.js 22.12+ and run from this directory:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4173`. The Vite dev server proxies `/api/v1` to `http://127.0.0.1:8000`; set `API_PROXY_TARGET` before starting Vite to use another local backend.

To test wallet login locally, put `VITE_SERVICE_MODE=api` and `VITE_API_BASE_URL=/api/v1` in `.env.local`. Keep the browser at `http://127.0.0.1:4173` and set the local backend's `AUTH_DOMAIN=127.0.0.1:4173` and `AUTH_URI=http://127.0.0.1:4173`; its `FRONTEND_ORIGINS` must include that origin. Use an injected wallet on Avalanche Fuji (chain ID 43113). The sign-in prompt is an off-chain signature and needs no test AVAX.

## Routes

`/` landing; `/explore`; `/projects/:projectId`; `/creators/:creatorId`; `/connect`; `/resales/:offerId`; `/checkout/:projectId`; `/library`; `/library/:entitlementId`; `/settings/profile`; `/workspace/projects`; `/workspace/projects/new`; `/workspace/projects/:projectId/edit`; `/workspace/projects/:projectId/releases/new`; `/gemini`; `/gemini/chats/:chatId`. Unknown paths show a 404 page. Private routes redirect to `/connect` and return to the requested page after sign-in.

## Modes

`VITE_SERVICE_MODE=demo` is the local development default. It uses browser-local sample data and simulated transactions, with no real source download or Gemini output. Set `VITE_SERVICE_MODE=api` in `.env.local` to use the backend locally. Production builds use `.env.production` with same-origin `/api/v1`; the Vercel rewrite forwards those requests to Railway so the wallet session cookies belong to the frontend site. Update the rewrite destination if the Railway API domain changes. API failures do not fall back to demo data.

API mode uses the backend's Fuji wallet challenge/verify flow, cookie session, CSRF-protected profile update and sign-out. The wallet signs the exact backend challenge using `personal_sign`; connecting without signing does not create a session. Explore fetches `GET /api/v1/explore`, which combines the backend's three labeled example projects with published listings and supports search, technology filter and pagination. Example details come from `GET /api/v1/explore/:id` and cannot be purchased. Demo mode retains browser-local fixtures for offline workflows. The backend must allow the deployed frontend origin in `FRONTEND_ORIGINS`. Other screens continue to use the existing service integration and need separate end-to-end verification before release.

For a Vercel deployment, set the project Root Directory to `frontend`, Build Command to `npm run build`, and Output Directory to `dist`. `vercel.json` proxies `/api/v1/*` to Railway and routes direct visits to `/explore` and other client routes to the SPA entry point. Once Vercel assigns the actual frontend URL, add that exact origin to the backend's `FRONTEND_ORIGINS` and `AUTH_URI`/`AUTH_DOMAIN` settings, then redeploy the backend. A guessed Vercel URL will not satisfy the backend's exact-origin checks.

## Checks

```sh
npm run check
npm test
npm run test:ui
npm run build
```

Browser tests use Playwright. Install its Chromium or run with an installed Chrome browser by setting `PLAYWRIGHT_CHANNEL=chrome` before `npm run test:browser`.
