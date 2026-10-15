# U-topia frontend

React, JavaScript, Vite and React Router application. The source moved from `frontend2` into this directory; `frontend/` is the active app.

## Run

Use Node.js 22.12+ and run from this directory:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4173`. The Vite dev server proxies `/api/v1` to `http://127.0.0.1:8000`; set `API_PROXY_TARGET` before starting Vite to use another local backend.

## Routes

`/` landing; `/explore`; `/projects/:projectId`; `/creators/:creatorId`; `/connect`; `/resales/:offerId`; `/checkout/:projectId`; `/library`; `/library/:entitlementId`; `/settings/profile`; `/workspace/projects`; `/workspace/projects/new`; `/workspace/projects/:projectId/edit`; `/workspace/projects/:projectId/releases/new`; `/gemini`; `/gemini/chats/:chatId`. Unknown paths show a 404 page. Private routes redirect to `/connect` and return to the requested page after sign-in.

## Modes

`VITE_SERVICE_MODE=demo` is the default. It uses browser-local sample data and simulated transactions, with no real source download or Gemini output. Set `VITE_SERVICE_MODE=api` in `.env.local` to use the backend. API failures do not fall back to demo data.

API mode uses the delivered backend's Fuji wallet challenge/verify flow, cookie session, CSRF-protected profile update and sign-out. The backend currently implements authentication and profiles. Marketplace, file delivery, payments and Gemini API routes remain unavailable until their server implementations land; those screens show service errors in API mode.

## Checks

```sh
npm run check
npm test
npm run test:ui
npm run build
```

Browser tests use Playwright. Install its Chromium or run with an installed Chrome browser by setting `PLAYWRIGHT_CHANNEL=chrome` before `npm run test:browser`.
