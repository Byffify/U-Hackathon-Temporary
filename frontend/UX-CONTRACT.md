# U-topia UI behavior contract

English UI, global hackathon audience. Hybrid: landing is editorial; product routes prioritize completing tasks. frontend/DESIGN.md remains canonical visual source.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Navigation | App.jsx data router | Route definitions in App.jsx | Public, private and unknown routes | navigation.test.jsx; marketplace.spec.js |
| Authentication | AppContext.jsx | Backend session in API mode; local demo session in demo mode | Reauthenticate the same wallet after session expiry | session.test.jsx; services.test.mjs |
| Forms | app/ui.jsx useDirtyGuard and app-field | Form state in each screen; shared dirty guard | Native labels and constraints | marketplace.spec.js |
| Feedback | Notice, ErrorState, useTask | Shared UI primitives in app/ui.jsx | Info, success and error notices | access-recovery.test.jsx |
| Async reads | useResource | Shared hook in app/ui.jsx | Loading, error and empty states | marketplace.spec.js |
| Selects | Native select | Browser select behavior | OS popup accepted | marketplace.spec.js |
| Dialog | Shared Modal and dirty guard | components/ui/Modal.jsx | Confirmation and unsaved changes | navigation.test.jsx |
| Search | Discovery.jsx URL state | URL search parameters | Explicit submit and immediate clear | marketplace.spec.js |
| Money | utils/pricing.js | Integer smallest units and exact 90/10 | Test AVAX labels | pricing.test.mjs |
| Scrollbar | styles/index.css | Shared CSS tokens | Forced colors system behavior | check:design |
| Uploads | Service API XHR | services/index.js | Metadata only in demo mode | services.test.mjs |
| Gemini | Gemini screens and service adapter | pages/gemini and services/gemini-demo.js | Demo guidance without generated archive | gemini.test.mjs; gemini-guidance.test.jsx |

No table row-selection, date input, pagination size selection, second locale or speculative analytics system is introduced. Relevant test owners: tests/navigation.test.jsx, tests/session.test.jsx, tests/services.test.mjs, tests/gemini.test.mjs and e2e/marketplace.spec.js.
