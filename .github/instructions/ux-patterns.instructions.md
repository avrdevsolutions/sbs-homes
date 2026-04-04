---
description: 'UX interaction pattern constraints — navigation semantics, CTA hierarchy, feedback accessibility, touch targets, form validation timing, and keyboard/focus rules.'
applyTo: 'src/components/**/*.{ts,tsx}, src/app/**/*.{ts,tsx}'
---

# UX Interaction Pattern Constraints

## Element Semantics

- MUST use `<button>` for actions (mutations, modal triggers, state changes) — never `<div>` or `<a href="#">` for actions
- MUST use `<a>` for navigation to a URL — never `<button>` to navigate
- MUST use semantic HTML landmarks: `<nav>`, `<main>`, `<header>`, `<footer>` for navigation regions
- Navigation `<nav>` regions MUST have an `aria-label` (e.g., `aria-label="Main navigation"`)

## CTA Hierarchy

- SHOULD use max 1 primary CTA per viewport section — demote competing CTAs to secondary or tertiary
- External links MUST use `target="_blank" rel="noopener noreferrer"` with a visual indicator
- External link screen-reader text MUST include "(opens in new tab)" via visually-hidden span or `aria-label`

## Feedback Accessibility

- Every feedback pattern MUST have an accessible announcement strategy — `aria-live="polite"`, `role="alert"`, or `role="status"`
- Error toasts for critical failures MUST use `role="alert"` (assertive) — not just `aria-live="polite"`
- SHOULD prefer inline feedback over toasts for user-initiated actions where the relevant UI is visible
- SHOULD use skeleton loading over spinner for content regions with a predictable layout

## Touch & Responsive

- MUST meet WCAG 2.5.8 minimum touch target: 24×24 CSS px; target 44×44 CSS px for interactive elements
- MUST provide a non-hover alternative for every hover-triggered interaction on touch devices
- `title` attribute is NOT an acceptable tooltip — use Radix Tooltip (shadcn/ui)

## Form UX

- MUST NOT validate on every keystroke from first interaction — validate on blur first, then on change after first error ("lazy then eager")
- MUST NOT disable the submit button before user interaction — show validation errors on submit attempt

## Animation & Primitives

- Animation timing and easing MUST follow project transition defaults
- MUST use UI primitives from ADR-0023 where they cover the use case before raw HTML

## Content Display

- Carousels MUST have visible controls — never auto-advance-only with no user control
- Auto-playing carousels MUST pause on hover, focus, and when `prefers-reduced-motion: reduce` is active; MUST provide a visible play/pause button
- Tabs MUST use Radix Tabs (via shadcn/ui) — MUST NOT build custom tab keyboard management
- Accordions MUST use Radix Accordion (via shadcn/ui) — MUST NOT build custom disclosure keyboard management
- Data tables with >5 columns MUST have a responsive strategy (horizontal scroll with sticky column, or card stack)
- Pagination state MUST be reflected in the URL (`?page=N` or cursor param) for shareability and back/forward navigation
- Every carousel, tab panel, and accordion content region MUST be announced to screen readers on change via `aria-live` or ARIA role updates
- `prefers-reduced-motion: reduce` MUST disable slide/scroll animations in carousels
- MUST NOT use JS masonry libraries (Masonry.js, Isotope) — use CSS Grid with `@supports (grid-template-rows: masonry)` progressive enhancement
- MUST NOT build custom tree keyboard navigation — follow the WAI-ARIA Tree pattern (arrow keys, type-ahead)

## Application Patterns

- CRUD edit surface MUST match edit complexity — inline for 1-3 fields, modal for 4-10, dedicated page for 10+
- Destructive actions MUST require confirmation OR undo — never silent deletion
- Drag-and-drop MUST use dnd-kit with both pointer and keyboard sensors enabled — never DnD without keyboard fallback
- Real-time update strategy MUST follow the decision tree: polling → SSE → WebSocket by freshness requirement
- Permission-gated UI MUST hide or disable inaccessible actions — never show then reject
- Onboarding flows MUST be dismissible and skippable — never block the user from the product
- Context menus MUST have a visible button alternative (kebab/meatball) — never right-click-only
- Keyboard shortcuts MUST NOT conflict with browser/OS shortcuts — never override ⌘C, ⌘V, ⌘T, or ⌘W
- Search, filter, and pagination state SHOULD be reflected in the URL

## Library Requirements

- Toast notifications MUST use Sonner — never build a custom toast system or use react-hot-toast or react-toastify
- Carousels and sliders MUST use Embla Carousel — never build custom slide logic
- Data tables with sort, filter, or pagination MUST use TanStack Table
- Command palette MUST use cmdk — never build custom fuzzy search UI
- Shareable UI state (active tab, filter, sort, search query) SHOULD use URL state (nuqs or useSearchParams)
- Interactive components MUST be tested with RTL + `@testing-library/user-event` for keyboard and focus coverage

## Implementation Boundaries

- `'use client'` MUST be placed only on the smallest interactive wrapper — extract to separate files with `'use client'` on line 1; server component retains layout, content, and data fetching
- Focus traps for Dialog, Sheet, and AlertDialog MUST use Radix's built-in focus trap — never implement manual focus traps for overlay components
- Interactive component transitions MUST respect `useMotionEnabled()` — gate decorative animations; functional transitions (overlay appearing) must always occur
- Props crossing the server/client boundary MUST be serializable — no functions, class instances, or `Date` objects; use ISO strings for dates
- Radix and UI primitives MUST be imported from `@/components/ui/*` barrels — never from `@radix-ui/*` directly in feature or layout code

## Pattern Selection

- MUST use decision trees from skills `ux-navigation`, `ux-cta-feedback`, `ux-content-states`, `ux-form-patterns`, `ux-responsive`, `ux-focus-keyboard`, `ux-page-patterns`, `ux-carousels`, `ux-tabs-accordions`, `ux-data-tables`, `ux-content-display`, `ux-display-indicators`, `ux-crud-flows`, `ux-search-patterns`, `ux-drag-drop`, `ux-realtime-dashboard`, `ux-data-file-management`, `ux-user-settings-onboarding`, `ux-app-chrome` — don't invent ad-hoc patterns
