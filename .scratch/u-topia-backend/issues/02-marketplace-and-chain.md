# 02: Marketplace upload, chain entitlement delivery and Gemini backend

Parent: [Backend plan](../../../docs/superpowers/plans/2026-10-15-backend-for-frontend.md)
What to build: Continue beyond identity foundation with upload/source protection and commerce/Gemini APIs, keeping accounts/sessions in Python and entitlement settlement in Solidity.
Blocked by: 01 — Wallet identity and profile foundation.
Status: ready-for-agent
Completion: code implemented and locally verified; external integration acceptance pending

- [x] Project/image/source-release APIs and public discovery.
- [x] Encrypted source storage, protected key custody, tamper detection and current-holder downloads.
- [x] Chain listing preparation/matching, EIP-712 intents, fixed-call sponsor and settlement verification.
- [x] Independent tokens, 90/10 settlement, purchased terms and atomic permitted resale in Solidity.
- [x] Library/download/free-update behavior and exact release references.
- [x] Gemini chat/history/plans/quota/jobs/output/derivative endpoints and external adapters.
- [x] Conservative open-source review policy; unknown snapshots blocked.
- [x] 73 backend tests including real local-EVM purchase/resale; 5 Solidity scenario groups.
- [ ] Real PostgreSQL/Linux image/Railway browser-session integration.
- [ ] Real IPFS/Supabase/key restoration acceptance.
- [ ] Actual Fuji deployment and funded sponsor/depositor flow.
- [ ] Real Gemini Free Tier generation and Modal build acceptance.

Evidence: [verification](../../../docs/verification/backend-marketplace.md).

## Comments

Fuji was reconfirmed directly by the user on 16 October. Source access never trusts a local paid flag. Escrow deposit/withdrawal gas is separate; do not describe fully gasless onboarding. No external deployment performed. Controlled provider fixtures do not close the remaining integration checks.
