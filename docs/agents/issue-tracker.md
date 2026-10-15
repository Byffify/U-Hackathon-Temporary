# Issue tracker: Local Markdown

Specs and tickets for U-topia live in `.scratch/` within this project.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`.
- Spec: `.scratch/<feature-slug>/spec.md`.
- Implementation tickets: one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order.
- Each implementation ticket records `What to build`, `Blocked by`, `Status`, and acceptance criteria as checkboxes.
- `Blocked by` references ticket numbers and titles, or `None (can start immediately)`.
- Triage status uses the strings in `triage-labels.md`.
- Append discussion under `## Comments` in the relevant file.

## Tracker operations

- Publish: create the spec or individual ticket files at the paths above.
- Fetch: read the referenced local file. Resolve a ticket number within its feature directory; ask if the reference is ambiguous.
- Start implementation: choose a ticket whose blockers are complete.
- Complete implementation: check verified acceptance criteria and record `Completion: complete` with a brief verification note. `Status` remains the triage classification; completion is tracked separately.
- Determine whether a blocker is complete: read its `Completion` field and acceptance criteria.
- Parent relationships: link tickets to `../spec.md`; preserve the parent spec when updating a ticket.

## Wayfinding operations

For the `wayfinder` skill, use its decision-ticket lifecycle separately from implementation tickets:

- Map: `.scratch/<effort>/map.md`.
- Decision tickets: `.scratch/<effort>/issues/<NN>-<slug>.md`.
- Record `Type: research`, `prototype`, `grilling`, or `task`.
- Record blocking ticket numbers in `Blocked by`.
- Claim an open, unblocked ticket by saving `Status: claimed` before work.
- Resolve by appending an `## Answer`, setting `Status: resolved`, and linking the answer from the map's decisions.
- A decision ticket is unblocked when all listed blockers are `resolved`; choose the lowest numbered unclaimed ticket first.
