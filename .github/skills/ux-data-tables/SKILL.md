---
name: ux-data-tables
description: >-
  Data table and pagination patterns — pagination strategy decision tree (numbered/cursor/infinite/
  load-more), numbered pagination with ellipsis and URL state, cursor-based pagination, results
  summary formats, data table complexity decision tree, sortable columns with aria-sort, filterable
  rows with filter chips, row selection with bulk action bar, responsive table strategies (card
  stack vs horizontal scroll with sticky column), inline editing, TanStack Table recommendation.
  Use when building admin tables, search result lists, sortable/filterable data views, bulk action
  interfaces, or choosing a pagination strategy.
---

# Data Tables & Pagination Patterns

**Compiled from**: ADR-0025 §7 (Pagination), §8 (Data Tables)  
**Last synced**: 2026-03-22

---

## Pagination Strategy — Decision Tree

```
What is the user's primary task?
  → Browsing/discovery (social feed, news, inspiration):
    → Infinite scroll — continuous flow matches browse behavior
  → Searching with intent (looking for a specific result):
    → Numbered pagination — user needs to revisit page 3, share "results page 5"
  → Catalog browsing (products, listings):
    → Load-more button — user controls pace, URL reflects results count
  → Admin/dashboard tables:
    → Numbered pagination — predictable, matches data table UX
```

---

## Numbered Pagination

**Use when:** Search results, data tables, admin panels — position in the dataset matters and direct page access is useful.

**Pattern:**
- Show: First, Previous, current-range (`3 4 **5** 6 7`), Next, Last
- Ellipsis for gaps: `1 … 4 5 **6** 7 8 … 42`
- Current page visually distinct (filled background, bold)
- URL: `?page=6` — required for shareability and back/forward navigation
- Disable (don't hide) Previous on page 1, Next on last page — use `aria-disabled`

**Page Range Display Decision Tree:**
```
How many total pages?
  → ≤7: Show all page numbers — no ellipsis needed
  → 8–20: Show first, last, and 2 neighbors of current: 1 … 4 5 [6] 7 8 … 20
  → 20+: Same pattern, but add a "Jump to page" input for direct access
```

**ARIA:**
- Pagination wrapper: `<nav aria-label="Pagination">`
- Current page: `aria-current="page"` on the active link/button
- Previous/Next: `aria-label="Go to previous page"` / `aria-label="Go to next page"`
- Page links: `aria-label="Go to page 6"` (not just "6")
- Disabled buttons: `aria-disabled="true"` (not removed from DOM)

**Responsive:**
- Desktop: Full page range with ellipsis
- Mobile: Compact — Previous/Next buttons + "Page 6 of 42" + optional page jump

---

## Cursor-Based Pagination

**Use when:** Real-time data where items are inserted/deleted frequently (chat, activity logs), or large datasets where offset pagination is expensive.  
**Don't use when:** Users need random access to any page. When total count is needed for display.

**Pattern:**
- API returns `nextCursor` (opaque string) instead of page numbers
- "Load more" or infinite scroll uses the cursor to fetch the next batch
- No total page count displayed
- URL: `?cursor=abc123` (optional — cursor URLs are not human-readable)
- Back navigation: store previous cursors in a stack for "Previous" support

**Anti-pattern:** Displaying page numbers with cursor-based pagination — the cursor is an opaque token, not a page number. Use load-more or infinite scroll instead.

---

## Results Summary

Always show a results summary above paginated content:

| Context | Format |
|---------|--------|
| Known total | "Showing 41–60 of 156 results" |
| Filtered | "12 results for 'design'" |
| Load-more | "Showing 60 of 156 results — Load more" |
| Cursor-based | "Showing 60 results" (no total) |
| Empty | Empty state (onboarding/search/cleared variant as appropriate) |

---

## Data Table — When to Use

**Use when:** Structured data with consistent columns where users compare rows, sort by attributes, or perform bulk actions.  
**Don't use when:** Unstructured content (use cards). Data with 1–2 attributes per item (use a list). Primarily visual content (use a grid).

**Complexity Decision Tree:**
```
How many columns?
  → 1–3: Simple list layout — a table is overkill
  → 4–8: Standard table — sortable columns, optional filtering
  → 9+: Complex table — column visibility toggle, horizontal scroll, or split into tabs
```

```
Does the user need to act on rows?
  → YES: Bulk actions?
    → YES: Row selection (checkboxes) + bulk action bar
    → NO: Inline action buttons or row-click-to-detail
  → NO: Read-only table — simpler implementation
```

---

## Sortable Columns

**Pattern:**
- Click column header: sort ascending → click again: descending → click again: unsorted (three-state)
- Sort icon: ▲ ascending, ▼ descending, ⇅ neutral/unsortable
- One column sorted at a time (unless multi-sort is explicitly needed)
- Sort state in URL: `?sort=name&order=asc`

**ARIA:**
- Column header: `<th>` with a `<button>` inside as the sort trigger
- `aria-sort="ascending"` / `aria-sort="descending"` / `aria-sort="none"` on the `<th>`
- Sort button: `aria-label="Sort by Name, currently ascending"`

---

## Filterable Rows

**Pattern:**
- Filter bar above the table: dropdown selects, search input, or filter chips
- Active filters shown as removable chips: "Status: Active ✕"
- "Clear all filters" button when any filter is active
- Filter state in URL: `?status=active&role=admin`
- Results count updates live: "Showing 12 of 156 results"

**ARIA:**
- Filter inputs: standard form controls with labels
- Filter chips: `<button>` with `aria-label="Remove filter: Status Active"`
- Table region: `aria-live="polite"` — announces filtered count change
- "Clear all filters": visible button, keyboard accessible

---

## Row Selection & Bulk Actions

**Pattern:**
- Checkbox in first column of each row
- Header checkbox: select all / deselect all (indeterminate state when some selected)
- Bulk action bar: appears above the table when ≥1 row is selected — "3 selected: Delete | Export | Assign"
- Selection count: "3 of 156 selected" — or "All 156 selected" with "Select all results" link when full page is checked

**ARIA:**
- Row checkbox: `aria-label="Select row: [primary identifier]"` (e.g., "Select row: John Doe")
- Header checkbox: `aria-label="Select all rows"` with `aria-checked="mixed"` for indeterminate
- Bulk action bar: `role="toolbar"` with `aria-label="Bulk actions"` — focus moves to toolbar when selection starts
- Count change: `aria-live` region announces "3 rows selected"

---

## Responsive Table — Decision Tree

```
Is the table narrow enough for mobile (≤5 short columns)?
  → YES: Table renders normally — no special treatment
  → NO: Is the data structured for row-by-row reading?
    → YES: Card stack — each row becomes a card with label-value pairs
    → NO: Is column comparison (scanning vertically) important?
      → YES: Horizontal scroll with sticky first column
      → NO: Card stack with priority columns visible, secondary in expandable detail
```

**Horizontal scroll with sticky column:**
- Wrap `<table>` in `overflow-x: auto` container
- First column (identifier): `position: sticky; left: 0` with background color and right-edge shadow on scroll
- Scroll container: `tabindex="0"` with `role="region"` `aria-label="Scrollable table: [table title]"`
- `<caption>` on the `<table>` describing its purpose

**Card stack:**
- Each row becomes a card with label-value pairs
- Column headers become field labels within the card
- Primary data is prominent; secondary data is smaller
- Actions become card footer buttons or a kebab menu (⋮)

---

## Inline Editing

**Use when:** Data the user frequently updates in place — status changes, quick notes, simple value edits.  
**Don't use when:** Complex edits requiring validation (use a modal or detail page). Edits that need confirmation (use a confirmation dialog).

**Pattern:**
- Cell displays value; click/Enter activates edit mode (input replaces display text)
- Escape cancels, Enter/blur saves
- Optimistic update — show new value immediately, revert on error

**ARIA:**
- Edit trigger: `aria-label="Edit [column]: [current value]"` on the cell or edit button
- Edit mode: input auto-focused with current value selected
- Enter saves, Escape cancels — announce result via toast or inline status

---

## Library Recommendation

**TanStack Table** — headless table library. Provides sorting, filtering, pagination, row selection, column resizing. Zero UI — you render the table with your own markup and Tailwind classes. ~15kB gzipped.

- Install when a table needs sorting, filtering, or selection — don't use for simple static tables
- Compatible with ADR-0002 (headless, no CSS-in-JS)
- Pairs with shadcn/ui's `<Table>` primitive for rendering

**Forbidden:** MUI DataGrid, Mantine Table, AG Grid with MUI — violate the no-CSS-in-JS-runtime constraint.

---

## Anti-Patterns

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Grid of `<div>` elements pretending to be a table | Use semantic `<table>` with `<th>`, `<tr>`, `<td>` | Screen readers can't navigate div-tables |
| Hide table on mobile with no alternative | Horizontal scroll with sticky column, or card stack | Mobile users can't access the data |
| Sort icon that's just decorative | `<button>` inside `<th>` with `aria-sort` | Decorative sort icons suggest unusable functionality |
| Load entire 10,000-row dataset client-side | Server-side pagination or virtual scrolling | Browser freezes; memory exhaustion |
| Page numbers as plain text | Each page number is a link or button | Keyboard users can't navigate to other pages |
| Pagination with no URL state | Reflect `?page=N` in URL | Users can't share, bookmark, or use back/forward |
| Infinite scroll on pages with footer content | Load-more button, or place footer in sidebar | Footer becomes unreachable |
