# ADR-0024: UX Interaction Patterns (Core)

**Status**: Accepted
**Date**: 2026-03-21
**Supersedes**: N/A

---

## Context

The project has decisions for component structure (ADR-0004), forms (ADR-0012), accessibility (ADR-0019), state management (ADR-0020), and UI primitives (ADR-0023). What's missing is the **UX decision layer** — given a page or feature, which interaction patterns apply, when, and why.

Without this, agents and developers make ad-hoc interaction decisions: inconsistent mobile menus, mixed validation timing, missing empty states, CTAs that use anchors when they should use buttons. This ADR provides pattern knowledge and decision trees for **core UX interactions universal to any web application**.

This is **Part 1** of a UX knowledge series:

| ADR | Scope |
|-----|-------|
| **ADR-0024** (this) | Core interaction patterns — navigation, CTAs, feedback, form UX, responsive, keyboard/focus |
| ADR-0025 (future) | Content display — carousels, tabs, accordions, galleries, data tables |
| ADR-0026 (future) | Application-specific — CRUD, dashboards, search, drag-and-drop |
| ADR-0027 (future) | Component APIs — implementation code and component interfaces |

## Decision

**Adopt standardized UX interaction patterns with decision trees for navigation, CTA hierarchy, feedback, form UX timing, responsive adaptation, and keyboard/focus management. Pattern selection is driven by structural triggers — what about the page suggests the pattern.**

---

## Rules

| Rule | Level |
|------|-------|
| Use the decision trees in this ADR to select interaction patterns — don't invent ad-hoc patterns | **MUST** |
| Every interactive element must be keyboard accessible (ADR-0019) | **MUST** |
| Every feedback pattern must have an accessible announcement strategy (`aria-live`, `role="alert"`) | **MUST** |
| Touch targets must meet WCAG 2.5.8 minimum (24×24 CSS px), target 44×44 CSS px | **MUST** |
| Hover-triggered content must have a non-hover alternative on touch devices | **MUST** |
| External links open in new tab with `rel="noopener noreferrer"` and visual indicator | **MUST** |
| Use `<button>` for actions, `<a>` for navigation — never `<div>` for either (ADR-0019) | **MUST** |
| Use semantic HTML landmarks (`<nav>`, `<main>`, `<header>`, `<footer>`) for navigation regions | **MUST** |
| CTA hierarchy uses max 1 primary CTA per viewport section | **SHOULD** |
| Prefer inline feedback over toasts for user-initiated actions with visible context | **SHOULD** |
| Use skeleton loading over spinner for content regions with known layout | **SHOULD** |
| Animation timing and easing follow project transition defaults | **MUST** |
| UI primitives from ADR-0023 are used where they cover the use case | **MUST** |

---

## 1. Navigation

### 1.1 Top Navigation Bar

**When to use:** Every public-facing site. It's the primary wayfinding mechanism.

**When NOT to use:** Full-screen immersive experiences (games, media players) where nav is intentionally hidden until interaction.

#### Decision Tree — Mobile Menu Type

```
How many nav items?
  → ≤4 items: Bottom tab bar (mobile) + horizontal nav (desktop)
  → 5-8 items: Hamburger → slide-out drawer (mobile) + horizontal nav (desktop)
  → 9+ items or nested categories: Hamburger → full-screen overlay (mobile) + mega menu (desktop)
```

#### Decision Tree — Sticky Behavior

```
Is the page long (>2 viewport heights)?
  → YES: Is the nav critical for in-page navigation (anchor links)?
    → YES: Always-sticky — nav stays visible
    → NO: Hide-on-scroll-down, show-on-scroll-up (saves viewport space)
  → NO: Static — no sticky needed
```

**Accessibility:**
- `<nav aria-label="Main navigation">` wrapping the nav region
- Mobile toggle: `aria-expanded`, `aria-controls`, `aria-label="Menu"` (per ADR-0019)
- Desktop nav items use `<a>` for page links, `<button>` for dropdown triggers
- Skip-to-content link as first focusable element (ADR-0019)

**Responsive:**
- Desktop (≥1024px): Horizontal link row with dropdowns
- Tablet (768–1023px): May compress to priority+ pattern (show top 3-4, overflow menu for rest)
- Mobile (<768px): Hamburger toggle + drawer/overlay — never hide links without alternative (ADR-0019 forbids this)

**Reference:** Vercel uses transparent-to-solid sticky nav on scroll. Stripe uses always-sticky with shrink animation on scroll. Linear uses sidebar nav for app views, top nav for marketing.

### 1.2 Scroll-to-Section

**When to use:** Single-page layouts or landing pages with distinct sections that benefit from anchor navigation.

**When NOT to use:** Multi-page apps where sections live on different routes.

**Pattern:**
- Use `<a href="#section-id">` for scroll links (progressive enhancement — works without JS)
- Apply `scroll-behavior: smooth` via CSS (or Framer Motion `scrollIntoView` for animated scroll)
- Set `scroll-margin-top` on target sections to account for sticky header height
- Update URL hash on scroll (optional — `IntersectionObserver` tracks active section)

**Accessibility:**
- Scroll links are regular anchors — keyboard accessible by default
- Active section indicator uses `aria-current="true"` on the corresponding nav link
- `scroll-behavior: smooth` respects `prefers-reduced-motion: reduce` automatically in CSS

**Responsive:**
- Same behavior across breakpoints — scroll targets work universally
- On mobile, a sticky section nav (horizontal scrollable pill bar) replaces desktop sidebar anchors

### 1.3 Breadcrumbs

**When to use:** Hierarchical content with 3+ depth levels (e-commerce categories, documentation, nested dashboards).

**When NOT to use:** Flat site structures with 1-2 levels. Marketing/landing pages.

**Pattern:**
- Use `<nav aria-label="Breadcrumb">` with `<ol>` list
- Current page: `aria-current="page"` on the last item
- Separator is decorative: `aria-hidden="true"` on separator elements
- Truncate middle items on mobile (show first + last 2, ellipsis for middle)

**Reference:** Shopify admin uses breadcrumbs for product → collection → variant navigation. GitHub uses breadcrumbs for repo → folder → file.

### 1.4 Back-to-Top

**When to use:** Long-scroll pages (>3 viewport heights) where re-scrolling to top is a common action.

**When NOT to use:** Short pages. Pages with always-visible sticky nav (where "Home" link serves the same purpose).

**Pattern:**
- Appears after scrolling past 1-2 viewport heights (threshold trigger)
- Fixed position, bottom-right corner (avoiding content overlap)
- Smooth scroll to top on click
- Fade in/out with animation (viewport reveal pattern)

**Accessibility:**
- `<button aria-label="Back to top">` — not an anchor
- Focus moves to `<body>` or `<main>` element on activation
- Visible focus ring on keyboard focus

**Responsive:**
- Same behavior on all breakpoints
- Ensure it doesn't overlap mobile bottom navigation if using bottom tab bar

### 1.5 Sidebar Navigation

**When to use:** Applications with 10+ navigation items or nested section groups (admin dashboards, documentation, settings).

**When NOT to use:** Marketing sites. Simple apps with ≤8 flat navigation items.

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

**Reference:** Linear uses collapsible sidebar with smooth width transition. Notion uses persistent sidebar with drag-to-resize. Shopify admin uses off-canvas sidebar on mobile.

### 1.6 Scroll Spy (IntersectionObserver)

**When to use:** Pages with scroll-to-section navigation (§1.2) where the nav should highlight the currently visible section as the user scrolls.

**When NOT to use:** Short pages with no anchor navigation. Multi-page apps where sections live on separate routes.

**Pattern:**
- Create an `IntersectionObserver` targeting each section `id` with a `rootMargin` that accounts for sticky header height (e.g., `rootMargin: '-80px 0px -60% 0px'`)
- When a section enters the viewport threshold, update the active nav item
- Update URL hash on scroll (optional — use `history.replaceState` to avoid polluting history)
- Debounce or throttle if multiple sections can intersect simultaneously — use the topmost visible section

#### Decision Tree — Scroll Spy Strategy

```
Is the page a single-scroll landing page with anchor nav?
  → YES: Use IntersectionObserver on each section
    → Are sections tall enough to fill the viewport?
      → YES: threshold: 0.3-0.5 (section must be 30-50% visible)
      → NO: threshold: 0 with rootMargin to detect entry at header bottom
  → NO: Is it documentation with a sidebar table of contents?
    → YES: Use IntersectionObserver on each heading (h2, h3) — highlight nearest heading above scroll position
    → NO: Don't use scroll spy — use route-based active states
```

**Accessibility:**
- Active nav item: `aria-current="true"` on the highlighted link
- Scroll spy updates are visual only — don't move focus or announce changes (it would interrupt reading)
- Ensure the nav is keyboard accessible independently of scroll spy state

**Responsive:**
- Same IntersectionObserver logic on all breakpoints
- Mobile horizontal pill bar: auto-scroll the active pill into view when it changes
- Adjust `rootMargin` if the sticky header height differs between mobile and desktop

**Reference:** Stripe documentation uses scroll spy for sidebar table of contents. Vercel docs highlight the current heading in a right sidebar. MDN uses scroll spy on article headings.

### 1.7 Dark Mode Toggle

**When to use:** Any site that supports light and dark color schemes. The toggle lives in the navigation header or settings area.

**When NOT to use:** Sites with a single fixed color scheme where dark mode is not planned.

**Pattern:**
- Three states: Light, Dark, System (follows `prefers-color-scheme`)
- Default to **System** — respect user's OS preference out of the box
- Persist preference in `localStorage` (or cookie for SSR) to survive page refreshes
- Apply theme via `class` attribute on `<html>` for Tailwind `dark:` variant compatibility (per ADR-0002)
- Prevent flash of wrong theme on load — apply before first paint via inline script or `next-themes`

#### Decision Tree — Toggle UI

```
Is dark mode a core feature (e.g., developer tools, code editor, creative app)?
  → YES: Three-way toggle (Light / Dark / System) — visible in header
  → NO: Is it a marketing/content site?
    → YES: Two-way toggle (Light / Dark) in header — System is default but not shown
    → NO: Simple icon button in header — sun/moon icon, cycles through modes
```

**Accessibility:**
- Toggle button: `aria-label="Switch to dark mode"` (or current target state)
- Icon-only toggle: pair icon with `aria-label` — don't rely on icon alone
- Three-way: use a dropdown menu or segmented control with `role="radiogroup"`
- `color-scheme: dark` CSS property ensures native form controls adapt
- Ensure all color tokens maintain WCAG AA contrast in both themes (ADR-0002, ADR-0019)

**Responsive:**
- Same toggle on all breakpoints
- On mobile, include in the hamburger menu if header space is tight
- Transition: use `transition-colors duration-200` on `<html>` for smooth theme change, or disable transitions during switch to avoid visual noise (configurable via `next-themes` `disableTransitionOnChange`)

**State management:** `next-themes` handles persistence, flash prevention, and system preference sync. For manual implementation, use Zustand `persist` middleware (per ADR-0020 which already shows a theme store example).

**Reference:** Vercel uses a dropdown with Light/Dark/System. Linear auto-detects System. Stripe docs use a simple toggle icon.

### 1.8 Command Palette / ⌘K

**When to use:** Applications with 10+ possible actions or navigation targets where users benefit from keyboard-driven search: dashboards, documentation sites, admin panels, developer tools.

**When NOT to use:** Simple marketing sites with <10 pages. Content-only sites with no actions. Sites where the primary audience doesn't expect keyboard shortcuts.

**Pattern:**
- Trigger: `⌘K` (Mac) / `Ctrl+K` (Windows/Linux) keyboard shortcut — also provide a visible trigger button in the nav bar showing the shortcut hint
- Opens as a centered dialog with search input auto-focused
- Fuzzy search across: navigation pages, recent items, actions ("Create project", "Toggle dark mode")
- Results grouped by category (Pages, Actions, Recent)
- Arrow keys navigate results, Enter selects, Escape closes
- Close on action execution — navigate or perform the selected action

#### Decision Tree — Command Palette Scope

```
Is this an application with user data and multiple workflows?
  → YES: Full command palette — navigation + actions + search
    → Include: pages, recent items, settings, user actions, theme toggle
  → NO: Is it a documentation or content-heavy site?
    → YES: Search-focused palette — page search + heading search
    → NO: Skip command palette — standard nav is sufficient
```

**Accessibility:**
- Dialog: `role="dialog"` with `aria-label="Command menu"` — focus trap while open
- Search input: `role="combobox"` with `aria-expanded`, `aria-controls` pointing to result list
- Result list: `role="listbox"`, each result `role="option"` with `aria-selected`
- Keyboard: Arrow Up/Down to navigate, Enter to select, Escape to close
- Visible shortcut hint in trigger button: `⌘K` — use `<kbd>` element

**Responsive:**
- Desktop: Centered dialog (480-640px wide), fixed to upper third of viewport
- Mobile: Full-width bottom sheet or full-screen overlay — keyboard shortcut is less relevant, provide a visible search/command button in the header
- Touch: same interaction via the visible trigger button — no keyboard shortcut assumption

**Library:** `cmdk` (by Paco Coursey) — fast, unstyled, accessible command menu component. Pairs with Radix Dialog for overlay behavior. Actively maintained, ~3kB gzipped.

**Reference:** Linear uses ⌘K for everything — navigation, issue creation, status changes. Vercel uses ⌘K for project navigation and deployment search. Notion uses ⌘K for page search and recent items.

---

## 2. CTA & Link Behavior

### 2.1 CTA Hierarchy

Every section should have clear action priority. Competing equal-weight CTAs create decision paralysis.

| Level | Visual Weight | HTML Element | Use Case | Example |
|-------|--------------|-------------|----------|---------|
| **Primary** | Filled/solid button, high contrast | `<button>` or `<a>` (with `buttonVariants()`) | Main desired action per section | "Get Started", "Submit" |
| **Secondary** | Outlined or ghost button | `<button>` or `<a>` (with `buttonVariants()`) | Alternative action | "Learn More", "View Demo" |
| **Tertiary** | Text link with underline or arrow | `<a>` | Supporting navigation | "Read documentation →" |

#### Decision Tree — CTA Element

```
Does clicking trigger a URL change (same site or external)?
  → YES: Use <a> (with buttonVariants() for button styling if needed)
  → NO: Does it trigger a mutation, modal, or state change?
    → YES: Use <button>
    → NO: Is it a download?
      → YES: Use <a download>
      → NO: Probably shouldn't be a CTA — reconsider
```

**Anti-pattern:** Using `<a href="#">` with `onClick` for actions. Use `<button>` for actions.

**When NOT to use primary CTA:** Don't place 2+ primary CTAs in the same viewport section. Demote the less important one to secondary. Exception: A/B testing where you want to measure which CTA resonates.

**Responsive:**
- Desktop: CTAs side-by-side (primary left, secondary right — or primary right for "forward" actions like checkout)
- Mobile: CTAs stack vertically, primary on top, full width

### 2.2 External Links

**When to use:** Any link pointing to a different domain.

**Pattern:**
- Open in new tab: `target="_blank"` with `rel="noopener noreferrer"`
- Visual indicator: external link icon after link text (subtle, e.g., Lucide `ExternalLink` at 12-14px)
- Screen reader: append `(opens in new tab)` as visually-hidden text or use `aria-label`

**When NOT to open in new tab:** Internal navigation within the same application — never use `target="_blank"` for same-site links.

### 2.3 Scroll Targets (Anchor CTAs)

**When to use:** Landing pages where a CTA says "See Pricing" or "Learn More" and the target is below on the same page.

**Pattern:**
- Use `<a href="#pricing">` — progressive enhancement, works without JS
- `scroll-behavior: smooth` in CSS handles animation
- Target section needs `scroll-margin-top` matching sticky header height + 16-24px padding

**When NOT to use:** When the target is on a different route. Use `<Link href="/pricing">` instead.

### 2.4 Modal Triggers

**When to use:** Actions that require confirmation, additional input, or focused attention without losing page context (delete confirmation, contact form, image preview).

**When NOT to use:** Content that is the main purpose of the page — don't put primary content in modals. If the content is substantial enough to need its own URL, it should be a page.

**Pattern:**
- Trigger: `<button>` (never `<a>`) — modals are actions, not navigation
- Modal: Radix Dialog via shadcn/ui (ADR-0023 lists Dialog as optional primitive)
- Focus management: automatic via Radix (focus trap, Escape to close, return focus to trigger)

**Accessibility:**
- `role="dialog"` with `aria-labelledby` pointing to modal title
- `aria-modal="true"` to indicate background content is inert
- Escape key closes the modal
- Focus returns to the triggering element on close

---

## 3. Feedback

### 3.1 Feedback Type Decision Tree

```
Is the feedback about a specific element on screen (form field, inline action)?
  → YES: Inline message (next to the element)
  → NO: Is it a background operation the user didn't directly trigger (webhook, auto-save)?
    → YES: Toast notification (non-blocking)
    → NO: Is the action destructive or irreversible?
      → YES: Confirmation dialog (blocking)
      → NO: Is the result important enough to interrupt workflow?
        → YES: Toast (success/error)
        → NO: Inline status change (badge, icon swap, text update)
```

### 3.2 Toast Notifications

**When to use:** Non-blocking feedback for background operations, successful actions where the success is not otherwise visible, errors from actions without inline context.

**When NOT to use:** Form field errors (use inline errors per ADR-0012). Don't use toasts as the _only_ feedback for critical errors — pair with inline state.

**Library:** Sonner (pre-approved). Provides accessible `aria-live` regions automatically.

| Toast Type | Sonner API | When |
|-----------|-----------|------|
| Success | `toast.success(message)` | Action completed — "Saved", "Copied to clipboard" |
| Error | `toast.error(message)` | Action failed — "Failed to save", network errors |
| Loading → result | `toast.promise(promise, { loading, success, error })` | Async operations with visible progress |
| Info | `toast(message)` | Neutral notifications — "New version available" |
| Action | `toast(message, { action: { label, onClick } })` | Undo, retry, or follow-up action |

**Accessibility:**
- Sonner uses `aria-live="polite"` by default — screen readers announce without interrupting
- Error toasts should use `role="alert"` (assertive) for critical failures
- Toasts auto-dismiss (default 4s for success, longer for errors) — never rely on toast as the only error indicator

**Responsive:**
- Desktop: Bottom-right or top-right corner (consistent position)
- Mobile: Top-center (full width, above content — avoids conflict with bottom navigation)

### 3.3 Inline Messages

**When to use:** Feedback that relates to a visible element — form field errors (ADR-0012), inline success confirmations, contextual warnings.

**Pattern:**
- Error: Red text + icon below the field, connected via `aria-describedby` (ADR-0012)
- Success: Green text or check icon replacing the action (e.g., "Saved ✓" replacing "Save" button briefly)
- Warning: Yellow/amber banner above the relevant section
- Info: Blue/neutral banner

**Accessibility:**
- Use `role="alert"` for error messages that appear dynamically
- Use `role="status"` for success/info messages
- Connect to related inputs via `aria-describedby`

### 3.4 Confirmation Dialogs

**When to use:** Destructive actions (delete, remove, cancel subscription), irreversible actions (send email, publish), or actions with significant consequences.

**When NOT to use:** Routine actions (save, update). Frequent actions — if users do it 10+ times per session, confirmation becomes friction. Offer undo instead.

**Pattern:**
- Title: States the action ("Delete project?")
- Body: Explains the consequence ("This will permanently delete 'My Project' and all its data. This cannot be undone.")
- Actions: Destructive action button (right, red/danger variant) + Cancel (left, ghost/secondary)
- Destructive button text: Specific verb, not "OK" — use "Delete", "Remove", "Cancel subscription"

**Accessibility:**
- Same as modal (§2.4): focus trap, Escape to close, return focus
- Auto-focus the cancel/safe action, not the destructive one
- `role="alertdialog"` (not `role="dialog"`) — more urgent announcement

**Reference:** GitHub uses confirmation dialogs with type-to-confirm for repository deletion. Stripe uses simple confirm for removing payment methods.

### 3.5 Empty States

**When to use:** Any content area that can have zero items — lists, tables, search results, dashboards, feeds.

**When NOT to use:** Areas that always have content.

**Pattern (3 components):**
1. **Illustration or icon** — Visual cue that the area is intentionally empty, not broken
2. **Message** — Explains the state ("No projects yet" not "No data")
3. **Action** — Primary CTA to resolve the empty state ("Create your first project")

#### Decision Tree — Empty State Variant

```
Is this the user's first time here (no data created yet)?
  → YES: Onboarding empty state — illustration + explanation + guided CTA
  → NO: Is it a search/filter with no results?
    → YES: Search empty state — "No results for 'X'" + suggestion to adjust filters + clear filters CTA
    → NO: Is content removed/archived?
      → YES: Cleared empty state — "All caught up" / "No items" + action to view archived
      → NO: Error empty state — "Something went wrong" + retry CTA
```

**Accessibility:**
- Use descriptive text, not just an illustration
- CTA is focusable and clearly labeled
- `role="status"` on the empty state container if it appears dynamically

**Responsive:**
- Center-aligned on all breakpoints
- Reduce illustration size on mobile, keep text and CTA prominent

**Reference:** Linear shows a clean illustration + "No issues" + filter suggestion. Notion shows "No results" with a clear button. Stripe shows empty states with inline creation prompts.

### 3.6 Skeleton Loading

**When to use:** Async content regions where the layout is predictable — lists, cards, dashboards, profile pages. Preferred over spinners for content areas.

**When NOT to use:** Unknown layout (e.g., user-generated content with variable structure). Full-page initial loads (use a route-level loading.tsx instead).

**Pattern:**
- Shape matches the content it replaces (rectangle for text, circle for avatar, card shape for cards)
- Pulse animation (Tailwind `animate-pulse`) — respects `prefers-reduced-motion`
- Replace skeleton with content atomically — no partial reveals that cause layout shift
- Co-locate skeleton with the component it replaces (ADR-0004 Next.js loading.tsx pattern)

**Accessibility:**
- Wrap skeleton region in `aria-busy="true"` while loading
- Use `aria-live="polite"` on the container so content replacement is announced
- Skeleton elements have `aria-hidden="true"` — they carry no information

**When to use a spinner instead:**
- Single small element loading (a button loading state, not a content region)
- Unknown content shape
- Actions in progress (submit button spinner)

### 3.7 Optimistic UI

**When to use:** User mutations where the success rate is >95% and the UI update is simple (like/unlike, toggle, reorder). Provides instant feedback.

**When NOT to use:** Complex mutations with high failure rates, mutations involving payment or irreversible actions, or when the optimistic state is hard to calculate.

**Pattern:**
1. On user action → immediately update UI to expected state
2. Fire mutation in background
3. On success → no-op (UI already correct)
4. On failure → revert UI, show error toast

**State management:** Use TanStack Query's `onMutate`/`onError`/`onSettled` for server state (ADR-0005), or `useState` for simple client toggles (ADR-0020).

**Reference:** Linear uses optimistic UI for issue status changes — drag-and-drop columns update instantly. Notion uses optimistic UI for text edits. GitHub uses optimistic UI for star/unstar.

### 3.8 Progress Indicators

#### Decision Tree — Progress Type

```
Is the duration known/estimable?
  → YES: Determinate progress bar (shows %, fills left-to-right)
  → NO: Is it a brief operation (<3 seconds)?
    → YES: Spinner or loading text
    → NO: Is it a multi-step process?
      → YES: Step indicator (e.g., "Step 2 of 4") + indeterminate bar within step
      → NO: Indeterminate progress bar (animated bar, no %)
```

**Accessibility:**
- Determinate: `<progress>` element or `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Indeterminate: `role="progressbar"` without `aria-valuenow` (screen reader announces "busy")
- Spinner: pair with `aria-busy="true"` on the loading region + visually hidden "Loading..." text
- Step indicator: `aria-label="Step 2 of 4"` or equivalent

### 3.9 Notification Badges / Unread Indicators

**When to use:** Any UI element that can accumulate unseen updates — inbox, notifications bell, chat, task lists, nav items with pending items.

**When NOT to use:** Static content that doesn't change between visits. Counters where the exact number is always visible in the main content area.

**Pattern:**
- **Dot badge:** Small colored dot on an icon — signals "something new" without count. Use when the count doesn't matter (e.g., new feature indicator).
- **Count badge:** Number inside a pill shape — shows exact unread count. Cap at 99+ to avoid layout overflow.
- **Position:** Top-right corner of the icon or element, overlapping slightly. Use `absolute` positioning relative to the parent.
- **Color:** Use project accent/error token — must contrast against both the icon and the background (ADR-0002).

#### Decision Tree — Badge Type

```
Is the exact count important to the user?
  → YES: Count badge ("3", "12", "99+")
    → Is the count potentially very large (>99)?
      → YES: Cap at "99+" to prevent layout shift
      → NO: Show exact count
  → NO: Is this a new/unseen indicator?
    → YES: Dot badge (no number)
    → NO: Is it a status indicator (online, away, busy)?
      → YES: Status dot with semantic color (green=online, yellow=away, red=busy)
      → NO: Don't use a badge — the information belongs in the main content area
```

**Accessibility:**
- Add `aria-label` to the parent element: `aria-label="Notifications, 3 unread"` — the visual badge is decorative to screen readers
- Badge element: `aria-hidden="true"` (screen readers use the parent's label, not the badge text)
- Live updates: wrap in `aria-live="polite"` if the count changes while the page is open — but only for important counters (inbox), not all badges
- Status dots: don't rely on color alone — pair with text or icon shape for colorblind users (ADR-0019)

**Responsive:**
- Same badge position and size on all breakpoints
- Minimum badge size: 18-20px diameter to remain legible
- Touch: ensure the parent element meets touch target requirements (§5.1) — the badge itself is not a separate tap target

**Reference:** GitHub uses count badges on notification bell and PR review tabs. Linear uses dot badges for new items in sidebar sections. Notion uses count badges on inbox.

### 3.10 Infinite Scroll / Load-More

**When to use:** Feeds, timelines, search results, or lists with large datasets where users browse sequentially.

**When NOT to use:** Content where users need to reach the footer (infinite scroll pushes footer unreachable). Paginated data where users need to jump to specific pages. Small datasets that fit on one page.

#### Decision Tree — Loading Strategy

```
Is the content a continuous feed (social, news, timeline)?
  → YES: Infinite scroll — load next page automatically when user nears bottom
  → NO: Is it a search result or product list?
    → YES: "Load more" button — user controls when to load
      — Why: Users may want to refine search instead of loading more. Button gives control.
    → NO: Is the total dataset <100 items?
      → YES: Load all, use client-side filtering
      → NO: Traditional pagination with page numbers
```

**Infinite Scroll Pattern:**
- Use `IntersectionObserver` on a sentinel element near the bottom of the list (e.g., 3-5 items from end)
- When sentinel enters viewport → fetch next page
- Show skeleton/spinner at the bottom during load (§3.6)
- If fetch fails → show inline retry button, not toast
- Maintain scroll position — no jumping on content insert

**Load-More Button Pattern:**
- Place a visible button below the current results: "Load more" or "Show 20 more"
- Show how many results are loaded vs total if known: "Showing 20 of 156"
- Button shows loading state during fetch (§4.3 submit states)
- Append new results below existing — never replace

**Accessibility:**
- `aria-live="polite"` on the results container — screen readers announce new content
- After load: announce "N more results loaded" via a visually hidden live region
- Infinite scroll: provide "Load more" button as keyboard alternative — `IntersectionObserver` alone has no keyboard equivalent
- New items must be focusable or follow natural tab order — don't trap keyboard users
- "Back to top" button (§1.4) becomes important with infinite scroll

**Responsive:**
- Same behavior on all breakpoints
- On mobile: infinite scroll works well with thumb-scrolling feeds
- Load-more button: full-width on mobile for easy tap target

**State management:** URL should reflect the current state — `?page=3` for load-more, so users can share or bookmark progress. For infinite scroll, store scroll position on navigation away so the user returns to their position (Zustand persist or `sessionStorage`, per ADR-0020).

**Reference:** GitHub uses load-more buttons for issue lists. Linear uses infinite scroll for issue feeds. Notion uses load-more for database views. Stripe uses traditional pagination for dashboard tables.

---

## 4. Form UX

ADR-0012 defines form validation mechanics, Server Actions, Zod schemas, and form primitives. This section covers the **UX timing and behavior** that ADR-0012 doesn't address.

### 4.1 Validation Timing

#### Decision Tree — When to Validate

```
Is this the user's first interaction with the field?
  → YES: Validate on blur (when they leave the field)
    — Don't validate on every keystroke initially (too aggressive, shows errors before user finishes typing)
  → NO: Has the field been submitted or blurred-with-error before?
    → YES: Validate on change (real-time — fix errors as user types)
    → NO: Validate on blur
```

This is the **"lazy then eager"** pattern: lazy validation on first touch (blur), eager real-time validation after first error is shown. Provides respectful UX without stale errors.

**Structural triggers:** Apply this to all forms. The one deviation: email and URL fields may validate format on blur but validate uniqueness on submit (server-side).

**Reference:** Stripe uses blur-then-change validation. GitHub validates username availability on blur with a debounce. Linear validates on submit for simple forms.

### 4.2 Error Display

| Error Scope | Display Location | Trigger |
|------------|-----------------|---------|
| **Field-level** | Below the field, connected via `aria-describedby` (ADR-0012) | Validation failure on blur/change/submit |
| **Form-level** | Above the form (FormMessage primitive) or anchor-linked error summary | Server error, network failure, cross-field validation |
| **Toast** | Non-blocking notification | Network errors, session expiry (no inline context) |

**When to use error summary (top-of-form):**
- Complex forms with 10+ fields where errors may be off-screen
- Accessibility: summary links to each errored field (`<a href="#field-id">`)
- Pattern: "Please fix N errors below:" + clickable list of error messages

**When NOT to use error summary:** Simple forms (≤5 fields) where all fields are visible — inline errors are sufficient.

### 4.3 Submit States

**Pattern (sequential states of the submit button):**

| State | Visual | Behavior |
|-------|--------|----------|
| **Default** | "Submit" / "Save" / specific verb | Clickable |
| **Submitting** | Spinner + "Saving..." | Disabled (`aria-busy="true"`) — prevents double-submit |
| **Success** | "Saved ✓" (brief, 1-2s) | Then reset to default or redirect |
| **Error** | Re-enable button, show error | Allow retry |

**Accessibility:**
- Button text change from "Save" → "Saving..." is announced by screen readers if the button has focus
- Alternatively, use `aria-busy` on the form or button
- Never disable the button without visible loading indication

### 4.4 Success Feedback

#### Decision Tree — After Successful Submit

```
Does the form create a new resource the user should see?
  → YES: Redirect to the new resource (e.g., /projects/new-project-id)
  → NO: Is the form part of a multi-step flow?
    → YES: Advance to next step (show step indicator progress)
    → NO: Is the form on a dedicated page?
      → YES: Show success page/message + clear next action ("Return to dashboard")
      → NO: Is it an inline/modal form?
        → YES: Close modal + toast confirmation, OR inline success message replacing the form
        → NO: Reset form + toast "Saved successfully"
```

### 4.5 Multi-Step Wizards

**When to use:** Forms with 8+ fields that can be logically grouped into sequential steps. Onboarding flows, checkout processes, complex data entry.

**When NOT to use:** Forms with ≤7 fields — a single long form with sections is fine. Don't force steps for artificial "simplification."

**Pattern:**
- Step indicator at top: shows current step, total steps, and (optionally) step labels
- Back/Next navigation within each step (back goes to previous, next validates current step)
- Step validation: validate the current step on "Next" before advancing — don't let users skip ahead with invalid data
- Final step: "Submit" replaces "Next"
- Progress state: persist in URL (`?step=2`) or React state (ADR-0020) — user can go back without losing data
- Draft saving (optional): auto-save step data to prevent loss on accidental navigation

**Accessibility:**
- Step indicator: `aria-label="Step 2 of 4: Contact information"`
- Back/Next buttons are clearly labeled — not just arrows
- Focus moves to the first field of the new step on advance
- Error: focus moves to the first errored field if validation fails on "Next"

**Responsive:**
- Same step structure on all breakpoints
- On mobile, stack step indicator vertically or use compact numbered dots

**Reference:** Stripe checkout uses a multi-step wizard with address → payment → review. Shopify onboarding uses a wizard with progress bar.

### 4.6 Autofocus

**When to use:**
- Modal/dialog with a form: autofocus the first input
- Search page or search modal: autofocus the search input
- Login/signup forms: autofocus the first field
- Single-purpose pages (search, compose, create)

**When NOT to use:**
- Pages with mixed content — autofocusing a form input scrolls past content above it
- Mobile: autofocus triggers the virtual keyboard, which takes half the screen — only use when the user clearly intends to type (search modal, compose)
- Forms below the fold — autofocus scrolls the page

**Accessibility:**
- `autoFocus` attribute (React) or `autofocus` (HTML)
- Screen readers announce the focused element — ensure the label is clear
- Never autofocus a hidden or off-screen element

### 4.7 Input Affordances

Input affordances are visual and behavioral cues that communicate what type of data is expected.

| Affordance | When to Use | HTML/Attribute |
|-----------|-------------|---------------|
| **Input type** | Always — match type to data | `type="email"`, `type="tel"`, `type="url"`, `type="number"` |
| **Inputmode** | Mobile keyboard optimization | `inputMode="numeric"` for PIN/OTP, `inputMode="search"` for search |
| **Autocomplete** | Known personal data fields | `autoComplete="email"`, `autoComplete="given-name"`, `autoComplete="street-address"` |
| **Placeholder** | Brief example, not label replacement | `placeholder="jane@example.com"` — never as the only label (ADR-0012) |
| **Max length indicator** | Character-limited fields (bio, tweet) | Show "42/280" below input, update live |
| **Password visibility** | Password fields | Toggle eye icon to show/hide, `aria-label="Show password"` |

---

## 5. Responsive Interactions

### 5.1 Touch Targets

| Guideline | Minimum | Target | Source |
|----------|---------|--------|--------|
| WCAG 2.5.8 (AA) | 24×24 CSS px | — | Compliance floor |
| Apple HIG | 44×44 pt | 44×44 pt | Recommended |
| Material Design | 48×48 dp | 48×48 dp | Recommended |
| **Project standard** | **24×24 CSS px** | **44×44 CSS px** | Minimum WCAG, target Apple HIG |

**Pattern:**
- Buttons, links, and interactive elements: `min-h-11 min-w-11` (44px) on mobile
- Small icons (close, menu): add padding to hit area — visual size can be 24px, tap target 44px
- Spacing between targets: ≥8px gap to prevent mis-taps

**When target sizes conflict with design:**
- Use `::before`/`::after` pseudo-elements with `position: absolute` to extend the tap area beyond visual bounds
- This maintains visual design while meeting tap target requirements

### 5.2 Hover vs Touch Alternatives

Hover is not available on touch devices. Every hover-triggered interaction needs a touch-friendly alternative.

| Hover Pattern | Touch Alternative | When to Switch |
|--------------|------------------|---------------|
| Tooltip on hover | Tap to show, tap elsewhere to dismiss (or long-press) | Always — tooltips must work on touch |
| Preview on hover | Tap to navigate, or tap-and-hold for preview | When hover preview is an enhancement, not required |
| Reveal actions on row hover | Swipe to reveal, or show actions inline/in context menu | Table rows, list items with hidden actions |
| Dropdown on hover | Tap to toggle | Navigation menus — never hover-only dropdowns |
| Color/style change on hover | Focus/active states serve similar purpose | Decorative — touch users see the active state |

**Decision Tree — Hover Pattern Assessment:**

```
Is the hover content/action essential to complete the task?
  → YES: It MUST have a non-hover interaction (tap, long-press, always-visible)
  → NO: Is it an enhancement (preview, tooltip, animation)?
    → YES: Acceptable to omit on touch, but prefer tap alternative
    → NO: Don't use hover — make the interaction explicit
```

**Accessibility:**
- `title` attribute is NOT an acceptable tooltip (inconsistent behavior, no keyboard trigger)
- Use Radix Tooltip (via shadcn/ui) which handles hover, focus, and touch
- Hover content must also be triggerable by keyboard focus (`onFocus`/`onBlur`)

### 5.3 Swipe Gestures

**When to use:** Supplementary interaction on touch devices — swipe-to-delete in lists, swipe between carousel items, pull-to-refresh.

**When NOT to use:**
- Never as the _only_ way to perform an action — always have a visible button/menu alternative
- Complex multi-directional gestures that conflict with browser gestures (back swipe, scroll)
- Desktop (where swipe is unavailable or unintuitive)

**Pattern:**
- Horizontal swipe on list items: reveal action buttons (delete, archive)
- Always pair with visible affordance: subtle edge indicator, or actions accessible via context menu/long-press
- Cancel unintended swipes: require threshold distance before committing the action

**Accessibility:**
- Swipe actions MUST have a keyboard/button alternative
- Screen readers can't swipe — provide all actions via visible UI or context menu
- Test with VoiceOver/TalkBack to ensure alternative paths work

### 5.4 Bottom Sheets vs Modals

#### Decision Tree — Overlay Type by Breakpoint

```
Is the screen width <768px (mobile)?
  → YES: Use bottom sheet (slides up from bottom, partial screen)
    — Draggable handle at top, swipe-down to dismiss
    — Content scrolls within the sheet
  → NO: Use modal/dialog (centered, overlay backdrop)
    — Fixed max-width (typically 480-640px)
    — Focus trapped, Escape to close
```

**When to use bottom sheet on mobile instead of modal:**
- Content is 1-4 actions (share menu, filter options)
- The user needs to see partial page context behind
- Quick, low-commitment interactions

**When to use full modal even on mobile:**
- Forms or complex content requiring full attention
- Multi-step flows within the overlay
- Content that benefits from full-width display

**Accessibility (bottom sheet):**
- Same ARIA requirements as dialog: `role="dialog"`, `aria-labelledby`, focus trap
- Swipe-to-dismiss must have a visible close button alternative
- Drag handle: `role="slider"` or visually decorative with close button for screen readers

### 5.5 Interaction Switching Across Breakpoints

Some interactions must fundamentally change between mobile and desktop. This isn't just resizing — it's a different pattern.

| Pattern | Desktop | Mobile |
|---------|---------|--------|
| Side panel detail view | Panel opens alongside list | Navigates to full-screen detail page (or bottom sheet) |
| Multi-column form | Columns side by side | Single column, vertically stacked |
| Table with row actions | Actions revealed on row hover | Actions in kebab menu (⋮) per row, or swipe |
| Tooltip information | Hover tooltip | Tap to show popover, or always-visible inline text |
| Drag-and-drop reordering | Drag handles | Handle + long-press drag, or up/down arrow buttons |
| Context menu | Right-click | Long-press, or explicit menu button (⋮) |

**Implementation:** Use CSS media queries for layout changes. Use `useMediaQuery` hook or responsive Tailwind classes for interaction changes that require JS.

---

## 6. Keyboard & Focus Management

ADR-0019 defines the accessibility rules for keyboard navigation. This section provides pattern-level decision trees for when and how to apply focus management.

### 6.1 Focus Trapping

**When to use:** Modals, dialogs, drawers, full-screen overlays — any element that takes over user attention.

**When NOT to use:** Inline content, dropdowns (use focus-on-close instead), tooltips (non-interactive).

**Pattern:**
- Tab cycles through focusable elements within the trap
- Shift+Tab cycles backward
- Escape closes the overlay and returns focus to the trigger
- First focusable element receives focus on open (or the close button if no other interactive elements)

**Implementation:** Radix Dialog/Sheet handles this automatically. For custom overlays, use `useFocusTrap` pattern from ADR-0019.

### 6.2 Roving Tabindex

**When to use:** Composite widgets where multiple items form a single Tab stop — toolbars, tab lists, radio groups, menu bars, listboxes.

**When NOT to use:** Simple lists of links or buttons where each should be individually tabbable. Forms.

**Pattern:**
- Only one item in the group has `tabIndex={0}` (active item)
- All other items have `tabIndex={-1}`
- Arrow keys move focus between items (updating tabIndex accordingly)
- Tab moves focus OUT of the entire group to the next Tab stop
- Home/End jump to first/last item

**Reference:** Radix uses roving tabindex for Tabs, Toolbar, RadioGroup, and Menubar — all auto-managed.

### 6.3 Skip Links

**When to use:** Every page (required by ADR-0019). The skip-to-main-content link is the first focusable element.

**Pattern:**
- Visually hidden until focused: `sr-only focus:not-sr-only` (Tailwind)
- Target: `<main id="main-content">`
- On activation: focus moves to main content area
- See ADR-0019 SkipNav implementation

### 6.4 Focus Visible

**When to use:** All interactive elements — `focus-visible` shows the focus ring only on keyboard navigation, not mouse clicks.

**Pattern:**
- `focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2` (per ADR-0012 and ADR-0019)
- Never remove focus outlines without replacement (`outline: none` is forbidden per ADR-0019)
- Apply to all buttons, links, inputs, custom interactive elements

### 6.5 Escape Key Conventions

The Escape key has a well-established layered close behavior:

| Priority | What Closes | Example |
|----------|------------|---------|
| 1 (topmost) | The topmost overlay in the stack | Nested modal closes before parent modal |
| 2 | Dropdown/popover | Open dropdown menu closes |
| 3 | Full-screen overlay | Mobile navigation drawer closes |
| 4 | Inline expanded content | Expanded accordion or disclosure panel |
| 5 (lowest) | Search/filter active state | Clear active search field or filter |

**Pattern:**
- Each overlay registers its own Escape handler
- Overlays higher in the z-index stack consume the Escape event first (`event.stopPropagation()`)
- After closing, focus returns to the element that triggered the overlay

### 6.6 Focus Restoration

**When to use:** Whenever an overlay or transient UI element closes — modal, drawer, dropdown, toast action.

**Pattern:**
- Store a reference to the trigger element before opening
- On close: `triggerRef.current?.focus()` — return focus to the trigger
- If the trigger was removed (e.g., deleted the item that triggered a confirmation dialog): focus the nearest logical ancestor

**Reference:** Radix components handle focus restoration automatically. For custom implementations, use `useRef` to capture trigger.

---

## 7. Anti-Patterns

Common UX mistakes presented as ❌/✅ pairs with reasoning.

### Navigation

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Hide nav links on mobile with no hamburger alternative | Provide mobile nav (drawer, overlay, bottom tabs) | Mobile users can't navigate (ADR-0019 violation) |
| Use hover-only dropdown navigation | Make dropdowns click/tap-triggered OR use flyout with click-to-open | Hover is unavailable on touch; click-to-open is universal |
| Put 10+ items in top nav without grouping | Group into categories, use mega menu or sidebar | Cognitive overload — users can't scan long flat lists |
| Auto-scroll user to a section on page load without intent | Scroll on explicit user action only (clicking nav anchor) | Disorienting — user expects to land at top of page |

### CTA & Links

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Use `<a href="#">` with `onClick` for actions | Use `<button>` for actions, `<a>` for navigation | Semantic HTML (ADR-0019), correct keyboard behavior |
| Open internal links in new tabs | Use `target="_blank"` only for external links | New tabs break back-button, confuse navigation mental model |
| Genre one: "Click Here" link text | Use descriptive text: "View pricing plans" | Screen readers announce link text out of context — "Click Here" is meaningless |
| Place 3+ primary CTAs in one viewport | One primary CTA per section, others secondary/tertiary | Decision paralysis — more CTAs ≠ more conversions |
| Style `<div>` as a button/link | Use `<button>` or `<a>` with appropriate styling | Missing keyboard access, no implicit role, no focus management |

### Feedback

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Show only a spinner for 5+ second operations | Show progress bar or step indicator for long operations | Spinners with no progress indication trigger abandonment after ~3 seconds |
| Use toast for form field errors | Use inline errors next to fields (ADR-0012) | Toast disappears — user can't reference it while fixing errors |
| Show empty list with no message | Show empty state with explanation + action | Blank area looks broken — users don't know if content is loading or missing |
| Confirm every routine action | Confirm only destructive/irreversible actions; offer undo for routine | Confirmation fatigue — users click "OK" without reading after the 3rd time |
| Auto-dismiss error toasts quickly | Keep error toasts visible longer (8-10s) or until dismissed | Users need time to read and act on errors |

### Form UX

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Validate on every keystroke from the start | Validate on blur first, then on change after first error | Aggressive validation before user finishes typing is hostile |
| Use placeholder as the only label | Visible `<label>` above field; placeholder is supplementary (ADR-0012) | Placeholder disappears on focus — user forgets what field expects |
| Disable submit button before user interacts | Keep submit enabled; show errors on submit attempt | Disabled buttons are confusing — users don't know why they can't submit |
| Clear the entire form on validation error | Keep user input; highlight errored fields only | Clearing valid input forces re-entry — high frustration |
| Use "Submit" as button text | Use specific verbs: "Send message", "Create project", "Save changes" | Specific text sets expectations and confirms the action |

### Responsive

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Use tiny tap targets (<24px) on mobile | Minimum 24px, target 44px for all interactive elements | Mis-taps frustrate users — fat finger problem |
| Require hover for essential actions | Provide tap/click alternative for all hover interactions | Touch devices have no hover |
| Use desktop-only right-click context menu | Add visible menu button (⋮) + optional long-press on mobile | Right-click is not discoverable on touch; some trackpad users don't right-click |
| Show a desktop modal on mobile | Use bottom sheet for quick actions, full-screen sheet for complex content | Centered modals on small screens leave no visible context |

### Keyboard & Focus

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Remove focus ring (`outline: none`) without replacement | Use `focus-visible:ring-*` for visible keyboard focus (ADR-0019) | Keyboard users can't see where they are |
| Trap focus in a non-modal element | Only trap focus in modals/dialogs/drawers | Focus traps in non-modal UI prevent keyboard users from leaving |
| Use `tabIndex` > 0 to reorder focus | Use natural DOM order; rearrange HTML if focus order is wrong | tabIndex > 0 creates unpredictable focus jumps |
| Forget to restore focus when overlay closes | Return focus to the triggering element on close | Keyboard users lose their position in the page |
| Autofocus a below-the-fold element | Only autofocus above-the-fold elements on dedicated pages | Autofocus scrolls the page, hiding content user expected to see |

### Page-Level Patterns

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Load analytics scripts before cookie consent | Gate non-essential scripts behind consent check | GDPR violation — scripts run before user consents |
| Make "Reject All" harder to find than "Accept All" | Same visual weight, same number of clicks for both | Dark pattern — may violate GDPR, erodes user trust |
| Use View Transitions on every route without feature detection | Feature-detect `document.startViewTransition`, use as progressive enhancement | Breaks navigation in unsupported browsers if not gated |
| Use both View Transitions and Framer Motion for the same page change | View Transitions for route changes, Framer Motion for within-page animation | Competing animations cause visual conflicts and doubled work |
| Use infinite scroll on pages where users need the footer | Use load-more button or pagination | Footer with legal links, contact info becomes unreachable |
| Show unread badge count without `aria-label` on the parent | `aria-label="Notifications, 3 unread"` on clickable parent, `aria-hidden` on badge | Screen readers can't access badge text positioned as overlay |

---

## 8. Page-Level Patterns

### 8.1 Cookie Consent / Privacy Banners

**When to use:** Any site that uses cookies, analytics, or tracking subject to GDPR (EU), ePrivacy Directive, CCPA (California), or similar privacy regulations. Required before setting non-essential cookies.

**When NOT to use:** Sites that use zero cookies and zero tracking (no analytics, no third-party scripts). US-only sites with no analytics (rare).

**Pattern:**
- **Banner position:** Bottom of viewport (most common) or top. Fixed position, overlays content but doesn't block it.
- **Timing:** Show on first visit when no consent is stored. Don't show again once the user has made a choice.
- **Options (minimum):** "Accept All" (primary CTA) + "Reject All" / "Manage Preferences" (secondary)
- **Granular consent (recommended):** Separate toggles for: Essential (always on, no toggle), Analytics, Marketing, Functional
- **Persistence:** Store consent in a cookie or `localStorage`. Check before loading any non-essential scripts.
- **No dark patterns:** "Reject All" must be as easy to click as "Accept All" — same visual weight, same number of clicks. Don't hide rejection behind "Manage Preferences" → modal → individual toggles.

#### Decision Tree — Consent Complexity

```
Does the site operate in the EU or target EU users?
  → YES: Full GDPR consent banner — Accept All, Reject All, Manage Preferences (with granular toggles)
  → NO: Does it operate in California or target California users?
    → YES: CCPA notice — "Do Not Sell My Personal Information" link + opt-out mechanism
    → NO: Does the site use analytics or third-party cookies?
      → YES: Simple consent banner — Accept / Decline
      → NO: No banner needed
```

**Accessibility:**
- Banner: `role="dialog"` with `aria-label="Cookie consent"` — or `role="alertdialog"` if it's a blocking overlay
- Focus management: do NOT auto-focus the banner on page load — it interrupts screen reader users. Let it sit at the bottom as a landmark. Consider a skip-past link.
- Buttons: full keyboard access, visible focus rings
- Preferences modal: focus trap when open, Escape to close (standard dialog pattern per §6.1)
- `aria-live` is not needed — the banner is present on load, not dynamically injected

**Responsive:**
- Desktop: Fixed bottom bar, 1-2 rows, buttons side-by-side
- Mobile: Fixed bottom bar, buttons stacked vertically if needed. Ensure CTA buttons meet touch target size (§5.1)
- Don't cover more than 30% of the viewport — compress to a minimal bar with "Manage" expansion if needed

**Anti-patterns:**
- ❌ Cookie wall that blocks all content until consent — not legal under GDPR guidance for most sites
- ❌ Pre-checked consent boxes — GDPR requires affirmative opt-in
- ❌ "Accept" as primary and "Manage" as the only alternative (hiding "Reject") — dark pattern
- ❌ Loading analytics/tracking scripts before consent is given
- ✅ "Accept All" + "Reject All" at same visual weight + optional "Manage Preferences"

### 8.2 View Transitions API

**When to use:** Page-to-page navigation where visual continuity improves the experience — shared elements between pages (product image → detail page), page crossfades, route changes in apps.

**When NOT to use:** Sites that don't need visual transitions between routes. Heavy use on low-powered mobile devices. When the transition would delay perceived navigation speed.

**Pattern:**
- Use the native **View Transitions API** (`document.startViewTransition()`) for cross-document and same-document transitions
- Next.js: experimental support via `next.config.js` → `experimental.viewTransition: true` (check current Next.js version support)
- Fallback: if the API is not supported, navigation proceeds normally — progressive enhancement
- Shared element transitions: assign `view-transition-name` CSS property to elements that should animate between pages (e.g., a card image that expands to a hero)

#### Decision Tree — View Transition Type

```
Is there a shared visual element between the source and destination page?
  → YES: Shared element transition — assign matching `view-transition-name` on both pages
    — Example: thumbnail → hero image, card → detail page
  → NO: Is a crossfade between pages desirable?
    → YES: Default crossfade — `::view-transition-old` fades out, `::view-transition-new` fades in
    → NO: Instant navigation — no transition
```

**Accessibility:**
- `prefers-reduced-motion: reduce` — disable or simplify transitions (crossfade only, no movement)
- Transitions must not delay content accessibility — screen readers should announce the new page immediately, not wait for animation to finish
- Keep transitions short (200-350ms) to avoid blocking interaction

**Responsive:**
- Same transitions on all breakpoints, but consider disabling complex shared-element transitions on mobile if they cause jank
- Test on low-end devices — transitions that drop below 30fps should be simplified or removed

**Browser support:** View Transitions API is supported in Chrome/Edge 111+, Safari 18+. Firefox support is in progress. Always use as progressive enhancement — feature-detect with `document.startViewTransition` before use.

**Relationship to Motion:** View Transitions are CSS/browser-native and complement (not replace) Framer Motion. Use View Transitions for page-level route changes. Use Framer Motion for within-page animations (scroll, viewport reveals, presence). Don't use both for the same transition.

**Reference:** Vercel uses crossfade view transitions between dashboard pages. Linear uses shared-element transitions for issue cards opening to detail views.

---

## Library Compatibility

| Library | Status | Purpose | Notes |
|---------|--------|---------|-------|
| Radix Primitives (via shadcn/ui) | `recommended` | Dialog, Dropdown, Tooltip, NavigationMenu, Tabs focus/keyboard | Pre-approved in ADR-0002/ADR-0023. Handles focus trap, roving tabindex, ARIA automatically |
| Sonner | `recommended` | Toast notifications with accessible `aria-live` regions | Pre-approved. Use for all toast feedback patterns |
| Framer Motion (via `@/lib/motion`) | `recommended` | Scroll-to-section smoothing, presence animations for overlays | Default animation dependency |
| Zustand | `compatible` | Storing UI interaction state (sidebar open, wizard step) when React state insufficient | Per ADR-0020 escalation rules |
| `react-hook-form` | `compatible` | Form UX patterns (validation timing, multi-step) for medium/complex forms | Per ADR-0012, install when needed |
| `next-themes` | `recommended` | Dark mode with flash prevention, system preference sync, Tailwind `dark:` class strategy | By Paco Coursey. ~2kB. Handles SSR flash, localStorage persistence, `prefers-color-scheme` sync |
| `cmdk` | `recommended` | Command palette with fuzzy search, keyboard navigation, accessible combobox | By Paco Coursey. ~3kB. Pairs with Radix Dialog for overlay. Actively maintained |
| Any custom tooltip/focus-trap library | `forbidden` | — | Use Radix (shadcn/ui) or the project's `useFocusTrap` pattern |

---

## Consequences

**Positive:**
- Agents and developers have a decision tree for every common UX interaction — no ad-hoc guessing
- Pattern decisions are grounded in WCAG requirements (ADR-0019) and real-world references
- Anti-patterns section prevents the most frequent UX mistakes before they happen
- Every pattern includes accessibility, responsive, and structural trigger documentation
- Library choices are already pre-approved — no dependency evaluation needed for common patterns
- Clear boundary with ADR-0012 (form mechanics) and ADR-0019 (a11y rules) — no duplication

**Negative:**
- Decision trees are guidelines, not absolutes — unusual product requirements may need deviations (document why)
- Reference site patterns (Stripe, Linear, etc.) evolve — specific claims may become outdated
- Mobile bottom sheet pattern requires Radix Sheet or custom implementation — not always pre-built
- View Transitions API browser support is not universal — must feature-detect and treat as progressive enhancement
- `cmdk` and `next-themes` are new library recommendations — require addition to `docs/approved-libraries.md` when installed

## Related ADRs

- [ADR-0004](./0004-components.md) — Component Structure (server/client boundary, component tiers)
- [ADR-0012](./0012-forms.md) — Forms (validation mechanics, Server Actions, form primitives)
- [ADR-0019](./0019-accessibility.md) — Accessibility (WCAG rules, keyboard rules, ARIA patterns, testing)
- [ADR-0020](./0020-state-management.md) — State Management (UI state for interactions — sidebar, wizard step)
- [ADR-0023](./0023-ui-foundation-primitives.md) — UI Foundation Primitives (primitive inventory for patterns)
