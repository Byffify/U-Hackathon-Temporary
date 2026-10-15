# 08 - Landing scroll artwork motion

Parent: [Frontend spec](../spec.md)
Status: ready-for-agent
What to build: Add selected scroll-responsive component movement to the existing landing without changing flow, layout or design tokens.
Blocked by: None (can start immediately)
Completion: complete

## Motion thesis

Whole sections slide upward into view, settle, then slide upward out as native scrolling continues. Scrolling back reverses the movement. Stable wrappers provide scroll geometry; only their contents move. A section containing keyboard focus stays neutral. Hero preview drift and its underline entrance remain; earlier component entrances are superseded. No scroll hijacking, snapping, autoplay loop or additional dependency.

## Acceptance criteria
- [x] Hero website cards move a bounded distance relative to native page scroll, preserving existing base rotations.
- [x] Nine landing sections slide in/out reversibly with native scroll; hero underline retains its once-only entrance.
- [x] Keyboard focus holds its section neutral and preserves the focused control.
- [x] Phone movement amplitude is reduced; no horizontal document overflow at320px.
- [x] Default HTML stays visible and functional if animation/IntersectionObserver is unavailable.
- [x] Reduced-motion preference disables enhancements initially and cancels running motion when changed.
- [x] Observers, passive listeners, animation frames and animations are cleaned up when leaving the landing.
- [x] Existing routes, navigation, confirmation flows and design token definitions remain unchanged.

## Verification evidence

New lifecycle/reduced-motion and section-progress tests were observed red before implementation and green afterwards. Browser tests verify computed section entry/exit/reversal, focus stability, hero motion, route cleanup, preference changes and320px usability. Current checks:25 node tests,17 UI tests,17 browser tests, token/syntax checks, format check and production build pass. Desktop1440px and mobile390px screenshots visually inspected. No physical-device low-end performance trace was performed; no claim of universal frame-rate performance.

## Reference refinement: u-topia.com, 2026-10-16

User supplied https://u-topia.com/ as the motion reference. Inspected mobile and desktop rendering: desktop uses sticky full-screen sections with later sections covering earlier ones. Replaced desktop bounded section translation with sticky panel layering at1024px and above. Each panel pins only after its full height can be read; subsequent panels slide over it through native scroll. Included the manifesto strip in the same stacking sequence. Reuses existing page surface token; section order, copy, routes and controls are preserved. No reference assets or palette copied.

Below1024px retain bounded reversible slides. Reduced motion removes pinning and animations, including live preference changes. Keyboard Tab switches the stack to normal document flow so covered controls remain reachable; pointer interaction restores the stack. ResizeObserver recalculates pin positions after viewport/content changes. Cleanup removes all enhancement classes and inline pin positions.

Verified:25 node tests,17 UI tests,18 browser tests; check, format and build passed. Browser assertions cover pin position, next-panel movement, reverse scrolling, keyboard alternative, preference cleanup and existing marketplace flows.
