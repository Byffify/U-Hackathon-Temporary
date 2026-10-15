# U-topia UI behavior contract

English UI, global hackathon audience. Hybrid: landing is editorial; product routes prioritize completing tasks. frontend/DESIGN.md remains canonical visual source.

| Capability | Canonical owner | Behavior |
|---|---|---|
| Navigation | App.jsx data router | Shareable routes, private route session guard, 404, focus on route changes |
| Authentication | AppContext.jsx | Backend verification; keep edits mounted during background session expiry; reauthenticate same account |
| Forms | app/ui.jsx useDirtyGuard and app-field | Native labels/constraints, retained failure values, unsaved-choice dialog, beforeunload |
| Feedback | Notice, ErrorState, useTask | Visible status/errors, retry, synchronous duplicate-action lock |
| Async reads | useResource | Ignore stale results; explicit loading/error/empty states |
| Selects | Native select | OS keyboard behavior accepted; no duplicate custom select |
| Dialog | Shared Modal and dirty guard | Native dialog focus isolation and restoration; no alert/confirm/prompt |
| Search | Discovery.jsx URL state | Explicit submit; filters/page shareable; Clear resets immediately |
| Money | utils/pricing.js | Integer smallest units and exact 90/10; test AVAX labels |
| Scrollbar | styles/index.css | Shared tokenized baseline; system forced-colors behavior |
| Uploads | Service API XHR | Real progress; metadata-only in demo; busy inputs locked |
| Gemini | Gemini screens + service adapter | Current plan and explicit confirm; no fake generation or downloadable archive |

No table row-selection, date input, pagination size selection, second locale or speculative analytics system is introduced. Relevant test owners: tests/navigation.test.jsx, tests/session.test.jsx, tests/services.test.mjs, tests/gemini.test.mjs and e2e/marketplace.spec.js.
