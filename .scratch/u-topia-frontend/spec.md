# U-topia frontend with Gemini

Status: ready-for-agent
Review: Approved user plan, 2026-10-15.

## Goal
Complete connected frontend routes for discovery, wallet sessions, profiles, publishing, purchase, library, updates, resale, and Gemini conversations. Preserve React/JavaScript/Vite and frontend/DESIGN.md. Backend integration is proposed, not signed off by the backend teammate.

## Current product decisions
Gemini replaces U-Bot, supports one or many exact authorized releases, and uses chat -> quote -> plan -> explicit confirmation -> job -> output. See ADR-0011. Trial quota rules remain. Downloads and generation cannot be falsely represented as live in demo mode.

## Routes
/, /explore, /projects/:projectId, /creators/:creatorId, /connect,
/settings/profile, /checkout/:projectId, /library, /library/:entitlementId,
/workspace/projects, /workspace/projects/new, /workspace/projects/:projectId/edit,
/workspace/projects/:projectId/releases/new, /resales/:offerId,
/gemini, /gemini/chats/:chatId and 404.

## Architecture
React Router data router, shared session provider and app UI states, service.call operations with demo and API adapters. Authenticated requests use credentials. Backend owns authentication, rights, amounts, upload validation, transaction settlement, quota, source processing and Gemini secrets. API failures never become demo success.

## Acceptance
Every route is connected and responsive at 320/768/1440px. Mutations retain form inputs on failure and block accidental navigation with unsaved changes. API errors and pending operations recover without fake success. Automated service and browser checks verify authorization, idempotency, search URL, publish, purchase, library, resale and Gemini explicit confirmation. Live backend/chain/IPFS/model validation is reported separately.

## Limitations
No backend or live contracts supplied. Demo downloads and open-source import verification are explicitly unavailable. Demo jobs validate UI states only and supply no real generated source ZIP. No numeric production quota is invented.
