# U-topia

React + JavaScript frontend, built with Vite. The creator landing page adapts `FASTWORK_SELLING_UX_UI_SPEC_TH.md` to the agreed U-topia business rules.

Python Backend is in [`backend/`](backend/README.md): FastAPI wallet-signature login, sessions/profiles, image/encrypted-source uploads, projects/releases, commerce/chain adapter and Gemini jobs. Solidity is in `contracts/`. See [integration handoff](docs/backend-marketplace-handoff.md) for endpoints, provider configuration and explicit verification limits. Frontend wiring and hosted-service acceptance are separate from local tests.

## Run

Requires Node.js 22.12 or later (the lockfile records exact dependencies).

```sh
cd frontend
npm install
npm run dev
```

Local preview: http://127.0.0.1:4173

```sh
npm run check
npm test
npm run build
npm run preview
```

## Structure

```text
frontend/
  package.json            Frontend dependencies and commands
  index.html              Vite HTML entrypoint
  src/
    main.jsx              React entrypoint
    App.jsx               Landing and dialog coordination
    pages/                Page-level composition
    components/
      landing/            Hero artwork, creator showcase, U-Bot, FAQ
      dialogs/            Creator, project, fee, and plan dialog content
      layout/             Shared site header and footer
      ui/                 Shared accessible modal
    data/                 Clearly labeled illustrative content
    hooks/                Reusable React hooks for responsive behavior
    lib/                  Browser wallet integration boundary
    utils/                Exact fee calculations and local interaction events
    styles/               Global CSS and generated design tokens
  public/                 Static public assets
  scripts/                Token generation, drift checks, and syntax checks
  tests/                  Behavior tests
  DESIGN.md               Frontend design tokens and component guidance
docs/                     Product decisions, ADRs, and verification evidence
.scratch/u-topia-mvp/      Product spec and draft tickets
```

The frontend is plain JavaScript and JSX, not TypeScript. Components own their React state; the presentation has no manual DOM rendering or copied Fastwork assets.

## Scope of this implementation

Working UI: creator/profile tabs and keyboard navigation, example project search and details, a 90/10 test AVAX fee calculator, source-feature selection, custom stack selection, plan preview, native modal focus handling, and optional injected-wallet address connection.

Not connected to the frontend: backend authentication, source encryption/IPFS uploads, payment contracts and gas sponsorship, source downloads, and AI generation. The backend authentication API exists separately; the current frontend wallet connection still requests an address only and does not authenticate a server session. Example projects are illustrative, not purchasable listings.

## Design tokens

`frontend/DESIGN.md` is the token source. Run these commands from `frontend/` after changing token frontmatter:

```sh
npm run tokens
npm run check:design
```

Do not hand-edit generated tokens. Google Fonts are optional remote resources; local fallbacks keep the page readable without them.
