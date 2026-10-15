# Gemini chat replaces U-Bot

Date: 2026-10-15
Status: Accepted by the user in the frontend implementation plan.
Supersedes the multi-project-only restriction of ADR-0005 and the deferred-provider decision in ADR-0006.

## Decision

Use Gemini through the backend, presented as a conversation interface. A user may explain or modify one authorized source project, or combine multiple projects. The frontend does not run an autonomous agent or call Gemini with a browser API key. Source access and source-derived sale eligibility remain backend authorization decisions.

A conversation is not permission to generate files: the user reviews the current plan, source releases, target stack, conflicts and quota estimate, then explicitly confirms generation. Changes invalidate the previous confirmation. The output is a ZIP with provenance and accurate passed/failed/not-run validation results.

Trial quota remains one shared account allowance, with no daily reset, top-ups or purchase-linked credits. Numeric allowance, model ID and metering are backend configuration. Gemini selection does not imply that a live integration exists.

## Consequences

Frontend development uses clearly labeled metadata fixtures. No demo response constitutes proof of real Gemini processing, encrypted source storage or a valid generated ZIP. Existing U-Bot specifications and proposed tickets are historical where they conflict with this ADR; the current frontend spec is .scratch/u-topia-frontend/spec.md.
