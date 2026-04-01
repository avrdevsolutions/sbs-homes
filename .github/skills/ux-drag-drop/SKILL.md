---
name: ux-drag-drop
description: >-
  Drag-and-drop strategy decision tree — sortable lists (grab handle, gap
  indicator, spring settle animation), kanban boards (cross-column drag, column
  overflow decision tree), 2D grid rearrangement, cross-list dragging, mandatory
  keyboard alternatives for all DnD (Space/Arrow/Escape convention, screen-reader
  announcements). Performance: GPU transform vs top/left, virtualisation for 100+
  items.  Library: dnd-kit (recommended). Use when implementing sortable lists,
  reorderable kanban boards, dashboard widget rearrangement, or
  drag-between-folders UX.
---

# Drag and Drop

**Compiled from**: ADR-0026 §3 (Drag and Drop)
**Last synced**: 2026-03-22

---

## Strategy Decision Tree

```
What is being dragged?
  → List items (reorder within one list):
    → Sortable list — vertical drag with gap indicators
  → Cards between status columns:
    → Kanban board — cross-column dragging with column drop zones
  → Files from the desktop:
    → File drop zone — upload area with drag-over state (see ux-data-file-management)
  → Grid items (rearrange layout):
    → Sortable grid — 2D drag with placeholder position indicator
  → Tree nodes (reorganize hierarchy):
    → Sortable tree — nested drag with indentation-based drop targets
```

**Library:** `dnd-kit` — headless, ~15 kB, keyboard + pointer + touch sensors, accessible by default.
Never use `react-beautiful-dnd` (archived by Atlassian) or `react-dnd` (unmaintained).

---

## Sortable List

**Use when:** Manual order matters — task priority, nav menu items, playlist tracks, form field ordering.

**Do NOT use when:** Inherent sort order exists (alphabetical, date, score). Very large lists (>100 items) — use move-to-position instead.

**Pattern:**
- Drag handle (⠿ grip icon) on the left — not the full row, to avoid conflicts with clicks on content
- On drag start: item lifts with shadow/scale (spring preset)
- During drag: gap placeholder shows insertion point between items
- On drop: item animates into final position; list reflows smoothly
- Persist: optimistic update + server mutation with new order array

**Keyboard alternative (required — never omit):**
- Focus handle → Space/Enter picks up → Arrow Up/Down moves → Space/Enter drops → Escape cancels
- Or: ▲/▼ buttons visible on focus for simpler reordering

**Screen reader announcements (required):**
- Pick up: "Item 'Task A' picked up. Position 1 of 5."
- Move: "Moved to position 3 of 5."
- Drop: "Item 'Task A' dropped at position 3."

**ARIA:**

```html
<button
  role="button"
  aria-label="Reorder Task A"
  aria-describedby="drag-instructions"
/>
<div id="drag-instructions" class="sr-only">
  Press Space to pick up. Use Arrow keys to move. Press Space to drop. Press Escape to cancel.
</div>
<div aria-live="assertive" class="sr-only">{dragAnnouncement}</div>
```

**Responsive:**
- Desktop: handle visible on hover, always visible on focus
- Mobile: handle always visible; activation delay (200 ms hold or 5 px move threshold) to distinguish from scroll
- Cancel drag if user scrolls vertically (vertical scroll wins over drag intent)

---

## Kanban Board

**Use when:** Status-based workflows — project management (To Do → In Progress → Done), CRM pipelines, content workflows.

**Do NOT use when:** Data without a stage dimension. More than 6 columns (too wide). Most items cluster in one column (use filtered list instead).

**Pattern:**
- Columns = stages; each column header shows item count
- Drag card to another column = status change + server mutation
- Drag within column = reorder within that status
- Visual: column highlights on drag-over; card placeholder shows insertion point

### Column Overflow Decision Tree

```
Will columns have many items (>10)?
  → YES: Each column scrolls independently
    → Show count in header: "In Progress (23)"
    → Consider collapsible columns for focus
  → NO: All items visible, no scroll needed
```

**Keyboard alternative (required):**
- Same as sortable list: Space to pick up, Arrow keys to move within column
- Arrow Left/Right to switch between columns
- **Critical fallback:** dropdown or button on each card to change status without dragging

**ARIA:**

```html
<section role="region" aria-label="Project board">
  <div role="group" aria-label="To Do, 5 items">
    <!-- cards -->
  </div>
  <div role="group" aria-label="In Progress, 3 items">
    <!-- cards -->
  </div>
</section>
```

**Responsive:**
- Desktop (≥1024 px): all columns side-by-side
- Tablet (768–1023 px): horizontal scroll, 2–3 columns visible
- Mobile (<768 px): single-column view — tabs or dropdown to switch between status columns (never horizontal kanban scroll)

---

## Grid Rearrangement

**Use when:** Dashboard widget rearrangement, image gallery ordering, form builder field arrangement — 2D grid where position matters.

**Do NOT use when:** Content order is derived from data (sort by date, name).

**Pattern:**
- Items on a CSS Grid; other items reflow to make space during drag
- Placeholder (outline or translucent copy) shows the landing position
- On drop: items animate to final positions via Framer Motion `layoutId` or CSS transitions (200–300 ms spring)

**Keyboard alternative:**
- Arrow keys in 4 directions (up/down/left/right)
- Or: "Move to position" dropdown/input for precise placement

**Responsive:** On mobile, consider switching to a simple sortable list instead of a 2D grid.

---

## Cross-List Dragging

**Use when:** Transferring items between containers — files between folders, assigning team members, rearranging sidebar sections.

**Pattern:**
- Valid drop targets highlight on drag-over; invalid targets show `cursor: no-drop`
- On drop: item removed from source, added to target at insertion point

**ARIA announcements:**
- On pickup: "Picked up 'Item A' from 'Available'"
- During move over a new container: "Over 'Selected' list"
- On drop: "Dropped 'Item A' in 'Selected' at position 2"
- Keyboard: Tab between containers, Arrow keys within, Space to pick up/drop

---

## Performance Rules

| Concern | Solution |
|---------|----------|
| Jank during drag | `transform: translate()` — never `top`/`left` (GPU-composited layer) |
| Large lists (100+ items) | Virtualise with TanStack Virtual — render only visible items |
| Frequent re-renders during drag | Use refs for drag position, `requestAnimationFrame` for visual updates — never `setState` on every pointer move |
| Drop animation | Framer Motion `layoutId` or CSS transition — 200–300 ms spring ease |

---

## Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Drag-and-drop as the only way to reorder | Always provide a keyboard alternative |
| Full-row drag on rows with clickable content | Use a visible grab handle (⠿) to separate drag from click |
| No visual feedback during drag | Show drop zone indicator, lifted shadow, and gap placeholder |
| New order not persisted to server | Optimistic update + server mutation on every drop |
| No activation delay on mobile | 200 ms hold or 5 px threshold to distinguish from scroll |
| Drag without clear drop zone indication | Highlight valid targets; show `no-drop` cursor on invalid ones |
