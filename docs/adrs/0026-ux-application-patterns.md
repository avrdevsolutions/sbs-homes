# ADR-0026: UX Application Patterns

**Status**: Accepted
**Date**: 2026-03-21
**Supersedes**: N/A

---

## Context

ADR-0024 establishes universal UX interaction patterns — navigation, CTAs, feedback, form UX, responsive adaptation, keyboard/focus. ADR-0025 establishes content display patterns — carousels, tabs, accordions, data tables, pagination, trees. What neither covers is the **application-level orchestration** — how those atomic patterns compose into the interactive flows that functional web applications (SaaS, CMS, admin panels, dashboards, e-commerce) require.

Without this, agents make ad-hoc decisions about CRUD editing patterns, search UX, drag-and-drop architecture, real-time data strategies, dashboard layout, and onboarding flows. This ADR provides pattern knowledge and decision trees for **application-specific UX patterns** — flows that assume a backend, user state, and data that changes over time.

This is **Part 3** of a UX knowledge series:

| ADR | Scope |
|-----|-------|
| ADR-0024 | Core interaction patterns — navigation, CTAs, feedback, form UX, responsive, keyboard/focus |
| ADR-0025 | Content display — carousels, tabs, accordions, galleries, data tables, timelines, trees |
| **ADR-0026** (this) | Application-specific — CRUD, search, drag-and-drop, real-time, dashboards, onboarding |
| ADR-0027 (future) | Component APIs — implementation code and component interfaces |

## Decision

**Adopt standardized application UX patterns with decision trees for CRUD flows, search, drag-and-drop, real-time updates, dashboards, data management, file management, user/permission management, settings, onboarding, multi-select, context menus, notifications, error recovery, and keyboard shortcuts. Pattern selection is driven by the application domain and user workflow — not aesthetic preference.**

---

## Rules

| Rule | Level |
|------|-------|
| Use the decision trees in this ADR to select application patterns — don't invent ad-hoc flows | **MUST** |
| CRUD editing pattern (inline vs modal vs page) must match the edit complexity — use §1 decision tree | **MUST** |
| Destructive actions require confirmation (ADR-0024 §3.4) OR undo — never silent deletion | **MUST** |
| Search results must handle the no-results state (ADR-0024 §3.5 search variant) | **MUST** |
| Drag-and-drop must have a keyboard alternative (up/down buttons or keyboard sensor) | **MUST** |
| Real-time data must declare its update strategy (polling, SSE, or WebSocket) per §4 decision tree | **MUST** |
| Dashboard widgets that load async must show skeleton states (ADR-0024 §3.6) | **MUST** |
| File uploads must validate type and size on the server (ADR-0016) | **MUST** |
| Permission-gated UI must hide or disable inaccessible actions — never show then reject (ADR-0010) | **MUST** |
| Onboarding flows must be dismissible and skippable — never block the user from the product | **MUST** |
| Multi-select patterns must support keyboard (Space to toggle, Shift+click for range) | **MUST** |
| Context menus must have a visible button alternative — never right-click-only (ADR-0024 §5.5) | **MUST** |
| Notification state (read/unread, count) must be announced to screen readers (ADR-0024 §3.9) | **MUST** |
| Error recovery must offer retry for transient failures — never dead-end the user | **MUST** |
| Keyboard shortcuts must not conflict with browser or OS shortcuts | **MUST** |
| Offline-capable actions should queue and sync — never silently discard user work | **SHOULD** |
| Prefer undo over confirmation for routine, non-destructive actions | **SHOULD** |
| Use URL state for search, filters, and pagination (ADR-0020, ADR-0025 §7) | **SHOULD** |
| Animation timing and easing follow project transition defaults | **MUST** |
| UI primitives from ADR-0023 are used where they cover the use case | **MUST** |

---

## 1. CRUD Flows

### 1.1 Edit Pattern Decision Tree

The single most common application pattern. The edit surface must match the complexity and frequency of the edit.

```
How complex is the edit (number of fields, relationships)?
  → Simple (1-3 fields, single entity):
    → Is the edit frequent (>5 times per session)?
      → YES: Inline editing — click cell/field to edit in place (ADR-0025 §8.6)
      → NO: Modal editing — dialog with form fields
  → Medium (4-10 fields, single entity):
    → Is the edit the user's primary task on this page?
      → YES: Dedicated edit page — full form layout, URL-routed (/items/:id/edit)
      → NO: Modal editing — slide-over panel or centered dialog
  → Complex (10+ fields, multiple sections, or related entities):
    → Dedicated edit page — multi-section form, possibly with tabs or accordion sections
      → If 15+ fields: consider multi-step wizard (ADR-0024 §4.5)
```

### 1.2 Inline Editing

**When to use:** Quick value changes in tables and lists — status updates, titles, short text, toggles. The user stays in context without navigation.

**When NOT to use:** Edits requiring validation feedback on multiple dependent fields. Edits that need confirmation before saving. Complex or multi-field edits.

**Pattern:**
- Display mode: cell shows the current value as text
- Edit trigger: click the cell, or click a pencil icon, or press Enter when cell is focused
- Edit mode: input replaces text, pre-filled with current value and auto-selected
- Save: Enter or blur saves the value — optimistic update (ADR-0024 §3.7)
- Cancel: Escape reverts to original value
- Error: revert to original value + inline error message or toast (ADR-0024 §3.2)

**Accessibility:**
- Display mode: `aria-label="Edit [column]: [current value]"` on the cell or trigger button
- Edit mode: input auto-focused, `aria-label="[column]"`, `aria-describedby` linking to error if present
- Save result: announce via toast ("Saved") or inline status icon — don't rely on visual-only feedback

**Responsive:**
- Desktop: inline editing works everywhere — hover reveals edit affordance
- Mobile: tap to edit — ensure input is large enough for touch (§5.1 in ADR-0024)
- On narrow screens, consider a bottom sheet edit form instead of in-place input if the cell is small

**Reference:** Linear uses inline editing for issue titles and status. Notion uses inline editing for all database cell types. Airtable uses inline editing with type-specific inputs per column.

### 1.3 Modal / Panel Editing

**When to use:** Medium-complexity edits (4-10 fields) where the user benefits from staying on the current page (list, table, dashboard) while editing.

**When NOT to use:** Edits that need full-page layout. Edits that reference other content on the page the modal would obscure.

#### Decision Tree — Modal vs Slide-Over Panel

```
Will the user need to reference the underlying page content during the edit?
  → YES: Slide-over panel (side panel)  — partial page visible
  → NO: Is the form tall (scrollable)?
    → YES: Slide-over panel — side panels scroll better than modals
    → NO: Centered modal dialog — focused attention
```

**Slide-over panel pattern:**
- Opens from the right edge, 400-600px wide
- Underlying content is dimmed but partially visible
- Form fields inside the panel, save/cancel buttons at bottom (sticky)
- Close: X button, Escape, click overlay
- URL: optionally update to `?edit=:id` so the panel state is shareable

**Centered modal pattern:**
- Same as ADR-0024 §2.4 modal triggers — Radix Dialog
- Form fields inside, save/cancel buttons at bottom
- Maximum height: 80vh with internal scroll

**Accessibility:**
- Both patterns: `role="dialog"`, `aria-labelledby`, focus trap, Escape to close (ADR-0024 §6.1)
- Save button: specific verb ("Update project", not "Save")
- Unsaved changes: if the user tries to close with unsaved changes, show confirmation ("Discard changes?")

**Responsive:**
- Desktop: slide-over panel (right side) or centered modal
- Mobile: full-screen sheet — side panels don't fit on narrow screens (ADR-0024 §5.4)
- Save/cancel buttons: sticky at bottom on mobile for thumb reach

**Reference:** Linear uses slide-over panels for issue detail editing. Vercel uses centered modals for project settings. Stripe uses slide-over for customer detail editing.

### 1.4 Dedicated Edit Page

**When to use:** Complex edits with 10+ fields, multiple sections, or related entity management (e.g., editing a product with variants, images, and pricing).

**When NOT to use:** Simple edits that should stay in context. Frequent edits where navigation overhead is not justified.

**Pattern:**
- Route: `/items/:id/edit` — separate URL for the edit page
- Form layout: sections with headings, possibly tabs or accordion (ADR-0025 §3, §4)
- Top bar: breadcrumb navigation back to the list/detail page (ADR-0024 §1.3)
- Save/cancel actions: sticky at the top or bottom of the page — always visible during scroll
- Auto-save (optional): for long forms, auto-save drafts to prevent data loss (§14.4)

**Accessibility:**
- Form follows ADR-0012 rules (labels, `aria-describedby`, `aria-invalid`)
- Section navigation: if the form is long, provide an anchor sidebar (ADR-0024 §1.2 scroll-to-section)
- Save confirmation: announce via toast or page redirect

**Responsive:**
- Single-column layout on mobile, multi-column on desktop
- Section anchors become a dropdown or horizontal pill bar on mobile

### 1.5 Create Flow

#### Decision Tree — Create Pattern

```
How many fields does the create form have?
  → 1-3: Inline create — input row at top/bottom of list, or popover
  → 4-8: Modal create — dialog with form fields
  → 9+: Dedicated create page — /items/new
```

**Inline create pattern:**
- "Add item" button or an always-visible empty input row at the top/bottom of a list
- User types a value (e.g., title), presses Enter → item created with defaults
- Optimistic: item appears in the list immediately (ADR-0024 §3.7)
- After creation: focus stays on the input for rapid sequential creation
- Example: adding a task to a list, adding a comment

**Modal/page create:** Same patterns as §1.3 and §1.4 but with empty form.

**Post-create behavior:**
- Redirect to the new item's detail/edit page (for complex entities)
- Stay on the list with the new item highlighted (for simple entities)
- Toast confirmation: "Item created" with optional "View" action link

**Reference:** Linear uses inline create for issues (title field → Enter). Notion uses "/" command for block creation. Todoist uses inline create with an always-visible input.

### 1.6 Delete Patterns

#### Decision Tree — Delete Strategy

```
Is the data recoverable if deleted?
  → YES (soft delete available):
    → Is deletion frequent (e.g., clearing completed tasks)?
      → YES: Immediate delete + undo toast (5-8 second window)
      → NO: Confirmation dialog with "Delete" button (ADR-0024 §3.4)
  → NO (hard delete, permanent):
    → Is the entity valuable (project, account, repository, with cascading effects)?
      → YES: Type-to-confirm dialog — user must type entity name to enable "Delete" button
      → NO: Standard confirmation dialog (ADR-0024 §3.4)
```

**Undo pattern (preferred for routine deletions):**
1. User clicks delete → item removed from UI immediately (optimistic)
2. Toast appears: "Item deleted" with "Undo" action button
3. If no undo within 5-8s → execute server deletion
4. If undo clicked → restore item in UI, cancel server deletion
5. State: use TanStack Query mutation with rollback (ADR-0005)

**Type-to-confirm pattern (for high-impact deletions):**
- Dialog title: "Delete [entity name]?"
- Body: explains consequences — "This will permanently delete 'My Project' and all 42 associated items. This cannot be undone."
- Input: "Type 'My Project' to confirm"
- Delete button: disabled until input matches, uses danger/destructive variant
- Cancel button: focused by default (safe default per ADR-0024 §3.4)

**Soft delete considerations:**
- Deleted items move to a "Trash" or "Recently deleted" area
- Auto-purge after 30 days (configurable)
- Provide "Restore" action in trash view
- Show item count in trash if the trash nav item has a badge (ADR-0024 §3.9)

**Accessibility:**
- Confirmation dialog: `role="alertdialog"` (not just `dialog`) for urgency
- Type-to-confirm input: `aria-label="Type '[entity name]' to confirm deletion"`
- Undo toast: ensure "Undo" button is focusable and announced (Sonner handles this per ADR-0024 §3.2)

**Responsive:**
- Same dialog pattern on all breakpoints
- On mobile: bottom sheet dialog (ADR-0024 §5.4) for delete confirmation
- Undo toast: full-width on mobile, positioned top-center

**Reference:** GitHub uses type-to-confirm for repository deletion. Linear uses undo toast for issue deletion. Notion uses soft delete with a Trash page. Gmail uses undo for email deletion.

### 1.7 Optimistic Updates & Conflict Handling

ADR-0024 §3.7 covers the optimistic UI behavioral pattern. This section covers the **application-level** concern: what happens when optimistic updates conflict with server state.

**Conflict scenarios:**
1. **Stale data** — user edits V1, another user already saved V2
2. **Network failure** — optimistic update displayed but server mutation fails
3. **Validation failure** — client allows an edit that the server rejects

#### Decision Tree — Conflict Resolution

```
Did the mutation fail?
  → YES (network error):
    → Revert UI to pre-mutation state
    → Show error toast with "Retry" action
    → Keep user's input in memory so retry doesn't lose data
  → YES (validation error):
    → Revert UI to pre-mutation state
    → Show inline error on the field(s) that failed
  → NO (success, but version conflict detected):
    → Is the application collaborative (multiple users editing)?
      → YES: See §4.4 (collaborative conflict resolution)
      → NO: Last-write-wins — server accepts the latest mutation
```

**State management:** TanStack Query's `useMutation` with `onMutate` (optimistic update), `onError` (revert), `onSettled` (refetch for reconciliation) per ADR-0005.

---

## 2. Search

### 2.1 Search Type Decision Tree

```
What is the search surface?
  → Application-wide (navigation + content + actions):
    → Command palette / ⌘K (ADR-0024 §1.8) — fuzzy search across all entities
  → Content search (products, articles, documentation):
    → Is the dataset large (>1000 items)?
      → YES: Server-side search with results page
      → NO: Client-side filtering (filter visible items in real-time)
  → Within a list/table (narrowing visible items):
    → Input filter above the list/table — filters as you type (ADR-0025 §8.3)
```

### 2.2 Instant Search (Search-as-you-type)

**When to use:** Content search where the server can respond in <200ms (indexed search, Algolia, Meilisearch, Typesense). Product search, documentation search.

**When NOT to use:** Complex queries where partial input produces irrelevant results. Very large datasets without search indexing (would hammer the database).

**Pattern:**
- Search input in the header or a dedicated search page
- Debounce input: 200-300ms — don't fire a request on every keystroke
- Show results in a dropdown below the input (overlay) or in the main content area
- Highlight matching text in results with `<mark>` element
- Show category grouping: "Products (3)", "Articles (5)", "Users (1)"
- Clear button (×) in the input when text is present
- URL state: `?q=search+term` — update URL on search so results are shareable

**Search suggestions / autocomplete:**
- Show popular/recent searches before the user types
- As user types, show completion suggestions above full results
- Distinguish between suggestions (complete the query) and results (navigate to them)
- Arrow keys navigate suggestions, Enter selects (combobox pattern)

**Accessibility:**
- Input: `role="combobox"` with `aria-expanded`, `aria-controls` pointing to results list, `aria-autocomplete="list"` (or `"both"` if suggestions complete the input)
- Results list: `role="listbox"`, each result `role="option"` with `aria-selected`
- Keyboard: Arrow Up/Down navigate results, Enter selects, Escape closes dropdown and clears, Tab moves focus out
- Announce result count: `aria-live="polite"` region with "5 results for 'design'" — update after debounce completes
- `<mark>` elements: screen readers announce marked text by default — no extra ARIA needed

**Responsive:**
- Desktop: results dropdown below input (320-480px wide)
- Mobile: full-screen search overlay — input at top, results below (same pattern as ⌘K on mobile per ADR-0024 §1.8)
- Touch: recent searches shown on focus (before typing) for quick re-access

**Reference:** Algolia InstantSearch powers Stripe docs and many e-commerce sites. Linear uses instant search for issues. Vercel uses instant search in the dashboard.

### 2.3 Faceted / Filtered Search

**When to use:** Product catalogs, admin panels, CRM — search results that can be narrowed by multiple attribute dimensions (category, status, date range, price range, tags).

**When NOT to use:** Simple search where facets add unnecessary complexity. Cases where search results are already focused (≤1 dimension).

**Pattern:**
- Search input at top for text query
- Filter sidebar (desktop) or filter sheet/drawer (mobile) with facet groups
- Each facet group: checkboxes for discrete values (status, category), range sliders for numeric (price, date), date pickers for temporal ranges
- Active filters displayed as removable chips above results: "Status: Active ✕" | "Category: Design ✕"
- "Clear all filters" button when any filter is active
- URL state: `?q=term&status=active&category=design&page=1` — all filter state in URL
- Result count updates live: "Showing 12 of 156 results"

**Saved filter presets:**
- "Save current filters" action → give the preset a name
- Stored per user (Zustand persist or server-side, per ADR-0020)
- Quick access: dropdown of saved presets above the filter area
- Example: "My open bugs", "High-priority this week"

**Accessibility:**
- Filter sidebar: `<aside aria-label="Search filters">`
- Each facet group: `<fieldset>` with `<legend>` for the group name
- Checkboxes: standard `<input type="checkbox">` with visible labels (ADR-0012)
- Active filter chips: `<button>` with `aria-label="Remove filter: Status Active"`
- Result count: `aria-live="polite"` region (ADR-0025 §8.3)

**Responsive:**
- Desktop: filter sidebar left, results right
- Mobile: filters behind a "Filters" button → opens as bottom sheet (ADR-0024 §5.4) or full-screen drawer
- Show active filter count on the toggle button: "Filters (3)"

**Reference:** Shopify admin uses faceted search for orders and products. Amazon uses faceted search with a left sidebar. GitHub uses faceted search for issues (labels, assignees, milestones).

### 2.4 Recent Searches & Search History

**When to use:** Any application with a search feature where users frequently re-run searches.

**Pattern:**
- Show recent searches when the search input is focused but empty
- Store last 5-10 searches in `localStorage` (per ADR-0020 for client state)
- Each recent item: clickable to re-run, with an × button to remove
- "Clear recent searches" link at the bottom
- Privacy: recent searches are local-only — never send to analytics without consent

**Accessibility:**
- Recent searches list: `role="listbox"` with each item as `role="option"`
- Remove button: `aria-label="Remove recent search: [term]"`
- Keyboard: Arrow keys navigate, Enter selects, Delete key removes highlighted item

### 2.5 No-Results State

ADR-0024 §3.5 covers the generic empty state pattern. For search, the no-results state must be more actionable.

**Pattern:**
- Message: "No results for '[query]'" — show the actual query
- Suggestions: "Check your spelling", "Try broader terms", "Remove some filters"
- If filters are active: "Clear all filters" CTA prominently displayed
- If the search is within a category: "Search all [application]" CTA to broaden scope
- Never show a blank page — always explain why there are no results and what to do next

---

## 3. Drag and Drop

### 3.1 Drag-and-Drop Strategy Decision Tree

```
What is being dragged?
  → List items (reorder within a single list):
    → Sortable list — vertical drag with gap indicators
  → Cards between columns (status change):
    → Kanban board — cross-list dragging with column drop zones
  → Files from the desktop:
    → File drop zone — upload area with drag-over visual state (§7)
  → Grid items (rearrange layout):
    → Sortable grid — 2D drag with placeholder position indicator
  → Tree nodes (reorganize hierarchy):
    → Sortable tree — nested drag with indentation-based drop targets
```

### 3.2 Sortable List

**When to use:** Ordered lists where manual order matters — task priority, navigation menu items, playlist tracks, form field ordering.

**When NOT to use:** Lists with inherent sort order (alphabetical, date, numeric score) — sorting should be automatic, not manual. Very large lists (>100 items) — performance degrades; use move-to-position instead.

**Pattern:**
- Drag handle on the left side of each item (⠿ grip icon) — not the entire row, to avoid conflicting with click/tap on the item content
- On drag start: item lifts with subtle shadow/scale
- During drag: gap indicator shows where the item will land (empty space between items)
- On drop: item animates into final position; list items reflow smoothly
- Persist new order: optimistic update (ADR-0024 §3.7) + server mutation with the new order array

**Keyboard alternative (required):**
- Focus the drag handle → Space/Enter to pick up → Arrow Up/Down to move → Space/Enter to drop → Escape to cancel
- Or: provide ▲/▼ buttons visible on focus for simple reordering
- Screen reader announcement: "Item 'Task A' picked up. Position 1 of 5." → "Moved to position 3 of 5." → "Item 'Task A' dropped at position 3."

**Accessibility:**
- Drag handle: `role="button"` with `aria-label="Reorder [item name]"` and `aria-describedby` linking to instructions
- Instructions (visually hidden): "Press Space to pick up. Use Arrow keys to move. Press Space to drop. Press Escape to cancel."
- Live region: `aria-live="assertive"` for pick-up/move/drop announcements
- The list itself: `role="listbox"` or semantic `<ol>` with reorder capability announced

**Responsive:**
- Desktop: drag handle visible on hover, always visible on focus
- Mobile: drag handle always visible — touch drag with activation delay (200ms hold or 5px distance threshold to distinguish from scroll)
- Touch: cancel drag if user scrolls vertically (vertical scroll wins over horizontal drag intent)

**Reference:** Todoist uses grab-handle list reordering. Linear uses drag reorder in views. Notion uses block drag handles for document structure.

### 3.3 Kanban Board

**When to use:** Status-based workflows where items move through stages — project management (To Do → In Progress → Done), CRM pipelines, content workflows, order processing.

**When NOT to use:** Data that doesn't have a status/stage dimension. Lists with >6 stages (too many columns). Datasets where most items are in one column (unbalanced — use a filtered list instead).

**Pattern:**
- Columns represent stages/statuses — each column has a header with count
- Cards within columns are individually draggable
- Drag a card to another column = status change
- Drag within a column = reorder within that status
- Visual feedback: column highlights on drag-over (drop target), card placeholder shows insertion point
- Server mutation: update item's status and order; optimistic update

#### Decision Tree — Column Overflow

```
Will columns have many items (>10)?
  → YES: Each column scrolls independently (vertical scroll within column)
    → Show item count in column header: "In Progress (23)"
    → Consider collapsible columns: click header to collapse to icon-only
  → NO: No scroll needed — all items visible
```

**Accessibility:**
- Board: `role="region"` with `aria-label="Project board"`
- Columns: `role="group"` with `aria-label="To Do, 5 items"`
- Cards: same drag keyboard interaction as §3.2 — Space to pick up, Arrow keys to move, Space to drop
- Cross-column move: arrow keys can move between columns (Left/Right switch column, Up/Down move within column)
- Alternative: dropdown on the card to change status without dragging — critical for keyboard/screen reader users

**Responsive:**
- Desktop (≥1024px): horizontal column layout, all columns visible
- Tablet (768-1023px): horizontal scroll — show 2-3 columns, scroll for more
- Mobile (<768px): single-column view — tabs or dropdown to switch between status columns (not horizontal scroll of full kanban)

**Reference:** Linear uses a polished kanban board for issue tracking. Trello popularized the kanban pattern. GitHub Projects uses kanban for issue workflows. Notion uses kanban as a database view option.

### 3.4 Grid Rearrangement

**When to use:** Dashboard widget rearrangement, image gallery ordering, form builder field arrangement — 2D grid where position matters.

**When NOT to use:** Content where order is derived from data (sort by date, name).

**Pattern:**
- Items on a CSS Grid layout
- Drag an item: other items reflow to make space at the cursor position
- Placeholder shows the landing position (outline or translucent copy)
- On drop: items animate to final positions (layout animation)

**Keyboard alternative:**
- Arrow keys in 4 directions (up/down/left/right)
- Or: a "Move to position" dropdown/input for precise placement

**Responsive:**
- Grid column count changes with breakpoint — rearranged positions must adapt (store position per breakpoint or normalize to a single order)
- On mobile: consider switching to a simple sortable list instead of 2D grid

### 3.5 Cross-List Dragging

**When to use:** Transfer items between containers — moving files between folders, assigning team members to projects, rearranging sidebar sections.

**Pattern:**
- Multiple droppable containers, each containing draggable items
- On drag: valid drop targets highlight, invalid targets show no-drop cursor
- On drop in a new container: item is removed from source, added to target
- If the containers have different types (e.g., "Available" → "Selected"): this is a transfer list (§11.3)

**Accessibility:**
- Announce the current container on pickup: "Picked up 'Item A' from 'Available'"
- Announce the target container during move: "Over 'Selected' list"
- On drop: "Dropped 'Item A' in 'Selected' at position 2"
- Keyboard: Tab between containers, Arrow keys within containers, Space to pick up/drop

### 3.6 Drag-and-Drop Performance

| Concern | Solution |
|---------|----------|
| Jank during drag | Use `transform: translate()` for drag position — never `top`/`left` (GPU composited) |
| Large lists (100+ items) | Virtualize the list (TanStack Virtual or react-window) — only render visible items |
| Frequent re-renders during drag | Use refs for drag position, `requestAnimationFrame` for visual updates — don't set state on every pointer move |
| Drop animation | Use Framer Motion `layoutId` or CSS transitions for the drop-settle animation — 200-300ms spring |

**Anti-patterns:**
- ❌ Drag-and-drop as the only way to reorder — keyboard users can't drag
- ❌ Full-row drag (no handle) in a list with clickable content — clicks become drags
- ❌ Drag without activation delay on mobile — conflicts with scroll
- ❌ Reordering without persisting to server — next page load reverts order
- ❌ Dragging items across the page without clear drop zone indication — user doesn't know where to drop

---

## 4. Real-Time Updates

### 4.1 Update Strategy Decision Tree

```
How fresh must the data be?
  → Seconds matter (chat, collaborative editing, live scores):
    → WebSocket — bidirectional, persistent connection
  → 5-30 second staleness is acceptable (dashboards, notification counts, order status):
    → Is the server sending updates to the client (server-initiated)?
      → YES: Server-Sent Events (SSE) — simpler than WebSocket for one-way data
      → NO: Polling with TanStack Query refetchInterval (ADR-0005)
  → Minutes of staleness is acceptable (analytics, reports, infrequent updates):
    → Polling with longer intervals (60-300s) or no auto-refresh (manual refresh button)
```

### 4.2 Polling

**When to use:** Data that changes periodically where the client needs to stay reasonably current — dashboard metrics, notification counts, background job status.

**When NOT to use:** Data that must be real-time (<5s). High-frequency polling (<5s intervals) on large payloads — use SSE or WebSocket instead.

**Pattern:**
- TanStack Query `refetchInterval` option: `useQuery({ queryKey, queryFn, refetchInterval: 15000 })`
- Conditional polling: `refetchInterval: isTabVisible ? 15000 : false` — stop polling when the tab is hidden
- Exponential backoff on errors: if fetch fails, increase interval (15s → 30s → 60s), reset on success
- Visual freshness indicator: show "Updated 30s ago" or a live-updating relative time

**Accessibility:**
- `aria-live="polite"` on data regions that update via polling — screen readers announce changes
- Don't update `aria-live` regions more frequently than every 10 seconds — too frequent is spam
- Provide a manual "Refresh" button for users who don't want to wait

**Reference:** GitHub uses polling for notification counts. Vercel uses polling for deployment status. Stripe dashboard uses polling for recent events.

### 4.3 Server-Sent Events (SSE)

**When to use:** Server-to-client unidirectional updates — notification feeds, live activity logs, build/deployment progress, stock tickers.

**When NOT to use:** Two-way communication (chat, collaborative editing). Data where the client frequently sends messages to the server. Environments where SSE connections are unreliable (some proxies, corporate firewalls).

**Pattern:**
- Server: Route Handler with `ReadableStream` and `text/event-stream` content type
- Client: `EventSource` API or `useQuery` with custom `queryFn` that reads the stream
- Reconnection: `EventSource` auto-reconnects with `Last-Event-ID` header — include event IDs server-side
- Keep-alive: send comment events (`:keep-alive\n\n`) every 30s to prevent proxy timeout

**Anti-patterns:**
- ❌ Opening multiple SSE connections to the same server — browsers limit concurrent connections per domain (typically 6). Use a single SSE connection with event types to multiplex.
- ❌ Sending large payloads via SSE — SSE is text-only, not binary. Large data updates should trigger a fetch of the full resource, not embed the data in the event.

### 4.4 WebSocket

**When to use:** Bidirectional real-time communication — chat, collaborative editing, multiplayer experiences, live cursors, presence indicators.

**When NOT to use:** One-way data feeds (use SSE). Data that tolerates 5+ seconds staleness (use polling). Simple applications without concurrent users.

**Pattern:**
- Connection lifecycle: connect on mount, reconnect on disconnect (exponential backoff), disconnect on unmount
- Authentication: pass session token in the initial connection handshake (via query param or auth message) — not in headers (WebSocket API doesn't support arbitrary headers)
- Message format: JSON with a `type` field for routing (`{ type: "cursor_move", data: { ... } }`)
- State sync: on reconnect, request full state snapshot to recover from missed messages

**Presence indicators (who's online):**
- Show avatar badges in the UI for active users (green dot = online, yellow = idle, gray = offline)
- Detect idle: no input/pointer events for >5 minutes → send idle status
- Show user cursors or selection highlights in collaborative editors
- Announce: "2 users viewing this page" — non-intrusive, informational

**Accessibility:**
- Presence indicators: don't rely on color alone — pair with text label or tooltip ("Online", "Away") per ADR-0019
- Live updates: use `aria-live="polite"` for new messages in chat, status changes
- Don't auto-scroll chat if the user has scrolled up to read history — show "N new messages" button to jump to latest

**Responsive:**
- Same real-time behavior on all breakpoints
- On mobile: reduce frequency of non-critical updates to save battery (e.g., cursor positions every 500ms instead of 100ms)

**Reference:** Linear uses WebSocket for real-time issue updates and presence. Notion uses WebSocket for collaborative editing and cursors. Figma uses WebSocket for multiplayer design.

### 4.5 Collaborative Editing Conflict Resolution

**When to use:** Applications where multiple users can edit the same entity simultaneously — documents, spreadsheets, form builders, wiki pages.

#### Decision Tree — Conflict Resolution Strategy

```
What type of content is being edited?
  → Rich text / documents:
    → Operational Transformation (OT) or Conflict-free Replicated Data Types (CRDTs)
    → Library: Yjs (CRDT), Liveblocks, or TipTap Collaboration
  → Structured data (forms, fields, settings):
    → Last-write-wins per field — merge at field level, not entity level
    → Show conflict notification: "This field was updated by [user] — accept theirs or keep yours"
  → Files / binary data:
    → Lock-based — user checks out the file, others see "Editing by [user]"
    → No merge possible for binary — conflict means one version wins
```

**Field-level conflict UI:**
- When saving, if the server detects a version mismatch:
  1. Reject the save with conflict details
  2. Show diff: "Your value: X. Current value: Y (changed by [user] at [time])"
  3. Actions: "Keep mine" / "Accept theirs" / "Merge manually (edit)"
- This is better than document-level lock for structured data — users usually change different fields

---

## 5. Dashboard Patterns

### 5.1 Widget Grid Layout

**When to use:** Analytic dashboards, admin home pages, project overviews — pages composed of multiple independent data widgets.

**When NOT to use:** Pages with a single focus or narrative flow. Content pages (articles, documentation).

**Pattern:**
- CSS Grid layout with configurable column count (typically 12-column grid for max flexibility)
- Each widget occupies a defined column span (e.g., 4/12, 6/12, 12/12)
- Widget components are independent: each fetches its own data, shows its own loading/error state
- Widget card structure: header (title + actions/menu), body (chart/content), optional footer (link to detail)

#### Decision Tree — Widget Size

```
What does the widget display?
  → Single KPI (number + trend): 3-4 columns (narrow card)
  → List/table (recent items, activity): 6 columns (half-width)
  → Chart (line, bar, pie): 6-8 columns (needs space for axes/legend)
  → Complex visualization (map, multi-chart): 12 columns (full-width)
```

**Accessibility:**
- Widget region: `role="region"` with `aria-label="Revenue this month"` (descriptive)
- Charts: provide data table alternative or `aria-label` on the chart SVG summarizing the data
- KPI values: ensure text is readable (not just large font — associate with label)
- Widget loading: `aria-busy="true"` while loading, skeleton placeholder (ADR-0024 §3.6)

**Responsive:**
- Desktop: 2-3 column grid
- Tablet: 2 columns — wide widgets go full-width
- Mobile: single column — all widgets stack vertically
- KPI cards: 2-per-row on mobile if they're small enough

**Reference:** Vercel dashboard uses a widget grid for project stats. Stripe uses a KPI bar + chart grid. Grafana uses a customizable widget grid.

### 5.2 Collapsible / Hideable Panels

**When to use:** Dashboard or workspace with supplementary panels (sidebar, detail panel, property panel) that the user may want to hide for focus.

**Pattern:**
- Panel with a collapse toggle (icon button in header or at the panel edge)
- Collapsed state: panel either hides completely or shrinks to an icon strip
- Content area expands to fill the freed space
- Persist collapse state in `localStorage` (per ADR-0020)

**Accessibility:**
- Toggle button: `aria-expanded="true"` / `"false"`, `aria-controls` pointing to the panel
- `aria-label="Toggle sidebar"` or `aria-label="Collapse properties panel"`
- Keyboard: standard button activation (Enter/Space)

**Responsive:**
- Desktop: persistent panel with collapse toggle
- Mobile: panel is off-canvas (drawer) by default — toggle opens/closes the drawer

**Reference:** VS Code uses collapsible sidebar + bottom panel. Notion uses a collapsible sidebar. Linear uses a collapsible sidebar with icon-only collapsed state.

### 5.3 Date Range Selectors

**When to use:** Dashboards and reports where the user selects a time frame for data filtering — analytics, financial reports, activity logs.

**Pattern:**
- Preset quick-picks: "Today", "Last 7 days", "Last 30 days", "This month", "This quarter", "Custom"
- Custom: opens a date range picker (two calendars for start/end, or a single calendar with range selection)
- Display selected range in the trigger: "Mar 1 – Mar 21, 2026"
- URL state: `?from=2026-03-01&to=2026-03-21` for shareability
- On range change: all dashboard widgets refetch with new date parameters

**Accessibility:**
- Date picker: use Radix Popover (via shadcn/ui) for the dropdown + a calendar grid inside
- Calendar grid: `role="grid"` with `aria-label="March 2026"`, each day cell as `role="gridcell"`
- Keyboard: Arrow keys navigate days, Enter selects, Page Up/Down switch months
- Selected range: `aria-label="Selected date range: March 1 to March 21, 2026"` on the trigger

**Responsive:**
- Desktop: popover calendar below the trigger
- Mobile: full-screen calendar (like mobile date picker native patterns)
- Presets: quick-pick buttons are always accessible, even on mobile — don't hide them behind the custom picker

**Reference:** Google Analytics uses preset + custom date range picker. Stripe uses quick-pick buttons + custom range. Vercel analytics uses a preset dropdown.

### 5.4 Chart Interactions

**When to use:** Interactive data visualizations — line charts, bar charts, area charts — where hovering or clicking reveals details.

**Pattern:**
- Tooltip on hover: show exact value, date, and comparison when cursor is over a data point
- Crosshair line: vertical line tracks cursor across chart, highlighting the nearest data point
- Click to drill down: clicking a bar/segment navigates to filtered detail view
- Zoom: in time-series charts, allow click-drag to select a date range for zoom (brush selection)
- Legend interaction: click a legend item to toggle that series on/off

**Accessibility:**
- Charts rendered as SVG or Canvas — neither is inherently accessible
- Provide a data table alternative: "View as table" toggle below the chart — shows the same data in tabular format (ADR-0025 §8)
- Chart `aria-label`: summarize the chart ("Revenue over the past 30 days, trending upward 12%")
- For SVG charts: `role="img"` on the root SVG, `<title>` element for description
- Don't rely on hover-only tooltips — provide "View as table" for full data access

**Responsive:**
- Desktop: full chart with hover interactions
- Mobile: tap to show tooltip (no hover); pinch-to-zoom if supported
- Simplify chart on mobile: reduce data point density, hide secondary series, stack legend below chart

---

## 6. Data Management

### 6.1 Bulk Operations

ADR-0025 §8.4 covers the row selection + bulk action bar pattern for data tables. This section covers the broader **application-level** bulk operation flow.

#### Decision Tree — Bulk Action Scope

```
How many items can be affected?
  → Current page only (20-50 items):
    → Page-level select-all checkbox — straightforward
  → Entire dataset (100+ items across pages):
    → Page-level select-all + "Select all N results" link
    → Warning: "This will affect all N items matching your current filters"
    → Execute as a background job if N > 100 — show progress indicator (ADR-0024 §3.8)
```

**Pattern:**
- Trigger: select ≥1 row → bulk action bar appears (slides in above or below the table)
- Actions available: Delete, Export, Assign, Change Status, Tag — depends on entity type
- Destructive bulk actions: confirmation dialog with count ("Delete 23 items?")
- Long-running operations (export, batch update): show progress bar, allow user to navigate away (background job with notification on completion)
- After completion: deselect all, refresh data, show toast with result ("23 items deleted")

**Accessibility:**
- Bulk action bar: `role="toolbar"` with `aria-label="Bulk actions, 23 items selected"`
- Announce selection changes: `aria-live="polite"` — "23 items selected" / "All items deselected"
- Each action button in the toolbar: clear label ("Delete selected", "Export selected")

### 6.2 Import / Export

**When to use:** Applications where users need to move data in or out — spreadsheet exports, data migration, backup/restore, report download.

#### Decision Tree — Export Format

```
What will the user do with the exported data?
  → Open in a spreadsheet (Excel, Google Sheets): CSV
  → Import into another system / API: JSON
  → Share as a report: PDF or CSV
  → Backup for re-import: JSON (preserves nested structure)
```

**Export pattern:**
- Export button in the data view toolbar (not hidden in a menu for common actions)
- If current filters are active: "Export filtered results (23 items)" — make it clear what's being exported
- Format selection: if multiple formats available, dropdown or radio buttons
- Large exports (>1000 rows): generate server-side as background job → notify when ready → download link
- Download: use `Content-Disposition: attachment` header — don't open in new tab

**Import pattern:**
- File upload area (§7 patterns) with accepted format indicated: "Upload CSV or JSON"
- Preview: after upload, show a preview of the first 5-10 rows with column mapping
- Column mapping: if import headers don't match, provide a mapper UI (dropdown per column)
- Validation: show errors per row — "Row 3: invalid email format" — don't reject the entire file for one bad row
- Partial import option: "Import valid rows (47 of 50), skip 3 errors"
- Progress: show import progress for large files

**Accessibility:**
- Export button: `aria-label="Export data as CSV"` or clear visible text
- Import file input: standard file upload (ADR-0016) with format instructions
- Preview table: standard accessible table (ADR-0025 §8)
- Error list: `role="alert"` for validation error summary

### 6.3 Saved Views & Column Visibility

**When to use:** Data tables where users have different workflow needs — some want to see all columns, others want a focused subset.

**Pattern:**
- Column visibility toggle: dropdown with checkbox per column — "Show/Hide Columns"
- Persist visibility preferences per user (Zustand persist per ADR-0020 or server-side)
- Saved views: combine column visibility + sort + filters + column order into a named view
- Default view: the view shown to new users — always available, not deletable
- Custom views: user-created, shareable via URL

**Accessibility:**
- Column toggle: `role="menuitemcheckbox"` or standard checkboxes in a dropdown
- When columns are hidden: announce "Showing 5 of 8 columns" — users should know data is hidden
- Saved view selector: standard dropdown/select pattern

---

## 7. File Management

ADR-0016 covers the backend strategy (UploadThing, presigned URLs, validation, storage). This section covers the **frontend UX patterns** for file management.

### 7.1 Upload Patterns Decision Tree

```
How is the upload triggered?
  → User picks files explicitly:
    → File picker button — standard <input type="file"> with styled trigger
  → User drags files from desktop:
    → Drag-to-upload drop zone — visual area that accepts dropped files
  → User pastes from clipboard:
    → Paste handler on a content area (e.g., chat input, comment box)
  → Multiple upload paths:
    → Combine: drop zone with a "Browse files" button inside + paste support
```

### 7.2 Drag-to-Upload Drop Zone

**When to use:** Any file upload area. The drop zone provides a more natural interaction than a file picker button alone, especially for multi-file upload.

**Pattern:**
- Visual area: dashed border, icon/text ("Drag files here or click to browse")
- On drag-over (file enters the zone): border highlights, background subtly changes, icon/text updates to "Drop files here"
- On drop: files are added to the upload queue
- "Browse files" button inside the drop zone as a fallback for non-drag interaction
- File type restrictions: show accepted types in the drop zone ("PNG, JPG, PDF up to 10MB")

**Drag-over detection:** Listen for `dragenter`, `dragleave`, `dragover`, and `drop` events on the zone. Track a `dragEnter` counter (increment on `dragenter`, decrement on `dragleave`) to handle nested elements correctly — visual state is active when counter > 0.

**Full-page drop zone (optional):** For applications where file upload is a primary action (media library, file manager):
- Listen for `dragenter` on `document.body`
- Show a full-page overlay with drop zone when files are dragged onto the page
- Dismiss overlay on `dragleave` from the page or on drop

**Accessibility:**
- Drop zone: `role="button"` (clickable to open file picker) with `aria-label="Upload files. Accepted formats: PNG, JPG, PDF. Maximum size: 10MB"`
- Drag-and-drop is an enhancement — the "Browse files" button is the accessible primary interaction
- File type and size restrictions: clearly stated in visible text, not just in `accept` attribute

**Responsive:**
- Desktop: full drop zone with drag-and-drop support
- Mobile: drop zone shows as a styled button/area — drag-and-drop is not available on mobile; focus on the "Browse files" button
- Camera capture: add `capture="environment"` option on mobile for photo upload

### 7.3 Upload Progress & Queue

**When to use:** Any file upload, especially for files >1MB or multi-file uploads.

**Pattern (single file):**
- After file selection: show file name, size, preview thumbnail (if image)
- Progress bar: determinate progress (ADR-0024 §3.8) showing upload percentage
- States: Queued → Uploading (progress %) → Processing (server-side) → Complete (✓) → Error (✗ with retry)
- Cancel button during upload: "✕" to abort the upload

**Pattern (multi-file queue):**
- List of files, each with its own progress bar and status
- Upload sequentially or in parallel (2-3 concurrent uploads max to avoid bandwidth saturation)
- Overall progress: "3 of 7 files uploaded" above the individual file list
- "Cancel all" / "Pause all" buttons for the entire queue
- Failed files: show at the end with retry button — don't retry automatically to avoid infinite loops

**Accessibility:**
- Each file progress: `role="progressbar"` with `aria-valuenow`, `aria-label="Uploading [filename]: 65%"`
- Status changes: `aria-live="polite"` — announce "File uploaded successfully" or "Upload failed: [filename]"
- Cancel button: `aria-label="Cancel upload: [filename]"`

**Responsive:**
- Same upload UI on all breakpoints
- On mobile: file list is full-width, progress bars fill the card width
- Preview thumbnails: smaller on mobile (48px vs 80px on desktop)

### 7.4 File Preview

**When to use:** After upload or in a file browser — show a preview of the file before the user acts on it.

#### Decision Tree — Preview Type

```
What file type?
  → Image (JPEG, PNG, WebP, GIF):
    → Thumbnail in list + lightbox on click (ADR-0025 §5)
  → PDF:
    → Thumbnail (first page rendered) + PDF viewer on click (new tab or embedded viewer)
  → Video:
    → Thumbnail (poster frame) + video player on click (ADR-0025 §5.3 video lightbox)
  → Audio:
    → Waveform visualization or play button with inline audio player
  → Other (DOC, XLS, ZIP):
    → File type icon + metadata (name, size, date) — no preview possible
```

### 7.5 Image Cropping

**When to use:** Profile avatars, cover images, thumbnails — anywhere the image must conform to a specific aspect ratio.

**Pattern:**
- After file selection: show cropping interface before upload
- Crop area: draggable + resizable selection rectangle on the image
- Aspect ratio lock: force the crop to the required ratio (1:1 for avatar, 16:9 for cover)
- Zoom: slider or pinch-to-zoom to adjust the image within the crop area
- Preview: show the cropped result alongside the crop interface
- Confirm: "Apply" → upload the cropped image

**Accessibility:**
- Crop area: `role="slider"` for zoom, keyboard arrow keys to move crop position
- Provide text-based alternative for precise cropping if needed (x, y, width, height inputs)
- Preview: `aria-label="Cropped image preview"`

**Responsive:**
- Desktop: side-by-side (cropper left, preview right)
- Mobile: full-width cropper, preview below or hidden until "Preview" button is tapped

### 7.6 Quota Indicators

**When to use:** Applications with storage limits — show the user how much space they've used and how much remains.

**Pattern:**
- Progress bar showing usage: "2.1 GB of 5 GB used"
- Color coding: green (<70%), yellow (70-90%), red (>90%)
- Warning at threshold: "You're running low on storage" with upgrade CTA
- Block uploads when quota is full: clear message + upgrade CTA (don't silently fail)

**Accessibility:**
- `role="progressbar"` with `aria-valuenow="42"` (percentage), `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Storage: 2.1 GB of 5 GB used, 42%"`
- Color: don't rely on color alone — the text label ("2.1 GB of 5 GB") provides the data (ADR-0019)

---

## 8. User & Permission Management

### 8.1 Role Picker

**When to use:** Assigning roles to users — team member management, collaborator invites, admin panels.

#### Decision Tree — Role Picker UI

```
How many roles exist?
  → 2-4: Radio buttons or segmented control (all visible at once)
  → 5-8: Dropdown select
  → 9+: Searchable dropdown or combobox
```

**Pattern:**
- Each role: name + short description of what it grants ("Admin — Full access to all settings and data")
- Current role: pre-selected, visually indicated
- Change confirmation: if changing another user's role, show what they'll gain/lose
- Self-demotion warning: "You're removing your own admin access. You won't be able to undo this." — require confirmation

**Accessibility:**
- Radio group: `role="radiogroup"` with `aria-label="User role"`, each option `role="radio"` with `aria-checked`
- Dropdown: standard select pattern, `aria-label="Select role for [user name]"`
- Role descriptions: `aria-describedby` linking each option to its description

### 8.2 Permission Matrix

**When to use:** Granular permission configuration — custom roles with specific permissions, API key scoping, integration access.

**Pattern:**
- Table layout: rows = permissions/features, columns = roles
- Each cell: checkbox (can/can't) or dropdown (no access / read / write / admin)
- Group rows by feature area: "Projects", "Users", "Billing"
- Summary row/column: total enabled permissions per role
- Highlight changes: changed cells show visual diff before saving

**Accessibility:**
- Use `<table>` with proper headers (ADR-0025 §8)
- Each checkbox: `aria-label="[Role] can [permission]"` (e.g., "Editor can Delete projects")
- Group headers: `<th scope="rowgroup">` for feature area groupings

**Responsive:**
- Desktop: full matrix visible
- Mobile: vertical card layout — one card per role, listing its permissions. Or horizontal scroll with sticky first column (ADR-0025 §8.5)

**Reference:** GitHub uses a permission matrix for organization roles. Vercel uses role-based dropdown for team members. Notion uses a simplified role picker (Admin, Member, Guest).

### 8.3 Invite Flow

**When to use:** Team-based applications where existing members invite new users.

**Pattern:**
1. Invite trigger: "Invite member" button
2. Input: email address(es) — support multiple (comma-separated or one-per-line)
3. Role selection: assign role to the invite (§8.1)
4. Optional: personal message
5. Send: generates invite link, sends email notification
6. Pending state: invited user appears in team list with "Pending" badge
7. Accepted: badge changes to role, user appears as active
8. Expired: show "Resend invite" action after 7 days

**Accessibility:**
- Multi-email input: tag/pill pattern (§11.2) — each email as a removable pill
- Pending member in list: `aria-label="[email], invite pending"` with "Resend" and "Revoke" actions

### 8.4 User Status Indicators

ADR-0024 §3.9 covers badge patterns. For user status specifically:

| Status | Visual | Meaning |
|--------|--------|---------|
| Online | Green dot | Active in the last 5 minutes |
| Idle | Yellow dot | No activity for 5-30 minutes |
| Offline | Gray dot (or no dot) | No activity for 30+ minutes or explicitly set |
| Busy / Do Not Disturb | Red dot | User set this manually — suppress notifications |

- Don't rely on color alone — pair with tooltip text on hover/focus: "Online", "Away", etc. (ADR-0019)
- Dot position: bottom-right of the user avatar, overlapping slightly

---

## 9. Settings & Preferences

### 9.1 Settings Page Organization

#### Decision Tree — Settings Layout

```
How many settings categories exist?
  → 1-3: Single page with sections (headings + anchors)
  → 4-8: Vertical tabs (desktop) + accordion (mobile) — ADR-0025 §3.3, §3.4
  → 9+: Sidebar navigation to settings sub-pages (ADR-0024 §1.5)
```

**Pattern:**
- Group related settings under clear headings: "Profile", "Notifications", "Security", "Billing"
- Each group: form fields that can be saved independently or together
- Persistent save button (sticky) or auto-save per section

**Reference:** Vercel uses sidebar navigation for settings. GitHub uses vertical tabs. Linear uses a flat list with sections.

### 9.2 Grouped Toggle / Switch Patterns

**When to use:** Binary settings — on/off, enabled/disabled. Notification preferences, privacy settings, feature flags.

**Pattern:**
- Label on the left, toggle switch on the right
- Description text below the label (secondary text explaining the effect)
- Immediate effect: toggle saves immediately (no form submit) — show toast on save
- If toggles are part of a larger form: group them and use a single Save button

**Accessibility:**
- `role="switch"` with `aria-checked` (not `role="checkbox"`)
- Toggle label: standard `<label>` connected via `htmlFor`
- Description: `aria-describedby` linking the toggle to the description text
- Keyboard: Space toggles (same as checkbox)

### 9.3 Save / Discard State

**When to use:** Settings forms where changes are saved together (not auto-saved individually).

**Pattern:**
- Track dirty state: compare current form values to saved values
- When dirty: show a save bar (sticky bottom or top) — "You have unsaved changes" with "Save" and "Discard" buttons
- Save: submit changes, show success feedback, clear dirty state
- Discard: reset form to saved values, clear dirty state
- Navigation guard: if user navigates away with unsaved changes, show "Discard changes?" confirmation

**Implementation:**
- React Hook Form: `formState.isDirty` provides dirty tracking automatically (ADR-0012)
- For non-form settings: Zustand store with a `hasChanges` derived state (ADR-0020)
- Navigation guard: use Next.js `beforeunload` event + `router.events` (or `useRouter` interception)

**Accessibility:**
- Save bar: `role="status"` with `aria-live="polite"` — announces "You have unsaved changes"
- Save/Discard buttons: clearly labeled, keyboard accessible
- Navigation guard dialog: `role="alertdialog"` (ADR-0024 §3.4)

### 9.4 Danger Zone

**When to use:** Settings that are destructive or hard to reverse — account deletion, team disbanding, data export with destroy, API key regeneration.

**Pattern:**
- Visual separation: bordered/highlighted section at the bottom of the settings page with a danger/error border color
- Section title: "Danger Zone" or "Destructive Actions"
- Each action: clear description of what happens + CTA button with destructive variant
- Confirmation: type-to-confirm for irreversible actions (§1.6), standard confirmation for reversible ones
- Feedback: explain what the user is about to lose and whether it's recoverable

**Anti-pattern:** Don't mix danger zone actions with regular settings — keep them visually and spatially separated.

**Reference:** GitHub settings pages have a "Danger Zone" section with red border. Vercel uses destructive button variant for project deletion. Heroku uses a similar danger zone pattern.

### 9.5 Account Deletion Flow

**When to use:** Self-service account deletion (required by GDPR Article 17 — right to be forgotten).

**Pattern:**
1. "Delete my account" button in the Danger Zone section
2. Informational modal/page: explain what will be deleted (data, projects, team memberships)
3. Offer alternatives: "Would you like to export your data first?"
4. Confirmation: type-to-confirm with email or account name (§1.6)
5. Cooldown period: "Your account will be deleted in 14 days. You can cancel during this period."
6. Email confirmation: send confirmation email with cancellation link
7. After cooldown: permanent deletion + confirmation email

---

## 10. Onboarding

### 10.1 Onboarding Strategy Decision Tree

```
Is the product simple (<3 core features)?
  → YES: No formal onboarding — empty states (ADR-0024 §3.5) guide the user naturally
  → NO: Does the user need to complete setup steps before using the product?
    → YES: Setup wizard (§10.2) — blocking flow to configure essentials
    → NO: Is the product used daily (habitual use)?
      → YES: Checklist onboarding (§10.3) — persistent checklist in sidebar/dashboard
      → NO: Product tour (§10.4) — guided walkthrough of key features on first visit
```

### 10.2 Setup Wizard

**When to use:** New user or team onboarding that requires configuration — selecting a plan, connecting integrations, inviting team members, setting preferences.

**Pattern:**
- Multi-step wizard (ADR-0024 §4.5) with 3-5 steps
- Step indicator: numbered steps with labels (ADR-0025 §10.1)
- Each step: focused on one task — don't combine unrelated configuration
- "Skip" option on non-essential steps — never force optional setup
- Final step: summary of what was configured + "Get started" CTA
- Redirect: after completion, redirect to the product with a welcome state

**Accessibility:**
- Step indicator: per ADR-0025 §10.2
- Skip button: visible and labeled — "Skip this step"
- Progress: `aria-label="Setup progress: Step 2 of 4"`

**Reference:** Vercel setup asks for project name, framework, git repo, deploy. Notion asks for workspace name and use case. Linear asks for team name and invites.

### 10.3 Checklist Onboarding

**When to use:** Products with 4-8 key actions the user should complete to get value — "complete your profile", "create your first project", "invite a team member".

**Pattern:**
- Persistent checklist widget: sidebar card, dashboard card, or floating widget
- Progress: "3 of 6 completed" with progress bar
- Each item: checkbox + label + optional description or CTA button
- Completed items: checked with strikethrough or muted style
- Dismissible: "Dismiss" link after 80%+ completion or after 7 days — never permanent
- Celebration: animation or congratulatory message on 100% completion (confetti is optional — respect `prefers-reduced-motion`)

**Accessibility:**
- Checklist: `role="list"` with `aria-label="Getting started checklist"`
- Each item: `role="listitem"` — completed items have `aria-label="[task], completed"`
- Progress: `role="progressbar"` with `aria-valuenow`
- Dismiss: `aria-label="Dismiss getting started checklist"`

**Responsive:**
- Desktop: sidebar card or inline dashboard widget
- Mobile: collapsible banner at the top, or accessible from a menu item

**Reference:** Notion uses a "Getting Started" page template. Figma uses a checklist in the dashboard. Slack uses a progressive checklist in the sidebar.

### 10.4 Product Tour / Feature Discovery

**When to use:** Showing users features they might not discover on their own — new feature announcements, complex workflows, hidden capabilities.

**When NOT to use:** Tour as a substitute for poor UX — fix the UX instead. More than 5 steps — fatiguing. On every page load — only show once.

**Pattern:**
- Tooltip spotlight: highlight a UI element with a tooltip pointing to it, dimmed background on everything else
- Step progression: "1 of 4" with Next/Previous/Skip buttons in the tooltip
- Auto-position: tooltip positions intelligently (avoids viewport edges, respects scrollable containers)
- Trigger: automatically on first visit to a page (or after a feature is released), OR manually via "Take a tour" link in help menu
- State: store completion in `localStorage` — don't show again after completed or skipped

**Progressive disclosure tooltips (alternative to full tour):**
- For individual features: show a single tooltip ("New!") on first encounter
- Pulsing dot or badge on the UI element — click to see explanation
- One-time: shown once per feature, per user

**Accessibility:**
- Tour spotlight: focus is trapped within the tooltip step — keyboard accessible Next/Previous/Skip
- Highlighted element: `aria-describedby` linking to the tooltip content
- Skip: "Skip tour" button always visible and focusable
- Don't block critical UI during the tour — user can close the tour and interact at any time

**Responsive:**
- Desktop: tooltip points to specific UI elements
- Mobile: full-width card at top/bottom of screen (tooltips may obscure too much on small screens)

### 10.5 Empty-to-Populated Transitions

**When to use:** The first time a user encounters a blank area that they need to populate — project list, team page, dashboard.

ADR-0024 §3.5 covers the empty state pattern (illustration + message + CTA). This section covers the **transition** from empty to populated:

**Pattern:**
- Empty state shows guided CTA: "Create your first project"
- After first item is created: empty state disappears, item list appears with the new item highlighted
- Optional: brief animation on the transition (fade out empty state, fade in list)
- If more items are expected: show a contextual tip — "Tip: Use ⌘K to quickly create new items" (§15.1)

---

## 11. Multi-Select Patterns

### 11.1 Multi-Select Decision Tree

```
What is the user selecting from?
  → Fixed list of <8 options (all visible): Checkbox group
  → Fixed list of 8-20 options: Scrollable checkbox list in a dropdown
  → Large or dynamic list (20+): Searchable multi-select with pills (§11.2)
  → Two lists (available → selected): Transfer list (§11.3)
```

### 11.2 Tag / Token / Pill Multi-Select

**When to use:** Selecting multiple items from a potentially large list — tags, categories, team members, labels. Most common multi-select for application forms.

**Pattern:**
- Input area: shows selected items as removable pills/tags
- Typing in the input: filters available options in a dropdown below
- Selecting an option: adds it as a pill, clears the input, refocuses for next selection
- Removing a pill: click the × on the pill, or Backspace when input is empty removes the last pill
- Dropdown shows unselected options only — already-selected items are hidden or shown as disabled

**Accessibility:**
- Container: `role="combobox"` with `aria-expanded` pointing to the dropdown
- Pills/tags: each is a `role="option"` or `role="listitem"` with `aria-label="[name], press Backspace to remove"`
- Remove button on pill: `aria-label="Remove [name]"`
- Dropdown: `role="listbox"` with `role="option"` items
- Keyboard: Arrow keys navigate dropdown, Enter selects, Backspace removes last pill, Escape closes dropdown
- Announce: `aria-live="polite"` region — "[name] added. 3 items selected" / "[name] removed. 2 items selected"

**Responsive:**
- Pills wrap to multiple lines on narrow screens
- Input stays full-width — pills flow above it
- Dropdown: full-width on mobile, positioned below (or bottom sheet for long lists)

**Reference:** Linear uses pill multi-select for labels and assignees. GitHub uses pill multi-select for issue labels. Notion uses pill multi-select for relation and multi-select properties.

### 11.3 Transfer List

**When to use:** Moving items between two explicit groups — "Available permissions" → "Assigned permissions", left/right panel layout.

**When NOT to use:** Simple multi-select where the "available" list notion is unnecessary. Cases where order within the selected group matters (use sortable list §3.2 after selection).

**Pattern:**
- Two side-by-side lists with headers ("Available" / "Selected")
- Selection: click to select items in either list (multi-select with Shift+click for range, Ctrl/⌘+click for toggle)
- Transfer: arrow buttons between lists (→ to assign, ← to unassign), or drag items between lists
- Bulk: "Add All" / "Remove All" buttons
- Search/filter within each list for large sets

**Accessibility:**
- Each list: `role="listbox"` with `aria-label="Available permissions"` / `aria-label="Selected permissions"` and `aria-multiselectable="true"`
- Items: `role="option"` with `aria-selected`
- Transfer buttons: `aria-label="Move selected to assigned"` / `aria-label="Remove selected from assigned"`
- Announce: `aria-live="polite"` — "3 items moved to Selected"

**Responsive:**
- Desktop: side-by-side panels
- Mobile: stacked (Available above, Selected below) with transfer buttons between

---

## 12. Context Menus

### 12.1 Context Menu Decision Tree

```
What triggers the menu?
  → Right-click (desktop):
    → Context menu — positioned at cursor
  → Long-press (mobile):
    → Context menu — positioned at press location, or bottom sheet (ADR-0024 §5.4)
  → Explicit button click (⋮ kebab / ⋯ meatball):
    → Dropdown action menu — positioned below button
  → Row/card hover with action reveal:
    → Inline actions (1-2 actions visible) or kebab menu for overflow
```

### 12.2 Right-Click Context Menu

**When to use:** Applications where power users expect context menus — file managers, design tools, code editors, project management tools.

**When NOT to use:** Marketing sites. Simple applications where context menus add hidden complexity. Never as the ONLY way to access actions — always pair with a visible button alternative (ADR-0024 §5.5).

**Pattern:**
- Intercept `contextmenu` event on the target element(s)
- Show menu at cursor position
- Items: icon + label + optional keyboard shortcut hint (right-aligned)
- Dividers between groups of related actions
- Disabled items: grayed out with reason on hover/tooltip ("Cannot delete — item is locked")
- Submenu: arrow icon (▸) on items with nested options — opens a flyout on hover/focus

**Accessibility:**
- Menu: `role="menu"` with `aria-label="Actions for [item name]"`
- Items: `role="menuitem"`, disabled items have `aria-disabled="true"`
- Keyboard: opened via Shift+F10 or context menu key, Arrow keys navigate, Enter selects, Escape closes
- Submenu: Arrow Right opens submenu, Arrow Left closes submenu
- Focus: first item focused on open, focus returns to trigger element on close

**Responsive:**
- Desktop: positioned at cursor
- Mobile: long-press trigger → show as bottom sheet (not a small floating menu — hard to tap on mobile)
- Ensure all context menu actions are also accessible via the kebab menu button (§12.3)

### 12.3 Kebab / Meatball Action Menu

**When to use:** Every entity that has actions beyond its primary click behavior — list items, cards, table rows.

**Pattern:**
- Button: ⋮ (vertical kebab for rows/lists) or ⋯ (horizontal meatball for cards/headers)
- Click opens a Radix DropdownMenu (via shadcn/ui)
- Items: same structure as context menu — icon + label + shortcut hint
- Destructive actions: last in the list, red/danger text color, separated by divider

**Accessibility:**
- Button: `aria-label="Actions for [item name]"`, `aria-haspopup="true"`, `aria-expanded`
- Menu: `role="menu"` (automatic via Radix DropdownMenu)
- Items: `role="menuitem"` with keyboard navigation (automatic via Radix)

**Reference:** Linear uses kebab menus on issues with full action set. GitHub uses kebab menus on repository items. Notion uses ⋯ menus on blocks and pages.

### 12.4 Bulk Action Bar

ADR-0025 §8.4 covers the table row selection + bulk action bar. Additional application-level patterns:

**Floating bulk action bar (non-table context):**
- When items are selected in a grid, list, or kanban board (not just tables)
- Bar appears at the bottom of the viewport (floating, centered)
- Shows: selection count + action buttons + "Deselect all" link
- Dismiss: deselect all, or Escape key

**Accessibility:**
- Bar: `role="toolbar"` with `aria-label="Bulk actions"` (same as table bulk bar, ADR-0025 §8.4)
- Announce appearance: `aria-live="polite"` — "Bulk actions available. 5 items selected."

---

## 13. Notification Systems

### 13.1 Notification Architecture Decision Tree

```
What type of notification?
  → Action feedback (save, delete, error):
    → Toast (ADR-0024 §3.2) — ephemeral, non-persistent
  → Asynchronous event (new message, assignment, system alert):
    → In-app notification — persistent, stored in notification center
  → Critical system alert (maintenance, security breach):
    → Banner notification — persistent bar at top of page until dismissed or resolved
```

### 13.2 Notification Center

**When to use:** Applications with async events the user needs to know about — new comments, task assignments, team invites, system announcements.

**Pattern:**
- Trigger: bell icon in the header with unread count badge (ADR-0024 §3.9)
- Panel: dropdown or slide-over panel listing notifications newest-first
- Each notification: icon (type indicator), title, description, timestamp, read/unread state
- Click notification: navigate to the relevant entity and mark as read
- Actions: "Mark all as read", individual "Mark as read" / "Delete" / "Mute"
- Grouping (optional): group similar notifications — "5 new comments on [project]" instead of 5 separate items
- Empty state: "No new notifications" with illustration (ADR-0024 §3.5)

**Notification preferences:**
- Settings page section: per-channel (email, push, in-app) × per-type (comments, assignments, system)
- Matrix UI with toggle switches per cell (§8.2 permission matrix pattern)
- "Mute" per entity: right-click or menu option on specific items to suppress notifications

**Accessibility:**
- Bell button: `aria-label="Notifications, N unread"` (ADR-0024 §3.9)
- Notification panel: `role="dialog"` with `aria-label="Notifications"`
- Notification list: `role="list"` with each item as `role="listitem"`
- Read/unread: unread items have `aria-label="Unread: [notification title]"`
- Live updates: `aria-live="polite"` on the badge count — announce when new notifications arrive while the panel is closed

**Responsive:**
- Desktop: dropdown panel (360-400px wide) from the bell icon
- Mobile: full-screen notification page or bottom sheet
- Push: native push notifications for critical items (with user opt-in)

**Reference:** GitHub has a notification center with grouped notifications. Linear uses a notification center with @mentions and assignments. Notion uses an inbox for notifications with page context.

### 13.3 Banner Notifications

**When to use:** System-wide announcements that all users should see — scheduled maintenance, new feature announcements, critical alerts.

**Pattern:**
- Fixed bar at the top of the page (above the navigation)
- Color indicates severity: info (neutral), warning (amber), critical (red)
- Content: message + optional action link ("Learn more", "Dismiss")
- Dismissible: user can close with × button — persist dismissal in `localStorage`
- Expiry: set an end date — auto-remove after the event passes

**Accessibility:**
- Role: `role="alert"` for critical, `role="status"` for informational
- Dismiss button: `aria-label="Dismiss notification"`
- Don't auto-dismiss critical banners — they stay until explicitly closed or resolved

---

## 14. Error Recovery

### 14.1 Error Recovery Decision Tree

```
What kind of error?
  → Network error (request failed, timeout):
    → Retry with exponential backoff (automatic for background), retry button (for user actions)
  → Validation error (server rejected input):
    → Show field-level errors (ADR-0012, ADR-0024 §4.2) — user corrects and resubmits
  → Auth error (session expired, unauthorized):
    → Session expiry flow (§14.3)
  → Server error (500, service unavailable):
    → Error boundary (ADR-0007) with "Try again" button
  → Conflict error (concurrent edit):
    → Conflict resolution UI (§4.5)
```

### 14.2 Retry Patterns

**When to use:** Transient failures — network timeouts, temporary server overload, rate limiting.

**Pattern (automatic retry):**
- TanStack Query: `retry: 3` with `retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000)` (ADR-0005)
- During retry: show skeleton or loading state — don't show error until retries exhausted
- After all retries fail: show error state with manual "Retry" button

**Pattern (manual retry):**
- Error message: explains what failed in user-friendly terms (not "500 Internal Server Error")
- "Try again" button: re-executes the failed action
- If repeated failures: suggest alternatives — "If this keeps happening, try refreshing the page or contact support"

**Anti-patterns:**
- ❌ Silent failure — user doesn't know something went wrong
- ❌ Infinite automatic retry — wastes resources, may be interpreted as attack
- ❌ Technical error messages — "ECONNREFUSED" means nothing to users

### 14.3 Session Expiry Handling

**When to use:** Applications with time-limited sessions (ADR-0010) where the user's session can expire during active use.

**Pattern:**
- Detect: server responses with 401 status code on any API call
- Pre-expiry warning (optional): "Your session expires in 5 minutes" toast with "Extend session" action (call refresh endpoint)
- Post-expiry: modal overlay — "Your session has expired. Please sign in again."
  - "Sign in" button: redirects to login page, preserving the current URL as a return target (`?returnTo=/current/page`)
  - Don't silently redirect — the modal explains why and lets the user act
- Preserve draft data: if the user had unsaved work, store in `sessionStorage` before redirect — restore after re-authentication

**Accessibility:**
- Expiry modal: `role="alertdialog"` — urgent, focus trapped
- Pre-expiry warning: toast with "Extend" action

### 14.4 Auto-Save & Recovery

**When to use:** Long forms, content editors, complex configuration pages — anywhere losing work would frustrate the user.

**Pattern:**
- Auto-save interval: every 30-60 seconds when changes are detected (not continuously)
- Save indicator: small status text — "Saved" / "Saving..." / "Unsaved changes"
- Position: near the form title or in the top bar — always visible
- Recovery after crash/close:
  1. On page load, check for auto-saved draft in `localStorage` or server-side
  2. If found: show banner — "You have unsaved changes from [time]. Restore or discard?"
  3. Restore: populate form with draft data
  4. Discard: clear draft, show fresh data

**Accessibility:**
- Save status: `role="status"` with `aria-live="polite"` — announces "Saved" / "Saving"
- Recovery banner: `role="alert"` with Restore/Discard buttons

**State management:** `localStorage` for client-only drafts (Zustand persist per ADR-0020). Server-side draft storage for collaborative tools.

**Reference:** Notion auto-saves all changes. Google Docs shows "Saving..." status. Linear auto-saves issue descriptions.

### 14.5 Offline State

**When to use:** Progressive web applications or mobile-focused apps where network connectivity is unreliable.

**When NOT to use:** Admin panels or dashboards that are meaningless without fresh data.

**Pattern:**
- Detect: `navigator.onLine` + `online`/`offline` events
- Offline banner: "You're offline. Changes will be saved when you reconnect." — persistent, non-dismissible
- Queue actions: mutations performed offline are queued locally
- Sync on reconnect: play back the queue, resolve conflicts (§4.5 strategies)
- Stale data indicator: show "Last synced: 5 minutes ago" when data may be stale

**Accessibility:**
- Offline banner: `role="alert"` — announced immediately
- Queued action count: "3 changes pending sync" — informational, not alarming

---

## 15. Keyboard Shortcuts

### 15.1 Keyboard Shortcut Scoping

#### Decision Tree — Shortcut Scope

```
Where does the shortcut apply?
  → Everywhere in the app (global):
    → Register on document level
    → Examples: ⌘K (command palette), ⌘/ (shortcuts help), Escape (close overlay)
  → Within a specific view/page:
    → Register on the page component level, clean up on unmount
    → Examples: N (new item in list view), E (edit selected item), D (delete)
  → Within a specific component (editor, table):
    → Register on the component level, active only when focused
    → Examples: ⌘B (bold in editor), ⌘Enter (submit form)
```

### 15.2 Platform-Specific Keys

| Action Modifier | Mac | Windows/Linux |
|----------------|-----|---------------|
| Primary modifier | ⌘ (Command) | Ctrl |
| Secondary modifier | ⌥ (Option) | Alt |
| Meta key | ⌘ | Win key |

**Implementation:**
- Use `event.metaKey` on Mac, `event.ctrlKey` on Windows/Linux
- Detect platform: `navigator.platform` or `navigator.userAgent` — display the correct key symbol
- Display shortcuts with `<kbd>` elements: `<kbd>⌘</kbd><kbd>K</kbd>` on Mac, `<kbd>Ctrl</kbd><kbd>K</kbd>` on Windows

### 15.3 Shortcut Discovery

**When to use:** Applications with 5+ keyboard shortcuts — users need a way to discover and learn them.

**Pattern:**
- Help modal: triggered by `?` (Shift+/) or ⌘/ (consistent with many apps)
- Layout: shortcuts grouped by category (Navigation, Actions, Editor)
- Each entry: description + shortcut key combination
- Inline hints: show shortcut next to the action in menus and tooltips (e.g., "Delete ⌫" in a dropdown menu item)
- First-time hint: on first use of a discoverable action (e.g., user clicks "New Project" button), show a toast or tooltip: "Tip: You can also press N to create a new item"

**Accessibility:**
- Help modal: `role="dialog"` with `aria-label="Keyboard shortcuts"`
- Shortcut keys: use `<kbd>` elements for proper semantics
- Shortcut list: `<dl>` (description list) or `<table>` for structured display

**Reference:** Linear shows shortcuts with `?`. GitHub shows shortcuts with `?`. Notion shows shortcuts in the help menu.

### 15.4 Shortcut Conflict Prevention

| Priority | Layer | Example | Rule |
|----------|-------|---------|------|
| 1 (highest) | Browser/OS | ⌘C, ⌘V, ⌘T, ⌘W | **NEVER** override — these are sacrosanct |
| 2 | Application global | ⌘K, ⌘/, Escape | Override only if the app provides the canonical behavior (e.g., search) |
| 3 | View-level | N, E, D (single letter) | Active only when no input is focused — check `document.activeElement` |
| 4 (lowest) | Component-level | ⌘B, ⌘Enter | Active only within the focused component |

**Single-letter shortcuts (N, E, D):**
- Only active when body or a non-input element has focus
- Disable when: any `<input>`, `<textarea>`, `<select>`, or `contenteditable` is focused
- Check: `const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.contentEditable === 'true'`

**Anti-patterns:**
- ❌ Overriding ⌘C/⌘V/⌘T/⌘W — breaks user expectation at the OS level
- ❌ Single-letter shortcuts that fire while typing in an input field
- ❌ Shortcuts with no discoverability — users don't know they exist
- ❌ Different shortcut for the same action on different pages — consistency is critical
- ❌ More than 20 shortcuts — cognitive overload; prioritize the top 10

---

## 16. Anti-Patterns

### CRUD

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Show a full-page form for editing a single field | Inline edit for simple changes, modal for medium, page for complex (§1.1) | Edit surface must match edit complexity |
| "Are you sure?" on every delete | Undo toast for routine deletes, confirmation for permanent/high-impact (§1.6) | Confirmation fatigue → users click "Yes" without reading |
| Silent deletion with no undo or confirmation | Always confirm OR provide undo — never silently destroy data | Users make mistakes; data loss erodes trust |
| Optimistic create with no error recovery | If optimistic creation fails, remove the item and show error with retry | Ghost items in the list are confusing |

### Search

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Fire a search request on every keystroke | Debounce 200-300ms before firing | Wastes server resources, causes UI flicker |
| Show blank page for no results | Always show a no-results state with suggestions and "clear filters" CTA | Blank page looks broken |
| Lose search query on navigation and back | Persist search query in URL (`?q=term`) | Users expect back button to restore their search |
| Search that only matches exact strings | Use fuzzy matching or at minimum prefix matching | Typos and partial queries are common |

### Drag and Drop

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Drag-and-drop as the only way to reorder | Always provide keyboard alternative (arrow buttons, keyboard sensor, move-to-position) | Keyboard and screen reader users can't drag |
| Full-item drag (no handle) on items with clickable content | Use a drag handle (⠿) to separate drag from click | Clicks become accidental drags |
| No visual feedback during drag | Show drop zone indicator, lifted item shadow, and gap placeholder | User doesn't know where the item will land |
| Drag without persisting to server | Save new order after drop — optimistic update + server mutation | Order reverts on next page load |

### Real-Time

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Open multiple SSE/WebSocket connections to the same server | Multiplex events over a single connection | Browsers limit concurrent connections per domain |
| Poll every 1-2 seconds for non-critical data | Poll at 15-60s intervals, or use SSE/WebSocket for truly real-time needs | Excessive polling wastes bandwidth and server capacity |
| Auto-scroll content when user is reading history | Show "New messages" button to jump to latest | Interrupts reading; user loses their place |
| Silently overwrite user's in-progress edit with server data | Notify of external changes, let user choose to accept or keep their version | Losing work is the worst UX failure |

### Dashboards

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| All widgets loading simultaneously with spinners | Skeleton loading per widget, streaming/suspense for progressive render | Spinner-filled page looks broken; skeleton shows structure early |
| Charts with no text alternative | Provide "View as table" option for every chart | Charts are inaccessible to screen readers |
| Date range with no presets (custom-only) | Offer preset quick-picks (Last 7 days, This month) alongside custom range | Most users want standard ranges; custom is the exception |

### Notifications

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Notification count that never clears | Mark as read on click, provide "Mark all as read" | Permanent unread count causes notification fatigue — users stop checking |
| Desktop push notification without opt-in | Always request permission explicitly and explain value | Browser interruptions without consent erode trust |
| Notification for every minor event | Group similar notifications, respect user's notification preferences | Notification flooding causes users to disable all notifications |

### Settings

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Danger zone actions mixed with regular settings | Separate danger zone visually at the bottom with warning border | Users might accidentally trigger destructive actions |
| Instant account deletion with no cooling period | 14-day cooldown with cancellation option | Hacked accounts, regretful deletes, and accidental clicks |
| Settings form with no dirty state tracking | Show unsaved changes indicator + save/discard bar | Users don't know if their changes were applied |

### Onboarding

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| Forced product tour that can't be skipped | Always provide "Skip tour" or × close button | Different users have different experience levels |
| Tour that re-shows on every visit | Show once, track completion in localStorage | Repeated tours are annoying — users came back to work, not to tour |
| 10+ step product tour | Maximum 5 steps; link to documentation for more | Tour fatigue — users stop reading after step 4-5 |

---

## Library Compatibility

| Library | Status | Purpose | Notes |
|---------|--------|---------|-------|
| dnd-kit | `recommended` | Sortable lists, kanban boards, grid rearrangement, cross-list dragging | Headless, ~15kB, keyboard + pointer + touch sensors, accessible by default. No CSS — compatible with ADR-0002 |
| cmdk | `recommended` | Command palette / ⌘K (search + actions) | Already recommended in ADR-0024 §1.8. ~3kB, accessible combobox |
| Sonner | `recommended` | Toast notifications for action feedback, undo, retry | Already recommended in ADR-0024 §3.2. Accessible `aria-live` |
| Radix DropdownMenu (via shadcn/ui) | `recommended` | Kebab/meatball action menus, context menu alternatives | Pre-approved in ADR-0002/ADR-0023. Handles WAI-ARIA Menu pattern |
| Radix Dialog (via shadcn/ui) | `recommended` | Confirmation dialogs, modal editing, notification center panel | Pre-approved. Focus trap, Escape handling automatic |
| TanStack Query v5 | `recommended` | Polling, optimistic mutations, real-time data sync, retry | Already approved in ADR-0005. Core data layer for all application patterns |
| nuqs | `compatible` | Type-safe URL search params state management | ~3kB, works with Next.js App Router. Safer alternative to raw `useSearchParams` for filters, search, pagination. Actively maintained |
| Zustand | `recommended` | Complex client UI state — notification state, dashboard preferences, draft storage, shortcut registry | Already approved in ADR-0020. Provider-free, selector-based |
| react-hotkeys-hook | `compatible` | Declarative keyboard shortcut registration with scope management | ~3kB. Use when the application has 10+ shortcuts with scoping needs. For simpler cases, native `useEffect` + `addEventListener` is sufficient |
| Yjs | `compatible` | CRDT-based collaborative editing | Use when real-time collaborative text editing is required. Pairs with TipTap, ProseMirror. Heavy dependency (~30kB) — add only when needed |
| Liveblocks | `compatible` | Managed real-time collaboration (presence, cursors, storage) | SaaS product — adds external dependency and cost. Use when build-vs-buy favors buy for collaboration features |
| react-beautiful-dnd | `forbidden` | Drag and drop | Unmaintained (archived by Atlassian). Use dnd-kit instead |
| react-dnd | `forbidden` | Drag and drop | Complex API, large bundle, not actively maintained. Use dnd-kit instead |
| Any CSS-in-JS notification library | `forbidden` | — | Violates ADR-0002 (no CSS-in-JS runtime). Use Sonner + own styling |

---

## Consequences

**Positive:**
- Agents and developers have decision trees for every application-level UX flow — CRUD, search, drag-and-drop, real-time, dashboards, onboarding, notifications, error recovery, and keyboard shortcuts
- CRUD editing surface is determined by complexity (inline → modal → page), not ad-hoc preference
- Delete patterns prevent data loss with the undo-vs-confirmation decision tree
- Real-time strategy is selected based on freshness requirements, not fashion (polling → SSE → WebSocket)
- Drag-and-drop always has keyboard alternatives — accessibility is architectured in, not patched on
- Library recommendations prevent analysis paralysis: dnd-kit for drag, TanStack Query for real-time data, Sonner for toasts
- Every pattern cross-references the atomic patterns from ADR-0024/ADR-0025 instead of duplicating them

**Negative:**
- dnd-kit requires learning its sensor/collision/sortable model — steeper learning curve than simpler libraries
- nuqs is a new dependency recommendation that may not be necessary for simple filter state (raw `useSearchParams` may suffice)
- Collaborative editing (Yjs, Liveblocks) is expensive in complexity and bundle size — the ADR recommends but doesn't prescribe, which may lead to inconsistent adoption
- Some patterns (permission matrix, notification center, product tours) are significant implementation efforts even with guidance
- Session expiry and offline handling require careful integration testing that this ADR can only guide, not automate

## Related ADRs

- [ADR-0005](./0005-data-fetching.md) — Data Fetching (TanStack Query for polling, optimistic mutations, retry logic)
- [ADR-0007](./0007-error-handling.md) — Error Handling (AppError, error boundaries, Result\<T\> for Server Actions)
- [ADR-0010](./0010-authentication.md) — Authentication (RBAC, session management, permission gating)
- [ADR-0011](./0011-database.md) — Database (Prisma for CRUD operations, soft delete with `deletedAt`)
- [ADR-0012](./0012-forms.md) — Forms (React Hook Form for edit forms, Zod validation, Server Actions)
- [ADR-0016](./0016-file-upload-storage.md) — File Upload & Storage (UploadThing, presigned URLs, validation rules)
- [ADR-0019](./0019-accessibility.md) — Accessibility (WCAG compliance, ARIA patterns, color-independent indicators)
- [ADR-0020](./0020-state-management.md) — State Management (Zustand for UI state, URL state for filters/search)
- [ADR-0023](./0023-ui-foundation-primitives.md) — UI Foundation Primitives (Dialog, DropdownMenu as optional-tier components)
- [ADR-0024](./0024-ux-interaction-patterns.md) — UX Interaction Patterns (toasts, confirmation dialogs, empty states, skeletons, optimistic UI, badges, infinite scroll, form UX, keyboard/focus)
- [ADR-0025](./0025-ux-content-display-patterns.md) — UX Content Display Patterns (data tables with sort/filter/select, pagination, tabs, accordions, tree views)
