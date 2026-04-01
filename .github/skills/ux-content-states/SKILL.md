---
name: ux-content-states
description: >-
  Content state patterns — empty states with 3-component structure (onboarding/search/cleared/error
  variants), skeleton loading vs spinner decision, progress indicators (determinate/indeterminate/
  step decision tree), notification badges (dot/count/status decision tree, aria-label on parent),
  infinite scroll vs load-more vs pagination decision tree with IntersectionObserver sentinel
  pattern. Use when building list, feed, or table components; implementing empty state displays;
  adding loading skeletons; showing unread counters or status indicators; or choosing a pagination
  strategy.
---

# UX — Content State Patterns

**Compiled from**: ADR-0024 §3.5–3.6, §3.8–3.10 (Content States), §7 Page-Level Anti-Patterns (infinite scroll)
**Last synced**: 2026-03-21

---

## 3.5 Empty States

**Use:** Any content area that can have zero items — lists, tables, search results, dashboards, feeds.
**Don't use:** Areas that always have content.

**3-component structure:**

1. **Illustration or icon** — visual cue that the area is intentionally empty, not broken
2. **Message** — explains the state ("No projects yet" not "No data")
3. **Action** — primary CTA to resolve the empty state ("Create your first project")

#### Decision Tree — Empty State Variant

```
Is this the user's first time here (no data created yet)?
  → YES: Onboarding empty state — illustration + explanation + guided CTA
  → NO: Is it a search/filter with no results?
    → YES: Search empty state — "No results for 'X'" + suggest adjusting filters + clear filters CTA
    → NO: Is content removed or archived?
      → YES: Cleared empty state — "All caught up" / "No items" + action to view archived
      → NO: Error empty state — "Something went wrong" + retry CTA
```

**Accessibility:**

- Use descriptive text, not illustration alone
- CTA is focusable and clearly labeled
- `role="status"` on the empty state container if it appears dynamically

**Responsive:** Center-aligned on all breakpoints. Reduce illustration size on mobile; keep text and CTA prominent.

---

## 3.6 Skeleton Loading

**Use:** Async content regions where layout is predictable — lists, cards, dashboards, profile pages. Preferred over spinners for content areas.
**Don't use:** Unknown layout (user-generated content with variable structure); full-page initial loads (use route-level `loading.tsx` instead).

- Shape matches the content it replaces (rectangle for text, circle for avatar, card shape for cards)
- Pulse animation: Tailwind `animate-pulse` — respects `prefers-reduced-motion` automatically
- Replace skeleton with content atomically — no partial reveals causing layout shift
- Co-locate skeleton with the component it replaces (Next.js `loading.tsx` pattern)

**Accessibility:**

- Wrap skeleton region in `aria-busy="true"` while loading
- `aria-live="polite"` on the container so content replacement is announced
- Skeleton elements: `aria-hidden="true"` — they carry no information

**When to use a spinner instead:**

- Single small element loading (button loading state, not a content region)
- Unknown content shape
- Actions in progress (submit button spinner)

---

## 3.8 Progress Indicators

#### Decision Tree — Progress Type

```
Is the duration known/estimable?
  → YES: Determinate progress bar (shows %, fills left-to-right)
  → NO: Is it a brief operation (<3 seconds)?
    → YES: Spinner or loading text
    → NO: Is it a multi-step process?
      → YES: Step indicator ("Step 2 of 4") + indeterminate bar within the step
      → NO: Indeterminate progress bar (animated bar, no %)
```

**Accessibility:**

- Determinate: `<progress>` or `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Indeterminate: `role="progressbar"` without `aria-valuenow` (screen reader announces "busy")
- Spinner: `aria-busy="true"` on loading region + visually hidden "Loading..." text
- Step indicator: `aria-label="Step 2 of 4"` or equivalent

---

## 3.9 Notification Badges / Unread Indicators

**Use:** UI elements that accumulate unseen updates — inbox, notification bell, chat, nav items with pending items.
**Don't use:** Static content that doesn't change between visits; counters always visible in the main content area.

- **Dot badge:** Small colored dot on icon — signals "something new" without count. Use when count doesn't matter (new feature indicator).
- **Count badge:** Number inside a pill — shows exact unread count. Cap at `99+` to prevent layout overflow.
- Position: top-right of the icon/element, overlapping slightly (`absolute` positioning relative to parent)
- Color: use project accent/error token — must contrast against both icon and background (WCAG AA 4.5:1 minimum)

#### Decision Tree — Badge Type

```
Is the exact count important to the user?
  → YES: Count badge ("3", "12", "99+")
    → Is the count potentially >99?
      → YES: Cap at "99+" to prevent layout shift
      → NO: Show exact count
  → NO: Is this a new/unseen indicator?
    → YES: Dot badge (no number)
    → NO: Is it a status indicator (online, away, busy)?
      → YES: Status dot with semantic color (green=online, yellow=away, red=busy)
      → NO: Don't use a badge — information belongs in the main content area
```

**Accessibility:**

- `aria-label` on parent element: `aria-label="Notifications, 3 unread"` — badge is decorative to screen readers
- Badge element: `aria-hidden="true"`
- Live count updates: `aria-live="polite"` on the parent if count changes while page is open (important counters only)
- Status dots: don't rely on color alone — pair with text or icon shape for colorblind users (never use color alone to convey meaning)

---

## 3.10 Infinite Scroll / Load-More

#### Decision Tree — Loading Strategy

```
Is the content a continuous feed (social, news, timeline)?
  → YES: Infinite scroll — load next page automatically when user nears bottom
  → NO: Is it a search result or product list?
    → YES: "Load more" button — user controls when to load
        (Users may want to refine search. Button gives control.)
    → NO: Is the total dataset <100 items?
      → YES: Load all, use client-side filtering
      → NO: Traditional pagination with page numbers
```

**Infinite Scroll Pattern:**

- `IntersectionObserver` on a sentinel element near the list bottom (3–5 items from end)
- When sentinel enters viewport → fetch next page
- Show skeleton/spinner at the bottom during load (§3.6)
- If fetch fails → show inline retry button (not toast)
- Maintain scroll position — no jumping on content insert
- Provide "Load more" button as keyboard alternative — `IntersectionObserver` alone has no keyboard equivalent

**Load-More Button Pattern:**

- "Load more" or "Show 20 more" below current results
- Show count if known: "Showing 20 of 156"
- Button shows loading state during fetch
- Append new results below existing — never replace

**Accessibility:**

- `aria-live="polite"` on results container — screen readers announce new content
- After load: announce "N more results loaded" via visually hidden live region
- "Back to top" button (§1.4 from `ux-navigation`) becomes important with infinite scroll

**State management:**

- URL should reflect state: `?page=3` for load-more so users can share or bookmark
- Infinite scroll: store scroll position on navigation away (`sessionStorage` or Zustand `persist` middleware)

---

## Anti-Patterns

| ❌ Don't                                         | ✅ Do                                                                    | Why                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Show empty list with no message                  | Empty state with explanation + action                                    | Blank area looks broken; users don't know if content is loading or missing |
| Use infinite scroll on pages needing the footer  | Load-more button or pagination                                           | Footer with legal links/contact becomes unreachable                        |
| Show unread badge without `aria-label` on parent | `aria-label="Notifications, 3 unread"` on parent, `aria-hidden` on badge | Screen readers can't access overlay badge text                             |
