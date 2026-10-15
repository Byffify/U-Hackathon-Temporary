# 07 - Address the five priority critique findings

Parent: [Frontend spec](../spec.md)
Status: ready-for-agent
What to build: Fix the five issues in the 2026-10-16 Impeccable critique without changing flows, route sequence, confirmation logic or Design System.
Blocked by: 06 - integration-and-qa
Completion: complete (frontend scope)

## Acceptance criteria
- [x] Long license/gas definitions remain readable on narrow screens, preserving field order.
- [x] Checkout labels the existing purchase amount Total using an existing price scale; 90/10 accounting unchanged.
- [x] Gemini disabled actions expose nearby dynamic prerequisite descriptions and aria-describedby; original disable predicates/sequence retained.
- [x] License access failures provide plain-language context and Back to library; temporary failures retain retry.
- [x] Standalone navigation/action links meet existing 44px hit-area contract without replacing tokens or visual identity.

## Verification evidence

npm run check passed including 31 design tokens. npm test:25 passed; npm run test:ui:14 passed; npm run test:browser:12 passed; format:check and production build passed. New regression tests were observed failing before implementation and passing afterwards. Screenshots inspected at320/1440px under frontend/artifacts/critique-fixes/. Existing browser route matrix also covers320/768/1440px. Full integration remains separate from demo UI verification.

## Comments

Removed three orphaned chart-height CSS rules left behind when ProjectArt switched from CSS mockups to user-supplied screenshots. The removed selectors have no rendered elements; no token or active layout was changed by this cleanup. It resolves the previously detected undefined --bar-height lint reference.
