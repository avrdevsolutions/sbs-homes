---
approved: true
source_recommendations: ux-analyst.recommendations.md
source_manifest: ui-builder.manifest.json
---

# UX Brief

## Navigation

- **Deferred** — navigation design is being reconsidered. `NavSpineClient` remains as bare skeleton. No navigation interactions to implement.

## Global: Smooth Scroll

- **Accepted** — add `scroll-behavior: smooth` to `html` in `globals.css`. Include `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }` for explicit reduced-motion reset.

## Global: Skip Link

- **Accepted** — add visually-hidden "Skip to main content" link as first focusable element in `layout.tsx`, before NavSpine. Uses `sr-only` with `focus:not-sr-only` override. `<main>` gets `id="main-content"`.

## Global: Back-to-Top Button

- **Accepted** — fixed back-to-top button appears after scrolling past hero (~100vh). Bottom-left on desktop (avoids nav spine area), bottom-right on mobile. `<button aria-label="Back to top">`. Scrolls to top and moves focus to body/hero heading. Fades in/out based on scroll position.

## Global: Focus Ring Audit

- **Accepted** — audit all interactive elements for visible `focus-visible:ring-*` styles using project tokens. Priority on dark sections (Act II/III). Verify ghost button variant and all link elements have explicit focus ring styles.

## Global: Desktop Content Offset

- **Accepted** — add `lg:pr-14` (3.5rem) to `<body>` in root layout for nav spine clearance. Full-bleed sections (hero, technology divider) extend backgrounds under this zone; text content stays within container.

## Section: Hero (01)

- **Accepted** — no additional work needed. CTA anchor `#exterior-views` is covered by global smooth scroll CSS. No client boundary required.

## Section: Exterior Views (02)

- **Accepted** — when scroll-driven animation is implemented, include a reduced-motion fallback: single static representative exterior photograph at same aspect ratio as animation canvas, with descriptive alt text.

## Section: Interior Lifestyle (03)

- **Accepted** — same pattern as Exterior Views. Reduced-motion fallback: single well-composed interior photograph (living area or kitchen).

## Section: Floor Plans (04)

- **Accepted** — when real plan assets arrive: two-state segmented control ("Ground Floor" / "First Floor") above plan area. Each plan image clickable to open full-screen lightbox overlay. Lightbox closes via close button, Escape key, or click outside. Mobile: full-screen overlay with close button. Keyboard accessible.

## Section: Technology Divider (05)

- **Accepted** — no action. Intentionally non-interactive pacing device.

## Section: Construction Overview (06)

- **Accepted** — when animation is implemented: reduced-motion fallback showing the 5 structural components as a static labelled diagram or ordered list (foundation slab, external walls, internal walls, floor cassette, roof cassette). Add contextual link to Component Details section below ("See full layer specifications ↓").

## Section: Assembly Sequence (07)

- **Accepted** — when animation is implemented: persistent step progress indicator ("Step 3 of 7" or 7-segment progress bar) updating as scroll-driven animation advances. Implemented as `aria-live="polite"` region. Reduced-motion fallback: seven numbered steps as a list with brief descriptions.

## Section: Structural Floor Plans (08)

- **Accepted** — when structural plan assets arrive: layer visibility toggles per structural system (exterior walls, internal walls/panels, floor cassette, roof structure). Each toggle uses same pip colours as Component Details section. Desktop: horizontal toggle strip above plan. Mobile: horizontally scrollable toggle strip.

## Section: Component Details (09)

- **Accepted** — on mobile (<768px): collapsible cards. Card header (title + key metric) acts as toggle trigger, starts collapsed. Chevron or "+" indicator signals interactivity. `aria-expanded` attribute on header. Keyboard: Enter/Space to toggle. On desktop (≥768px, 2-column grid): all cards expanded, no collapse interaction.

## Section: Footer

- **Accepted** — external website link gets `target="_blank"` with `rel="noopener noreferrer"` plus visually-hidden "(opens in new tab)" text. Email link uses `mailto:` href. All links get `focus-visible:ring-*` styles matching project tokens.
