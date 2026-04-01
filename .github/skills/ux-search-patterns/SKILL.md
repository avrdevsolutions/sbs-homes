---
name: ux-search-patterns
description: >-
  Search type decision tree — command palette vs server-side instant search vs
  client-side filter, instant search combobox ARIA (role=combobox, aria-expanded,
  role=listbox, role=option), autocomplete suggestions, 200-300 ms debounce rule,
  faceted/filtered search with URL state and removable chips, saved filter presets,
  recent searches in localStorage, no-results state with actionable CTAs.
  Use when building search inputs, autocomplete dropdowns, faceted filter sidebars,
  or implementing searchable lists in admin panels and dashboards.
---

# Search Patterns

**Compiled from**: ADR-0026 §2 (Search)
**Last synced**: 2026-03-22

---

## Search Type Decision Tree

```
What is the search surface?
  → Application-wide (navigation + content + actions):
    → Command palette / ⌘K — fuzzy search across all entities
  → Content search (products, articles, documentation):
    → Dataset large (>1000 items)?
      → YES: Server-side search with results page
      → NO:  Client-side filtering (filter visible items in real-time)
  → Within a list/table (narrowing visible items):
    → Input filter above the list/table — filters as you type
```

---

## Instant Search (Search-as-you-type)

**Use when:** Server can respond in <200 ms (Algolia, Meilisearch, Typesense, indexed database).

**Do NOT use when:** Partial input produces irrelevant results. Large datasets without search indexing.

**Pattern:**
- Debounce: 200–300 ms — never fire on every keystroke
- Results: dropdown overlay or inline in the content area
- Highlight matches: `<mark>` element wraps matched text
- Group results by category: "Products (3)", "Articles (5)", "Users (1)"
- Clear button (×) in input when text is present
- URL state: `?q=search+term` — update on search for shareability and back-nav

**Suggestions / autocomplete:**
- Show popular/recent searches before the user types
- As user types: completion suggestions above full results
- Distinguish suggestions (complete the query) from results (navigate to them)
- Arrow keys navigate suggestions, Enter selects (combobox pattern)

**ARIA:**

```html
<input
  role="combobox"
  aria-expanded={isOpen}
  aria-controls="results-listbox"
  aria-autocomplete="list"
  aria-label="Search"
/>
<ul id="results-listbox" role="listbox">
  <li role="option" aria-selected={false}>Result A</li>
</ul>
<!-- Announce result count after debounce completes: -->
<div aria-live="polite">5 results for "design"</div>
```

**Keyboard:**
- Arrow Up/Down navigate results
- Enter selects; Escape closes dropdown and returns focus to input
- Tab moves focus out of the dropdown

**Responsive:**
- Desktop: results dropdown 320–480 px wide
- Mobile: full-screen search overlay — input at top, results below
- Touch: show recent searches on focus before typing

---

## Faceted / Filtered Search

**Use when:** Product catalogs, CRM, admin panels — narrowing by multiple attribute dimensions (category, status, date range, tags).

**Pattern:**
- Search input at top for text query
- Filter sidebar (desktop) or filter sheet/drawer (mobile) with facet groups:
  - Discrete values: checkboxes (status, category)
  - Numeric: range sliders (price, score)
  - Temporal: date pickers
- Active filters as removable chips above results:
  `<button aria-label="Remove filter: Status Active">Status: Active ✕</button>`
- "Clear all filters" button when any filter is active
- URL state: `?q=term&status=active&category=design&page=1`
- Result count: `aria-live="polite"` — "Showing 12 of 156 results"

**Saved filter presets:**
- "Save current filters" → user names the preset
- Store per user (Zustand persist or server-side)
- Quick-access dropdown of saved presets above the filter area

**ARIA:**

```html
<aside aria-label="Search filters">
  <fieldset>
    <legend>Status</legend>
    <label><input type="checkbox" /> Active</label>
    <label><input type="checkbox" /> Archived</label>
  </fieldset>
</aside>
```

**Responsive:**
- Desktop: filter sidebar left, results right
- Mobile: "Filters" button → bottom sheet or full-screen drawer
- Show active filter count on the toggle button: "Filters (3)"

---

## Recent Searches

- Show last 5–10 searches when input is focused but empty
- Store in `localStorage` — local-only, never sent to analytics without consent
- Each item: clickable to re-run, × button to remove, "Clear recent searches" link at bottom
- ARIA: `role="listbox"`, each item `role="option"`, remove button `aria-label="Remove recent search: [term]"`
- Keyboard: Arrow keys navigate, Delete removes the highlighted item

---

## No-Results State

Never show a blank page. Always explain why and what to do next:

- Message: "No results for '[query]'" — show the actual query
- Suggestions: "Check your spelling", "Try broader terms", "Remove some filters"
- If filters are active: prominent "Clear all filters" CTA
- If category-scoped: "Search all [application]" CTA to broaden scope

---

## Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Fire a request on every keystroke | Debounce 200–300 ms |
| Blank page for no results | Always show no-results state with suggestions |
| Lose query on navigation / back | Persist `?q=term` in URL |
| Exact-string-only matching | Fuzzy or prefix matching — typos are common |
