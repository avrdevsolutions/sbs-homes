---
name: ux-tabs-accordions
description: >-
  Tabs and accordion patterns — horizontal tabs, vertical tabs, responsive tab-to-accordion switch,
  FAQ accordion, settings multi-open accordion, nested accordion limits. Decision trees for tabs vs
  accordion vs separate pages. Radix Tabs and Radix Accordion usage, ARIA requirements, URL sync.
  Use when choosing between tabs and accordion, implementing tab keyboard navigation, building
  collapsible FAQ or settings sections, or adapting tab layouts for mobile.
---

# Tabs & Accordion Patterns

**Compiled from**: ADR-0025 §3 (Tabs), §4 (Accordion / Collapsible)  
**Last synced**: 2026-03-22

---

## Tabs vs Alternatives — Decision Tree

```
Are the content sections mutually exclusive (user views one at a time)?
  → YES: Is each section short enough to fit without scrolling?
    → YES: Tabs — switching is instant, context is preserved
    → NO: Is the user likely to compare sections?
      → YES: Accordion — multiple can be open simultaneously
      → NO: Tabs — long content is fine if sections are logically distinct
  → NO: Can the user benefit from seeing multiple sections at once?
    → YES: Accordion or visible sections with scroll-to-section nav
    → NO: Separate pages — each section is a distinct route
```

```
Are there more than 6 tabs?
  → YES: Consider sub-navigation or separate pages instead
    → If tabs are essential: use scrollable tab bar with overflow
  → NO: Standard horizontal tab bar
```

**Implementation:** Radix Tabs via shadcn/ui — handles all keyboard navigation (roving tabindex, Arrow keys, `role="tablist"`) automatically. Never build custom tab keyboard management.

---

## Horizontal Tabs (Default)

**Pattern:**
- Tab list: horizontal row of tab triggers
- Content panel: single panel visible below tab list, switches on tab selection
- Active tab: visually distinct (underline, background color, bold text)
- URL sync (recommended): `?tab=pricing` — enables direct linking and back/forward navigation

**ARIA (automatic via Radix):**
- Tab list: `role="tablist"`
- Each tab: `role="tab"` with `aria-selected`, `aria-controls` pointing to panel id
- Panel: `role="tabpanel"` with `aria-labelledby` pointing to its tab
- Keyboard: Left/Right arrows move between tabs, Home/End jump to first/last
- Content change: panel updates — Radix handles `aria-live`-equivalent via role semantics

**Focus behavior:**
- Prefer **automatic** selection (focus = activate) for ≤5 tabs
- Prefer **manual** selection (focus, then Enter to activate) for >5 tabs — prevents excessive content switching when keyboard navigating

**Responsive:**
- Desktop: All tabs visible in a single row
- Mobile (≤5 tabs): All tabs visible, smaller text, horizontally centered
- Mobile (>5 tabs): Horizontally scrollable tab bar with overflow indicator

---

## Vertical Tabs

**Use when:** Settings pages, admin panels, documentation sidebars — longer tab labels, vertical space available.  
**Don't use on:** Mobile-first designs (vertical tabs consume too much horizontal space on small screens).

**Pattern:**
- Tab list on the left (200–280px wide), content panel on the right
- Same ARIA structure as horizontal tabs — only visual layout changes
- Active tab: background highlight or left border accent

**Responsive:**
- Desktop (≥1024px): Side-by-side (tabs left, panel right)
- Mobile (<1024px): Switch to horizontal tabs or accordion — vertical tabs break on narrow screens

---

## Responsive Tab-to-Accordion

**Use when:** Tab content on desktop that needs mobile navigation where horizontal space is limited and tab labels are long.

**Decision Tree — When to Switch:**
```
Is the screen width <768px?
  → YES: Are tab labels short (1–2 words each)?
    → YES: Keep horizontal tabs — they fit on mobile
    → NO: Switch to accordion — each "tab" becomes a collapsible section
  → NO: Use horizontal or vertical tabs as designed
```

**Pattern:**
- Render Tabs component on desktop, Accordion component on mobile
- Use `useMediaQuery` or CSS container queries to switch
- Both share the same content — only the wrapper component changes
- State sync: active tab index maps to open accordion item index
- Both must reflect the same `?tab=` URL parameter

**Anti-patterns:**
- ❌ Tabs so small they're unreadable on mobile — switch to accordion
- ❌ Building a custom responsive tab system instead of two Radix components with a media query switch
- ❌ Losing URL sync during the switch

---

## Accordion — Variant Decision Tree

```
Can the user benefit from seeing multiple sections simultaneously?
  → YES: Multi-open accordion (type="multiple")
  → NO: Is this an FAQ or settings panel where one section at a time is sufficient?
    → YES: Single-open accordion (type="single", collapsible={true})
    → NO: Consider tabs if sections are mutually exclusive
```

**Implementation:** Radix Accordion via shadcn/ui — handles `aria-expanded`, `role="region"`, `aria-labelledby`, Enter/Space keyboard toggle automatically. Never build custom disclosure keyboard management.

---

## FAQ Pattern

**Use when:** Help pages, product pages, landing pages with frequently asked questions.

**Pattern:**
- Single-open accordion (`type="single"` `collapsible={true}`)
- Question as the trigger, answer as the collapsible content
- Chevron icon rotates on open/close (animate per project motion defaults)
- Group questions by category with headings above each group

**ARIA (automatic via Radix):**
- Trigger: `<button>` with `aria-expanded`
- Content: `role="region"` with `aria-labelledby` pointing to trigger
- Keyboard: Enter/Space toggles — each trigger is a separate Tab stop (Disclosure pattern, not roving tabindex like Tabs)

**Responsive:** Same layout on all breakpoints — accordion is inherently responsive. Ensure trigger text wraps to multiple lines on mobile rather than truncating.

---

## Settings / Form Group Accordion

**Use when:** Settings pages or complex forms where sections group related fields (Account, Notifications, Privacy) and users edit one section at a time.

**Pattern:**
- Multi-open accordion (`type="multiple"`) — users may need to reference one section while editing another
- Section header shows a summary of current settings (e.g., "Notifications: Email, Push")
- Open state persisted in `localStorage` or URL — user returns to same expanded state

---

## Nested Accordions

**Almost always avoid.** Nested accordions create confusing hierarchy and poor keyboard navigation.

**Exception:** Documentation or deep FAQ where a category contains sub-categories. Limit to 2 levels maximum. Prefer tree view for 3+ levels.

**Anti-patterns:**
- ❌ 3+ levels of nested accordions — use tree view or separate pages
- ❌ Single-item accordion (one collapsible section alone) — use `<details>`/`<summary>` or Radix Collapsible instead
- ❌ Accordion where all items should be visible (no progressive disclosure benefit) — use headed sections with scroll-to-section nav
- ❌ Accordion for primary navigation — use sidebar nav

---

## General Anti-Patterns

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| More than 7 tabs crammed in a row | Scrollable tab bar, or separate pages | Tabs become unreadable and untappable |
| Accordion for primary navigation | Use sidebar nav | Accordion hides nav — users must open each to discover destinations |
| Nested accordion 3+ levels deep | Use tree view for deep hierarchy | Deep nesting creates confusing keyboard navigation |
| Tabs that look like buttons | Standard tab styling (underline active tab) | Users expect button behavior, not tab switching |
