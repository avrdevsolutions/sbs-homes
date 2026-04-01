---
name: ux-display-indicators
description: >-
  Progress and hierarchical display patterns — step indicator variants (numbered/progress bar/
  breadcrumb/dots decision tree), step states (completed/current/future/error with ARIA),
  vertical and horizontal timelines with semantic list markup, tree view with WAI-ARIA tree
  keyboard navigation (roving tabindex, type-ahead), expandable card inline expand pattern,
  card flip (3D rotateY, ARIA for both faces). Use when showing multi-step checkout or wizard
  progress, activity history or changelog, hierarchical file or category trees, expandable card
  grids, or two-faced flashcard or contact card components.
---

# Progress Indicators, Timelines, Trees & Expandable Cards

**Compiled from**: ADR-0025 §10 (Stepper / Wizard Indicators), §11 (Timeline / Chronological), §12 (Tree View / Hierarchical), §14 (Expandable Cards)
**Last synced**: 2026-03-22

---

## Stepper / Wizard Indicators

> This skill covers the **visual step indicator display**. Form UX for multi-step wizards (per-step validation, back/next, draft saving, URL persistence per step) is a separate concern.

### Step Indicator Type — Decision Tree

```
Can the user jump to any completed step?
  → YES: Breadcrumb-style clickable steps — each completed step is a link/button
  → NO: Is the flow strictly linear?
    → YES: Are there ≤6 steps with meaningful labels?
      → YES: Numbered steps with labels
      → NO: Progress bar with "Step 2 of 8" text
    → NO: Numbered steps — completed are checkmarked, future are disabled
```

| Variant | Visual | When to Use |
|---------|--------|-------------|
| **Numbered steps** | Circles with numbers + connecting lines | ≤6 steps with clear labels |
| **Progress bar** | Filled bar with percentage/step count | Steps where individual identity doesn't matter |
| **Breadcrumb steps** | Clickable step labels in a row | Non-linear flows where users can jump |
| **Compact dots** | Dots (like carousel indicators) | Mobile, or when step count matters but labels don't |

### Step States

| State | Visual | Behavior |
|-------|--------|----------|
| **Completed** | Checkmark icon, filled/success color | Clickable if non-linear; static if linear |
| **Current** | Highlighted ring/fill | Active — form fields visible |
| **Future** | Muted/gray, empty circle | Not clickable (disabled in non-linear) |
| **Error** | Error color ring, warning icon | Has validation errors — user must return |

**ARIA:**
```html
<ol aria-label="Checkout progress">
  <li>
    <a aria-label="Step 1: Shipping — completed">1</a>
  </li>
  <li>
    <span aria-current="step" aria-label="Step 2: Payment — current">2</span>
  </li>
  <li>
    <span aria-disabled="true" aria-label="Step 3: Review — not yet available">3</span>
  </li>
</ol>
```

- Error steps: `aria-label="Step 2: Payment — has errors"`
- Use `<ol>` (ordered list) for semantic sequence

**Responsive:**
- Desktop: Full horizontal stepper with labels
- Mobile: Compact — current step label + "Step 2 of 4" + progress dots or bar
- Don't fit long labels on mobile — abbreviate or use numbers only

---

## Timeline / Chronological

**Use when:** Activity history, changelog, project milestones, process documentation — ordered sequences with dates.
**Don't use:** Unordered content (use list/grid), steps in a process (use stepper), or navigation.

### Vertical Timeline (Default)

**Pattern:**
- Central or left-aligned line connecting timeline nodes
- Each node: `<time>` element + event content (title, description, optional type icon)
- Optional alternating sides on desktop (odd left, even right)
- Icons indicate event type (success, error, info, milestone) — mark as `aria-hidden="true"`

```html
<ol aria-label="Activity timeline">
  <li>
    <time datetime="2026-03-21T14:30:00Z">March 21, 2026</time>
    <p>Deployed version 2.4.0</p>
  </li>
  <li>
    <time datetime="2026-03-19T09:00:00Z">March 19, 2026</time>
    <p>PR #142 merged</p>
  </li>
</ol>
```

- Visual line and decorative icons: `aria-hidden="true"` — screen readers get the ordered list
- Don't use `role="tree"` — a timeline is a flat ordered sequence

**Responsive:** Desktop: alternating or centered. Mobile: left-aligned single-column (all events on right side of line).

### Horizontal Timeline

**Use when:** 3–8 milestones where left-to-right flow matches the progression (project phases, release timeline).
**Don't use:** >8 items (use vertical), or detailed event content (horizontal constrains text length).

- Horizontal line with evenly spaced nodes, labels above or below
- Active/current milestone highlighted
- Horizontal scrollable if items overflow (use horizontal scroll pattern from `ux-carousels` skill)
- Switch to vertical timeline on mobile (<768px) — horizontal timelines don't fit narrow screens

**Anti-patterns:**
- ❌ Horizontal timeline with >8 items — use vertical
- ❌ Timeline without dates — timestamps give meaning to the sequence
- ❌ Using timeline for navigation — use breadcrumbs or stepper

---

## Tree View / Hierarchical

**Use when:** 3+ nesting levels — file browsers, category selectors, documentation navigation, org charts.
**Don't use:** Flat lists (use simple list), 2 levels (use grouped list or accordion), ≤10 nav items (use sidebar nav).

### Pattern

- Indented tree with expand/collapse triangles (▸/▾) on nodes with children
- Click triangle to expand/collapse; click node label to select
- Selected node: visually highlighted
- Optional: multi-select with checkboxes

### WAI-ARIA Tree Pattern (Full Keyboard Support)

```html
<ul role="tree" aria-label="File browser">
  <li role="treeitem" aria-expanded="true">
    <span>src/</span>
    <ul role="group">
      <li role="treeitem" aria-expanded="false">
        <span>components/</span>
      </li>
      <li role="treeitem">
        <span>App.tsx</span>
      </li>
    </ul>
  </li>
</ul>
```

**Keyboard navigation (required — don't build custom):**

| Key | Behavior |
|-----|----------|
| ↑ / ↓ | Move between visible items |
| → | Expand node, or move to first child if already expanded |
| ← | Collapse node, or move to parent if already collapsed |
| Home / End | Jump to first / last visible item |
| Enter | Select the focused item |
| Type character | Type-ahead: jump to next matching item |

**Responsive:**
- Same tree on all breakpoints; indentation may decrease slightly on mobile
- Expand/collapse triggers must meet 44×44px touch target
- Consider off-canvas tree (drawer) on mobile if tree is wide
- Add search/filter if depth exceeds 4–5 levels — users get lost without it
- Lazy-load children on expand for large trees (hundreds of nodes)

**Anti-patterns:**
- ❌ Custom tree keyboard navigation — follow WAI-ARIA Tree pattern exactly
- ❌ Deeply nested tree without search
- ❌ Using `role="tree"` for a flat ordered list or timeline

---

## Expandable Cards

### Expand vs Navigate — Decision Tree

```
Is the detail content short (1-2 paragraphs, a few fields)?
  → YES: Inline expand — card grows to show detail, then collapses
  → NO: Is the detail a full entity view (profile, product detail)?
    → YES: Navigate to detail page — expand creates a page within a page
    → NO: Is the user browsing multiple cards and comparing?
      → YES: Inline expand — avoids losing grid context by navigating away
      → NO: Navigate to detail page
```

### Inline Expand Pattern

**Use when:** Project cards showing description, team cards showing bio, event cards showing schedule.

**Pattern:**
- Card shows preview state (image, title, short description)
- Click/Enter expands card — additional content slides down or card grows in place
- Other cards reflow around the expanded card; on mobile the card may overlay
- Only one card expanded at a time (accordion-like behavior in the grid)
- Close: click card again, close button (✕), or Escape key

```html
<div
  role="button"
  aria-expanded="false"
  tabindex="0"
>
  <!-- Preview content -->
</div>
<div role="region" aria-labelledby="card-title-id">
  <!-- Expanded detail content -->
</div>
```

- On open: move focus to expanded content region
- On close: return focus to the card trigger
- Keyboard: Enter to expand, Escape to collapse

**Responsive:** Desktop: expands in-place within the grid, pushing other cards down. Mobile: expands to full-width or navigates to detail page if content is substantial.

### Card Flip (3D)

**Use when:** Two distinct faces — contact cards (photo front, details back), flashcards, game tiles.
**Don't use:** Content where both sides should be simultaneously visible. Use inline expand if the "back" is just more of the same content.

**Pattern:**
- Click/keypress triggers 3D flip animation: `rotateY` on GPU-composited layer
- Back face contains different content from front (not just "more of the same")

**ARIA — both faces must be accessible to screen readers:**
```html
<!-- Option 1: aria-describedby linking front to back -->
<div class="card-front" aria-describedby="card-back-content">
  <img alt="Jane Doe, Engineering Lead" />
</div>
<div id="card-back-content" class="card-back">
  <p>Jane leads the platform team…</p>
</div>

<!-- Option 2: both faces present to AT, only visual flip applied -->
<!-- Don't use backface-visibility: hidden on the content containers —
     only on the visual flip wrappers -->
```

- Ensure keyboard focus works: Enter/Space to flip, content on both faces is tab-accessible

**Anti-patterns:**
- ❌ Auto-flipping cards — breaks screen reader focus
- ❌ Flip triggered only by hover — not available on touch devices; add click/tap trigger
- ❌ Using card flip for long content — the back has the same size as the front; use inline expand instead
- ❌ `backface-visibility: hidden` on content containers — hides content from screen readers
