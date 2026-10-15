---
version: alpha
name: U-topia
description: An editorial showcase of websites and the people who build them.
colors:
  page: '#f5f5f3'
  surface: '#ffffff'
  ink: '#131922'
  text: '#2b313b'
  muted: '#62666e'
  border: '#dedfdd'
  lime: '#d9f46b'
  lime-deep: '#365123'
  lilac: '#d8c3fa'
  peach: '#ffc7b4'
  aqua: '#bce5e1'
  yellow: '#ffe6a1'
  dark-muted: '#b9bec4'
  danger: '#b2312f'
  success: '#247043'
  blue: '#d9e9f6'
typography:
  display: '"Manrope", "Arial", sans-serif'
  body: '"DM Sans", "Arial", sans-serif'
  mono: '"SFMono-Regular", "Consolas", monospace'
rounded:
  small: '8px'
  medium: '16px'
  card: '24px'
  panel: '32px'
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '32px'
  section: '112px'
  container: '1200px'
components:
  button: 'Pill, 48px minimum height, ink primary and outlined secondary.'
  card: 'White product surface, thin border, 24px corners.'
  dialog: 'Native dialog with shared close, focus return, and bounded scrolling.'
---

# U-topia design system

## Overview

### Creative North Star

An independent developer's portfolio wall brought into a working marketplace. Follow the provided Fastwork Selling UX/UI reference's spacious editorial sequence, floating portfolio previews, interactive creator showcase, dark pain-point interlude, fee panel, and closing invitation. The memorable signature is a constellation of miniature original websites around the hero, then the same sites reappearing as selectable source features in U-Bot.

### Product context and register

- Audience: independent web creators and buyers who want usable source projects. Market: global hackathon audience; no Japan-market assumption.
- Language: English UI, following the agreed product decisions. The Thai reference describes design, not a requirement to change the product locale.
- Register: React + JavaScript creator marketing landing page with product demonstrations, built with Vite. Real purchase, authentication, encryption, publication, and model integrations remain separate implementation tickets.
- Reference: `FASTWORK_SELLING_UX_UI_SPEC_TH.md`. Business sources: `docs/product-decisions.md`, `GLOSSARY.md`, and ADRs 0001–0010.
- Do not reuse Fastwork names, photos, logos, fee rules, unverifiable ratings, subscriber counts, or income claims.
- No artificial countdown: the hackathon submission deadline is not a customer promotion. No language selector for an untranslated second locale.

## Colors

The light canvas and ink CTA follow the supplied reference. Lime marks the chosen creative idea, lilac and peach distinguish sample projects, and aqua/yellow distinguish notes. Accents are bounded content areas, not full-page gradients. Muted text retains readable contrast. Dark sections use surface white and dark-muted text.

## Typography

Manrope is the expressive display face; DM Sans is the quieter body and control face. Arial fallbacks preserve the page if remote fonts are unavailable. Monospace is reserved for file and source labels. Display is fluid between 40px and 72px, section headings between 34px and 52px; body remains at least 16px. Avoid all-caps paragraphs and long narrow measures.

## Layout

The container is 1200px with 48px desktop and 20px phone gutters. Hero copy is centered with miniature website previews at the edges, safely separated from text. At 1024px the previews become a lower strip; at 640px the page stacks. Creator showcase becomes a horizontally scrollable tab strip with a single-column card. Feature sections alternate image and copy on desktop and stack on phones. There is natural document scrolling, no fixed-height page shell, and no horizontal page overflow at 320px.

## Elevation & Depth

Preview cards use restrained shadows and slight rotation. Functional controls and primary content are stable, never rotated. A thin border does more work than shadows. Sticky header uses a solid readable surface. Dialogs own their scrolling and leave controls reachable.

## Shapes

Pill buttons, 24px cards, 32px editorial panels. Tiny browser chrome uses the small radius. Corners and focus treatments are inherited from shared tokens.

## Components

- Buttons and links: at least 44px touch targets; primary ink, secondary outlined, visible focus, hover, pressed, disabled, and stable busy geometry. Use text and icons together for important actions.
- Tabs: shared automatic-activation roving tabindex with Arrow/Home/End keyboard support. Selected tabs expose aria-selected and label their panel. Creator/profile switching reserves a stable content region.
- Dialogs: native `dialog.showModal()` provides modal background isolation and keyboard containment; shared controller handles Escape, backdrop close, scroll lock, and trigger focus restoration. No browser alert/confirm/prompt.
- Project samples: all sample creators and work are explicitly illustrative. No fabricated reviews or platform usage counts. Previewing a sample is not buying it.
- Wallet: connection requests real injected wallet account access only. Connection is not backend authentication. No payment/signing request in this landing implementation.
- U-Bot: interactive feature/stack plan example, clearly labeled as an example. No generation, quota deduction, fake download, or model-success claim.
- Fee calculator: uses the agreed 90/10 split in test AVAX and says purchase gas comes from the platform share. It is an illustrative calculation, not a quote from a deployed contract.
- Scrollbars: all page-owned scroll areas inherit a visible tokenized baseline. Forced colors retain system behavior.
- Motion: 180–240ms feedback and one gentle hero entrance. Reduced motion disables transform animation and smooth scrolling. Content never depends on animation to be revealed.
- Iconography: original simple inline SVG, 1.7px strokes, decorative icons aria-hidden. Text labels remain visible on consequential actions.
- Content: short specific English from the user's perspective. System-unavailable states explain the next action and are not disguised as successes.

## Token ownership and runtime mapping

Model A: this file's scalar frontmatter token groups are canonical. `scripts/design-tokens.mjs` generates `src/styles/tokens.css`; do not edit that generated output. `npm run check:design` validates the groups, resolves token references, and detects drift. Colors map to `--color-*`, typography to `--font-*`, rounded to `--radius-*`, spacing to `--space-*`. `src/styles/index.css` consumes those variables. `components` records recipes rather than a second token-value system.

## Do's and Don'ts

- Do repeat the same creator CTA and destination, with placement tracking that never includes wallet addresses.
- Do show meaningful example products before long explanatory copy.
- Do adapt the reference to U-topia's IPFS, trial quota, token rights, and fee decisions.
- Don't present sample portfolio data as real platform traction.
- Don't make claims that public browser code is secret or downloaded source can be recalled.
- Don't imply chain transactions, AI generation, or publishing are live in this frontend-only implementation.
