---
name: accessibility-audit
description: >-
  Post-pipeline accessibility audit protocol — when to run (after FEO and
  animation pipelines are complete), seven-section audit checklist: Semantic
  Structure, Focus Management post-animation, Reduced Motion compliance with
  per-component decision table, ARIA and Live Regions, Color and Contrast,
  Target Size, Content and Cognitive. Project-level checklists: every page,
  every interactive feature, before launch. Use when executing the
  accessibility audit gate after the FEO or animation pipeline, running
  pre-launch accessibility reviews, or verifying animated component compliance.
---

# Accessibility — Post-Pipeline Audit Protocol

**Compiled from**: ADR-0019 §Post-Pipeline Accessibility Audit, §Accessibility Checklist
**Last synced**: 2026-03-27

---

## When to Run

The accessibility audit is a **gate** that runs after both pipelines are complete:

1. **FEO pipeline** — component structure, styling, and content are finalized
2. **Animation pipeline** — scroll-driven animations, viewport reveals, transitions, and reduced motion gates are implemented

The audit verifies that the composed implementation meets all accessibility requirements. Component-level tests and axe-core in CI catch individual component issues; this audit catches composition-level issues that only emerge in the full page context.

---

## Section 1: Semantic Structure

- [ ] One `<h1>` per page; heading hierarchy has no skips (h1 → h2 → h3)
  > **Cross-component check required.** Before marking this pass, trace the heading outline across all components in render order: read `src/app/layout.tsx` → `src/app/page.tsx` → each section component in order, collecting every heading element (`<h1>`–`<h6>` and `Typography as='hN'`) in sequence. Verify the flat outline has no level skips. Do not check per-file — always check the composed page outline.
- [ ] `<main id="main-content">` wraps primary content
- [ ] All `<nav>` regions have `aria-label` (e.g., `aria-label="Main navigation"`)
- [ ] `<button>` used for actions, `<a>` for navigation — no `<div>` for interactive elements
- [ ] Skip to main content link is the first focusable element

## Section 2: Focus Management (Post-Animation)

- [ ] Tab through the entire page — focus visits all interactive elements in visual order
- [ ] Focus ring is visible on every focused element (no `outline: none` without a `focus-visible` alternative)
- [ ] Focused elements are **not obscured** by the sticky header, cookie banner, or floating panels (WCAG 2.4.11)
- [ ] `scroll-margin-top` is set on anchor targets to account for fixed header height
- [ ] When `AnimatePresence` removes an element, focus returns to a logical target (the trigger, the previous element, or the parent container)
- [ ] When animated content enters the viewport (e.g., `MotionInView`), it does not steal focus or disrupt tab order
- [ ] Overlay open → focus moves into the overlay; overlay close → focus returns to the trigger element
- [ ] Focus traps in modals/sheets are provided by Radix — no manual focus trap added on top of Radix overlays

## Section 3: Reduced Motion Compliance

Enable `prefers-reduced-motion: reduce` in browser dev tools (Chrome: Rendering → Emulate CSS media feature), then navigate the complete page. Every animated component must match:

| Component Type                   | Expected Behavior Under Reduced Motion                             |
| -------------------------------- | ------------------------------------------------------------------ |
| Dialog / Sheet enter/exit        | Fade-only — no slide or scale                                      |
| Carousel autoplay                | **Disabled entirely**                                              |
| Carousel slide transition        | Snap instantly — no slide animation                                |
| DnD settle animation             | Snap to position — no spring/ease                                  |
| Toast enter/exit                 | Fade-only — no slide from edge                                     |
| Tab panel switch                 | Instant switch — no crossfade                                      |
| Accordion expand/collapse        | Instant expand — no height animation                               |
| Scroll-to-section                | `scroll-behavior: auto` — instant jump                             |
| Command palette open/close       | Fade-only — no scale or slide                                      |
| Loading spinner                  | **Keep** — functional; simplify to opacity pulse if using rotation |
| Viewport reveal (`MotionInView`) | Content renders in final position — no entrance animation          |
| Parallax sections                | Static position — no scroll-driven movement                        |

## Section 4: ARIA & Live Regions

- [ ] Toasts use `role="status"` (success/info) or `role="alert"` (error) — verified in Sonner config
- [ ] Loading states use `aria-busy="true"` on the container and `aria-live="polite"` for the region
- [ ] Dynamically loaded content (infinite scroll, search results) announces updates via `aria-live="polite"`
- [ ] Icon-only buttons have `aria-label`; icons have `aria-hidden="true"`
- [ ] Toggle buttons use `aria-expanded` and `aria-controls`
- [ ] Tabs use `role="tablist"` / `role="tab"` / `role="tabpanel"` (Radix Tabs provides this automatically)
- [ ] Data tables have `<caption>` (or `aria-label`), `<th scope>` for headers, and `aria-sort` on sortable columns

## Section 5: Color & Contrast

- [ ] Run browser contrast checker on all text against its background (normal text ≥ 4.5:1; large text ≥ 3:1; UI components ≥ 3:1)
- [ ] Check contrast in all interactive states: default, hover, focus, active, disabled, error
- [ ] Check contrast on sections with animated backgrounds (e.g., parallax sections with color gradients where text overlays moving content)
- [ ] Error states use three signals: color + text + icon

## Section 6: Target Size

- [ ] All buttons, links (outside prose), and form controls meet 24 × 24 CSS px minimum (WCAG 2.5.8)
- [ ] Navigation items on mobile meet 44 × 44 CSS px tap target
- [ ] Icon-only buttons use padding or pseudo-element to meet minimum target size

## Section 7: Content & Cognitive

- [ ] Error messages explain what went wrong and how to fix it
- [ ] Navigation structure is consistent across pages
- [ ] All images have appropriate `alt` text (descriptive for meaningful, `alt=""` for decorative)
- [ ] Multi-step forms retain previously entered data — no re-entry required (WCAG 3.3.7)

---

## Project Accessibility Checklists

### Every Page

- [ ] `<html lang="lang-depends-on-project"...">` set correctly
- [ ] One `<h1>` per page; heading hierarchy has no skips
- [ ] `<main>` wraps primary content
- [ ] Skip to main content link exists and is the first focusable element
- [ ] All images have `alt` text (or `alt=""` for decorative)
- [ ] Color contrast meets AA (4.5:1 text, 3:1 UI components)
- [ ] Focus is visible on all interactive elements
- [ ] Focused elements not obscured by sticky/fixed UI (WCAG 2.4.11)
- [ ] All interactive elements meet 24 × 24 px minimum target size (WCAG 2.5.8)

### Every Interactive Feature

- [ ] Keyboard accessible (Tab, Enter, Space, Escape, Arrow keys where applicable)
- [ ] Focus management correct (modals trap focus, return focus on close)
- [ ] ARIA attributes correct (`aria-expanded`, `aria-label`, `aria-describedby`)
- [ ] Error states use text + icon + color — not color alone
- [ ] Loading states announced to screen readers (`aria-busy`)
- [ ] Drag interactions have single-pointer/keyboard alternative (WCAG 2.5.7)
- [ ] Reduced motion respected — `useMotionEnabled()` gates decorative animation
- [ ] Form fields allow paste; password managers work (WCAG 3.3.8)
- [ ] Multi-step forms retain previously entered data (WCAG 3.3.7)

### Before Launch

- [ ] Lighthouse Accessibility score ≥ 90
- [ ] axe-core automated tests pass with WCAG 2.2 tags — no violations
- [ ] Playwright E2E a11y tests pass (`@axe-core/playwright`)
- [ ] Manual keyboard navigation test completed (including focus-not-obscured check)
- [ ] Reduced motion test completed (enable `prefers-reduced-motion` and navigate full page)
- [ ] Screen reader test completed (VoiceOver or NVDA)
- [ ] `eslint-plugin-jsx-a11y` enabled with no warnings
