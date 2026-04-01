---
name: ux-focus-keyboard
description: >-
  Keyboard and focus management patterns — focus trapping (modals/drawers/overlays), roving tabindex
  for composite widgets (toolbars, tab lists, radio groups), skip links, focus-visible ring styling,
  Escape key layered close conventions (overlay stack priority), focus restoration on overlay close.
  Includes anti-patterns. Use when implementing modals, drawers, dropdown menus, tab components,
  keyboard shortcuts, focus ring styling, or overlay close/open focus flows.
---

# UX — Keyboard & Focus Management Patterns

**Compiled from**: ADR-0024 §6 (Keyboard & Focus Management), §7 Keyboard & Focus Anti-Patterns
**Last synced**: 2026-03-21

> **Scope note:** This skill provides pattern-level decision trees for _when and how_ to apply focus management in keyboard navigation and accessibility contexts.

---

## 6.1 Focus Trapping

**Use:** Modals, dialogs, drawers, full-screen overlays — any element that takes over user attention.
**Don't use:** Inline content, dropdowns (use focus-on-close instead), tooltips (non-interactive).

- Tab cycles through focusable elements within the trap
- Shift+Tab cycles backward
- Escape closes the overlay and returns focus to the trigger
- First focusable element receives focus on open (or the close button if no other interactive elements)

**Implementation:** Radix Dialog/Sheet handles this automatically. For custom overlays, use a `useFocusTrap` hook that cycles Tab/Shift+Tab through focusable children and returns focus to the trigger on Escape.

---

## 6.2 Roving Tabindex

**Use:** Composite widgets where multiple items form a single Tab stop — toolbars, tab lists, radio groups, menu bars, listboxes.
**Don't use:** Simple lists of links or buttons where each should be individually tabbable. Forms.

- Only one item in the group has `tabIndex={0}` (active item)
- All other items have `tabIndex={-1}`
- Arrow keys move focus between items (updating `tabIndex` accordingly)
- Tab moves focus OUT of the entire group to the next Tab stop
- Home/End jump to first/last item

**Implementation:** Radix uses roving tabindex for Tabs, Toolbar, RadioGroup, and Menubar — all auto-managed.

---

## 6.3 Skip Links

**Use:** Every page (required for accessibility). The skip-to-main-content link is the first focusable element.

- Visually hidden until focused: `sr-only focus:not-sr-only` (Tailwind)
- Target: `<main id="main-content">`
- On activation: focus moves to main content area

---

## 6.4 Focus Visible

**Use:** All interactive elements.

- `focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2` (per project token standards — use only tokens from `tailwind.config.ts`)
- `focus-visible` shows the ring only on keyboard navigation, not mouse clicks
- Never remove focus outlines without replacement — `outline: none` is forbidden (keyboard users lose their position; always provide a visible `focus-visible:ring-*` alternative)
- Apply to all buttons, links, inputs, custom interactive elements

---

## 6.5 Escape Key Conventions

Escape has a well-established layered close behavior:

| Priority      | What Closes                       | Example                                             |
| ------------- | --------------------------------- | --------------------------------------------------- |
| 1 (topmost)   | Topmost overlay in the stack      | Nested modal closes before parent modal             |
| 2             | Dropdown / popover                | Open dropdown menu closes                           |
| 3             | Full-screen overlay               | Mobile navigation drawer closes                     |
| 4             | Inline expanded content           | Expanded accordion or disclosure panel              |
| 5 (lowest)    | Search / filter active state      | Clears active search field or filter                |

- Each overlay registers its own Escape handler
- Overlays higher in z-index stack consume Escape first (`event.stopPropagation()`)
- After closing, focus returns to the element that triggered the overlay

---

## 6.6 Focus Restoration

**Use:** Whenever an overlay or transient UI element closes — modal, drawer, dropdown, toast action.

- Store a reference to the trigger element before opening
- On close: `triggerRef.current?.focus()` — return focus to the trigger
- If the trigger was removed (e.g., deleted the item that triggered a confirmation dialog): focus the nearest logical ancestor

**Implementation:** Radix components handle focus restoration automatically. For custom implementations, use `useRef` to capture trigger.

---

## Anti-Patterns

| ❌ Don't                                         | ✅ Do                                                         | Why                                                         |
| ------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------- |
| Remove focus ring (`outline: none`) with no replacement | `focus-visible:ring-*` for visible keyboard focus — keyboard users must always see where they are | Keyboard users can't see where they are                     |
| Trap focus in a non-modal element                | Only trap focus in modals/dialogs/drawers                     | Focus traps in non-modal UI prevent keyboard users leaving  |
| Use `tabIndex` > 0 to reorder focus              | Use natural DOM order; rearrange HTML if focus order is wrong | `tabIndex` > 0 creates unpredictable focus jumps            |
| Forget to restore focus on overlay close         | Return focus to the triggering element                        | Keyboard users lose their position in the page              |
| Autofocus a below-the-fold element               | Only autofocus above-the-fold elements on dedicated pages     | Autofocus scrolls the page, hiding expected content         |
