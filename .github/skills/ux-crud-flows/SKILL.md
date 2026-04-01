---
name: ux-crud-flows
description: >-
  CRUD edit surface decision tree — inline edit (1-3 fields, click-to-edit in
  tables), modal/slide-over (4-10 fields), dedicated edit page (10+ fields),
  create flow decision tree, delete patterns (undo toast vs confirmation vs
  type-to-confirm), optimistic update conflict handling with TanStack Query.
  Use when implementing CRUD views, choosing between inline edit and modal,
  building delete confirmations with undo, or handling optimistic update failures.
---

# CRUD Flows

**Compiled from**: ADR-0026 §1 (CRUD Flows)
**Last synced**: 2026-03-22

---

## Edit Pattern Decision Tree

The edit surface must match the complexity and frequency of the edit.

```
How complex is the edit?
  → Simple (1-3 fields, single entity):
    → Frequent (>5 times per session)?
      → YES: Inline editing — click cell/field to edit in place
      → NO:  Modal editing — dialog with form fields
  → Medium (4-10 fields, single entity):
    → Primary task on this page?
      → YES: Dedicated edit page (/items/:id/edit)
      → NO:  Modal editing — slide-over panel or centered dialog
  → Complex (10+ fields, multiple sections, or related entities):
    → Dedicated edit page — multi-section form, possibly with tabs or accordion
      → If 15+ fields: consider multi-step wizard
```

---

## Inline Editing

**Use when:** Quick value changes in tables/lists — status updates, titles, short text, toggles. User stays in context without navigation.

**Do NOT use when:** Multiple dependent fields need validation. Edit needs confirmation before saving. Multi-field edits.

**Pattern:**
- Display mode: cell shows the current value as text
- Edit trigger: click the cell, click a pencil icon, or press Enter when cell is focused
- Edit mode: input replaces text, pre-filled with current value and auto-selected
- Save: Enter or blur — optimistic update
- Cancel: Escape reverts to original value
- Error: revert to original value + inline error message or toast

**Accessibility:**
- Display mode: `aria-label="Edit [column]: [current value]"` on the cell or trigger button
- Edit mode: input auto-focused, `aria-label="[column]"`, `aria-describedby` linking to error if present
- Result: announce via toast ("Saved") or inline status icon — not visual-only feedback

**Responsive:**
- Desktop: hover reveals edit affordance
- Mobile: tap to edit — ensure input meets 44×44 CSS px touch target
- Narrow screens: consider a bottom sheet edit form if the cell is too small for inline input

---

## Modal / Slide-Over Panel Editing

**Use when:** Medium-complexity edits (4-10 fields) while keeping context of the underlying page.

**Do NOT use when:** Full-page layout needed. The form references content the modal would obscure.

### Modal vs Slide-Over Decision Tree

```
Will the user need to reference the underlying page while editing?
  → YES: Slide-over panel — partial page remains visible
  → NO: Is the form tall / scrollable?
    → YES: Slide-over panel — side panels scroll better
    → NO: Centered modal dialog — focused attention
```

**Slide-over panel:**
- Opens from the right edge, 400–600 px wide
- Underlying content dimmed but partially visible
- Form fields inside; save/cancel buttons sticky at bottom
- Close: X button, Escape, or click overlay
- URL: optionally update to `?edit=:id` for shareability

**Centered modal:**
- Radix Dialog (via shadcn/ui) — focus trap and Escape handling automatic
- Max height 80 vh with internal scroll
- Save button: specific verb ("Update project", not "Save")

**Accessibility (both patterns):**
- `role="dialog"`, `aria-labelledby`, focus trap, Escape to close
- Unsaved changes on close attempt: "Discard changes?" confirmation dialog

**Responsive:**
- Desktop: slide-over (right) or centered modal
- Mobile: full-screen sheet — side panels don't fit on narrow screens
- Save/cancel buttons: sticky at bottom on mobile for thumb reach

---

## Dedicated Edit Page

**Use when:** 10+ fields, multiple sections, or related entity management (e.g., product with variants, images, pricing).

**Do NOT use when:** Simple edits that should stay in context. Frequent edits where navigation overhead is not justified.

**Pattern:**
- Route: `/items/:id/edit` — separate URL
- Form layout: sections with headings; tabs or accordion for grouped sections
- Top bar: breadcrumb navigation back to list/detail page
- Save/cancel: sticky at top or bottom of page — always visible during scroll
- Auto-save (optional): save drafts every 30–60 s for long forms to prevent data loss

**Responsive:** Single-column on mobile, multi-column on desktop.

---

## Create Flow Decision Tree

```
How many fields does the create form have?
  → 1-3: Inline create — input row at top/bottom of list, or popover
  → 4-8: Modal create — dialog with form fields
  → 9+:  Dedicated create page — /items/new
```

**Inline create pattern:**
- Empty input row (or "Add item" button) at top/bottom of list
- User types value, presses Enter → item created with defaults
- Optimistic: item appears immediately; focus stays on input for sequential creation

**Post-create behavior:**
- Redirect to detail/edit page for complex entities
- Stay on list with new item highlighted for simple entities
- Toast: "Item created" with optional "View" action link

---

## Delete Patterns

### Delete Strategy Decision Tree

```
Is the data recoverable (soft delete available)?
  → YES:
    → Deletion frequent (e.g., clearing completed tasks)?
      → YES: Immediate delete + undo toast (5-8 second window)
      → NO:  Confirmation dialog
  → NO (hard delete, permanent):
    → High-value entity (project, account, cascading effects)?
      → YES: Type-to-confirm dialog — user must type entity name to enable Delete
      → NO:  Standard confirmation dialog
```

**Undo pattern (preferred for routine deletions):**
1. User clicks delete → item removed from UI immediately (optimistic)
2. Toast: "Item deleted" with "Undo" action button (5–8 s window)
3. If no undo → execute server deletion
4. If undo clicked → restore item in UI, cancel server deletion
- State: TanStack Query `useMutation` with `onMutate` (optimistic), `onError` (revert), `onSettled` (refetch)

**Type-to-confirm pattern (high-impact deletions):**
- Dialog title: "Delete [entity name]?"
- Body: "This will permanently delete 'My Project' and all 42 associated items. This cannot be undone."
- Input: `aria-label="Type '[entity name]' to confirm deletion"` — Delete button disabled until input matches
- Cancel button: focused by default (safe default)

**Soft delete:**
- Deleted items move to a "Trash" area; auto-purge after 30 days
- Provide "Restore" action in trash view
- Trash badge shows item count

**Accessibility:**
- Confirmation dialog: `role="alertdialog"` (not just `dialog`) for urgency
- Undo toast: "Undo" button must be focusable and announced

**Responsive:**
- Mobile: bottom sheet dialog for delete confirmation
- Undo toast: full-width on mobile, positioned top-center

---

## Optimistic Updates & Conflict Handling

### Conflict Resolution Decision Tree

```
Did the mutation fail?
  → YES (network error):
    → Revert UI — show error toast with "Retry" — keep user's input in memory
  → YES (validation error from server):
    → Revert UI — show inline field errors
  → NO (success, but version conflict detected):
    → Collaborative app (multiple users editing)?
      → YES: Show conflict UI — "Your value: X. Current value: Y (changed by [user])."
              Actions: "Keep mine" / "Accept theirs" / "Merge manually"
      → NO:  Last-write-wins — server accepts the latest mutation
```

**TanStack Query mutation pattern:**

```ts
useMutation({
  mutationFn: updateItem,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['items', id] })
    const previous = queryClient.getQueryData(['items', id])
    queryClient.setQueryData(['items', id], newData) // optimistic
    return { previous }
  },
  onError: (_err, _newData, context) => {
    queryClient.setQueryData(['items', id], context.previous) // revert
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['items', id] }),
})
```

---

## Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Full-page form for editing one field | Inline edit for simple, modal for medium, page for complex |
| "Are you sure?" on every delete | Undo toast for routine; confirmation for permanent/high-impact |
| Silent deletion with no undo or confirmation | Always confirm OR provide undo — never destroy data silently |
| Optimistic create with no error recovery | Remove the ghost item and show error with retry if creation fails |
| Slide-over panel on mobile | Full-screen sheet on mobile |
