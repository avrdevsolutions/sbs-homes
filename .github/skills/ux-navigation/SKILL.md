---
name: ux-navigation
description: >-
  Navigation patterns — top nav bar mobile menu types (≤4/5-8/9+ items), sticky behavior decision
  tree, scroll-to-section anchors, breadcrumbs, back-to-top, sidebar (persistent/collapsible/
  off-canvas decision tree), scroll spy with IntersectionObserver, dark mode toggle (two-way/
  three-way/icon decision tree, next-themes), command palette ⌘K (cmdk). Includes ARIA, responsive
  breakpoints, and anti-patterns for each. Use when building navigation bars, sidebar menus,
  breadcrumb trails, scroll anchor links, dark mode switchers, scroll spy indicators, or command
  menus.
---

# UX — Navigation Patterns

**Compiled from**: ADR-0024 §1 (Navigation), §7 Navigation Anti-Patterns
**Last synced**: 2026-03-21

---

## 1.1 Top Navigation Bar

**Use:** Every public-facing site as the primary wayfinding mechanism.
**Don't use:** Full-screen immersive experiences (games, media players) where nav is intentionally hidden.

#### Decision Tree — Mobile Menu Type

```
How many nav items?
  → ≤4 items: Bottom tab bar (mobile) + horizontal nav (desktop)
  → 5–8 items: Hamburger → slide-out drawer (mobile) + horizontal nav (desktop)
  → 9+ items or nested categories: Hamburger → full-screen overlay (mobile) + mega menu (desktop)
```

#### Decision Tree — Sticky Behavior

```
Is the page long (>2 viewport heights)?
  → YES: Is the nav critical for in-page nav (anchor links)?
    → YES: Always-sticky — nav stays visible at all times
    → NO: Hide-on-scroll-down, show-on-scroll-up (saves viewport space)
  → NO: Static — no sticky needed
```

**Accessibility:**

- `<nav aria-label="Main navigation">` wrapping the nav region
- Mobile toggle: `aria-expanded`, `aria-controls`, `aria-label="Menu"`
- Desktop nav: `<a>` for page links, `<button>` for dropdown triggers
- Skip-to-content link as first focusable element

**Responsive:**

- Desktop (≥1024px): Horizontal link row with dropdowns
- Tablet (768–1023px): Priority+ pattern (show top 3-4, overflow menu for rest)
- Mobile (<768px): Hamburger toggle + drawer/overlay — never hide links without alternative

---

## 1.2 Scroll-to-Section

**Use:** Single-page layouts or landing pages with anchor navigation.
**Don't use:** Multi-page apps where sections live on different routes.

- Use `<a href="#section-id">` for scroll links (progressive enhancement, works without JS)
- Apply `scroll-behavior: smooth` via CSS (or Framer Motion `scrollIntoView` for animated scroll)
- Set `scroll-margin-top` on target sections to account for sticky header height
- Optionally update URL hash on scroll using `IntersectionObserver` with `history.replaceState`

**Accessibility:** Active section indicator uses `aria-current="true"` on the corresponding nav link. CSS `scroll-behavior: smooth` respects `prefers-reduced-motion: reduce` automatically.

---

## 1.3 Breadcrumbs

**Use:** Hierarchical content with 3+ depth levels (e-commerce, documentation, nested dashboards).
**Don't use:** Flat site structures with 1-2 levels, marketing/landing pages.

- `<nav aria-label="Breadcrumb">` with `<ol>` list
- Current page: `aria-current="page"` on the last item
- Separator is decorative: `aria-hidden="true"` on separator elements
- Truncate middle items on mobile (show first + last 2, ellipsis for middle)

---

## 1.4 Back-to-Top

**Use:** Long-scroll pages (>3 viewport heights) where re-scrolling to top is a common action.
**Don't use:** Short pages; pages with always-visible sticky nav where "Home" link serves the same purpose.

- Appears after scrolling past 1-2 viewport heights
- Fixed position, bottom-right corner
- `<button aria-label="Back to top">` — not an anchor
- Focus moves to `<body>` or `<main>` on activation
- Fade in/out on viewport reveal
- Ensure it doesn't overlap mobile bottom nav if using bottom tab bar

---

## 1.5 Sidebar Navigation

**Use:** Applications with 10+ navigation items or nested section groups (admin dashboards, docs, settings).
**Don't use:** Marketing sites; simple apps with ≤8 flat navigation items.

#### Decision Tree — Sidebar Behavior

```
Is the screen ≥1280px?
  → YES: Persistent sidebar (always visible)
  → NO: Is it ≥768px?
    → YES: Collapsible sidebar (icon-only collapsed state, expand on hover or toggle)
    → NO: Off-canvas drawer (hamburger toggle, overlay on open)
```

**Accessibility:**

- `<nav aria-label="Sidebar navigation">`
- Collapsible: toggle button with `aria-expanded`
- Off-canvas: focus trap when open, Escape to close, return focus to trigger
- Active item: `aria-current="page"`

---

## 1.6 Scroll Spy (IntersectionObserver)

**Use:** Pages with scroll-to-section navigation (§1.2) where the nav highlights the currently visible section.
**Don't use:** Short pages with no anchor navigation; multi-page apps with route-based sections.

#### Decision Tree — Scroll Spy Strategy

```
Is the page a single-scroll landing page with anchor nav?
  → YES: Use IntersectionObserver on each section
    → Are sections tall enough to fill the viewport?
      → YES: threshold: 0.3–0.5 (section must be 30–50% visible)
      → NO: threshold: 0 with rootMargin to detect entry at header bottom
  → NO: Is it documentation with a sidebar table of contents?
    → YES: IntersectionObserver on each heading (h2, h3) — highlight nearest heading above scroll
    → NO: Use route-based active states — don't use scroll spy
```

- `rootMargin` must account for sticky header height (e.g., `rootMargin: '-80px 0px -60% 0px'`)
- Use `history.replaceState` for optional URL hash updates — avoids polluting browser history
- Debounce or throttle when multiple sections can intersect; use the topmost visible section
- Mobile horizontal pill bar: auto-scroll the active pill into view when it changes

**Accessibility:** Active nav item: `aria-current="true"`. Scroll spy updates are visual only — do NOT move focus or announce changes (interrupts reading).

---

## 1.7 Dark Mode Toggle

**Use:** Any site supporting light and dark color schemes. Lives in navigation header or settings.
**Don't use:** Sites with a single fixed color scheme where dark mode is not planned.

- Three states: Light, Dark, System (follows `prefers-color-scheme`)
- Default to **System** — respect OS preference out of the box
- Persist preference in `localStorage` (or cookie for SSR)
- Apply via `class` attribute on `<html>` for Tailwind `dark:` variant compatibility
- Flash prevention: apply before first paint — use `next-themes`

#### Decision Tree — Toggle UI

```
Is dark mode a core feature (developer tools, code editor, creative app)?
  → YES: Three-way toggle (Light / Dark / System) — visible in header
  → NO: Is it a marketing/content site?
    → YES: Two-way toggle (Light / Dark) in header — System is default but not shown
    → NO: Simple icon button — sun/moon icon, cycles through modes
```

**Accessibility:**

- `aria-label="Switch to dark mode"` (or current target state)
- Three-way: `role="radiogroup"` or segmented control
- Ensure all color tokens maintain WCAG AA contrast in both themes

**State management:** Use `next-themes` — handles persistence, flash prevention, and system preference sync. Manual alternative: Zustand `persist` middleware.

---

## 1.8 Command Palette (⌘K)

**Use:** Applications with 10+ actions/navigation targets where keyboard-driven search helps: dashboards, docs, admin panels, developer tools.
**Don't use:** Simple marketing sites with <10 pages; content-only sites with no actions.

- Trigger: `⌘K` (Mac) / `Ctrl+K` (Windows/Linux) + visible trigger button showing the shortcut hint
- Opens as centered dialog with auto-focused search input
- Fuzzy search across: navigation pages, recent items, actions
- Results grouped by category (Pages, Actions, Recent)
- Arrow keys navigate, Enter selects, Escape closes

#### Decision Tree — Command Palette Scope

```
Is this an application with user data and multiple workflows?
  → YES: Full palette — navigation + actions + search (pages, recent, settings, theme toggle)
  → NO: Is it a documentation site?
    → YES: Search-focused palette — page search + heading search
    → NO: Skip command palette — standard nav is sufficient
```

**Accessibility:**

- Dialog: `role="dialog"` with `aria-label="Command menu"` — focus trap while open
- Search input: `role="combobox"` with `aria-expanded`, `aria-controls` pointing to result list
- Result list: `role="listbox"`, each result `role="option"` with `aria-selected`
- Trigger button shortcut hint: use `<kbd>` element

**Responsive:** Desktop: centered dialog (480–640px wide). Mobile: full-width bottom sheet or full-screen overlay with visible search/command button in header.

**Library:** `cmdk` by Paco Coursey — unstyled, accessible, ~3kB gzipped. Pairs with Radix Dialog.

---

## Anti-Patterns

| ❌ Don't                                                  | ✅ Do                                                     | Why                                              |
| --------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| Hide nav links on mobile with no hamburger alternative    | Provide mobile nav (drawer, overlay, bottom tabs)         | Mobile users can't navigate — they must have a mobile alternative |
| Use hover-only dropdown navigation                        | Make dropdowns click/tap-triggered                        | Hover is unavailable on touch                    |
| Put 10+ items in top nav without grouping                 | Group into categories, use mega menu or sidebar           | Cognitive overload                               |
| Auto-scroll user to a section on page load without intent | Scroll only on explicit user action (clicking nav anchor) | Disorienting — user expects to land at page top  |
