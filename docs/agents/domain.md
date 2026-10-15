# Domain docs

U-topia uses a single-context layout: one root `GLOSSARY.md` and architecture decision records under `docs/adr/`.

## Before exploring or designing

1. Read the root `GLOSSARY.md` if it exists.
2. Read ADRs under `docs/adr/` that apply to the area being changed.
3. If these files are absent, continue. Create them when domain terms or architectural decisions are resolved through `domain-modeling` or `grill-with-docs`.

## Vocabulary and decisions

- Use glossary terms consistently in specs, tickets, code, and tests.
- When a domain term is ambiguous or missing, resolve it through `domain-modeling` and record the agreed definition.
- Surface a conflict with an existing ADR explicitly before replacing its decision.
- Record durable architectural decisions as numbered Markdown files under `docs/adr/`.
