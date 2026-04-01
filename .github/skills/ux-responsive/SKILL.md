---
name: ux-responsive
description: >-
  Responsive interaction patterns — touch target sizing (WCAG 2.5.8 24×24 min, 44×44 target),
  pseudo-element tap area extension technique, hover-to-touch alternatives table (tooltip, preview,
  row actions, dropdown), hover pattern decision tree, swipe gesture rules and alternatives, bottom
  sheet vs modal decision tree by breakpoint, interaction switching across breakpoints table (side
  panel, table row actions, drag-and-drop, context menu). Use when adapting components for mobile,
  implementing touch-friendly interactions, choosing between bottom sheet and modal, or defining
  breakpoint-specific behavior.
---

# UX — Responsive Interaction Patterns

**Compiled from**: ADR-0024 §5 (Responsive Interactions), §7 Responsive Anti-Patterns
**Last synced**: 2026-03-21

---

## 5.1 Touch Targets

| Guideline            | Minimum          | Target           |
| -------------------- | ---------------- | ---------------- |
| WCAG 2.5.8 (AA)      | 24×24 CSS px     | —                |
| Apple HIG            | 44×44 pt         | 44×44 pt         |
| **Project standard** | **24×24 CSS px** | **44×44 CSS px** |

- Buttons, links, interactive elements: `min-h-11 min-w-11` (44px) on mobile
- Small icons (close, menu): add padding to hit the 44px area — visual size stays 24px
- Spacing between targets: ≥8px to prevent mis-taps

**When target sizes conflict with design:**
Use `::before`/`::after` pseudo-elements with `position: absolute` to extend the tap area beyond visual bounds. Maintains visual design while meeting touch target requirements.

---

## 5.2 Hover vs Touch Alternatives

Hover is unavailable on touch devices. Every hover-triggered interaction needs a touch-friendly alternative.

| Hover Pattern               | Touch Alternative                                       | Notes                                              |
| --------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| Tooltip on hover            | Tap to show, tap elsewhere to dismiss (or long-press)   | Always — tooltips must work on touch               |
| Preview on hover            | Tap to navigate, or tap-and-hold for preview            | When hover preview is an enhancement, not required |
| Reveal actions on row hover | Swipe to reveal, or show actions inline/in context menu | Table rows, list items with hidden actions         |
| Dropdown on hover           | Tap to toggle                                           | Nav menus — never hover-only dropdowns             |
| Color/style change on hover | Focus/active states serve similar purpose               | Decorative — touch users see the active state      |

#### Decision Tree — Hover Pattern Assessment

```
Is the hover content/action essential to complete the task?
  → YES: MUST have a non-hover interaction (tap, long-press, always-visible)
  → NO: Is it an enhancement (preview, tooltip, animation)?
    → YES: Acceptable to omit on touch, but prefer tap alternative
    → NO: Don't use hover — make the interaction explicit
```

**Accessibility:**

- `title` attribute is NOT an acceptable tooltip — inconsistent behavior, no keyboard trigger
- Use Radix Tooltip (shadcn/ui) — handles hover, focus, and touch
- Hover content must also be triggerable by keyboard focus (`onFocus`/`onBlur`)

---

## 5.3 Swipe Gestures

**Use:** Supplementary interaction on touch — swipe-to-delete in lists, swipe between carousel items, pull-to-refresh.

**Don't use:**

- Never as the _only_ way to perform an action — always have a visible button/menu alternative
- Complex multi-directional gestures conflicting with browser gestures (back swipe, scroll)
- Desktop (swipe is unavailable or unintuitive)

- Horizontal swipe on list items: reveal action buttons (delete, archive)
- Always pair with visible affordance: edge indicator, or actions accessible via context menu/long-press
- Cancel unintended swipes: require threshold distance before committing action

**Accessibility:** Swipe actions MUST have a keyboard/button alternative. Screen readers can't swipe — provide all actions via visible UI or context menu. Test with VoiceOver/TalkBack.

---

## 5.4 Bottom Sheets vs Modals

#### Decision Tree — Overlay Type by Breakpoint

```
Is the screen width <768px (mobile)?
  → YES: Use bottom sheet (slides up from bottom, partial screen)
      — Draggable handle at top, swipe-down to dismiss
      — Content scrolls within the sheet
  → NO: Use modal/dialog (centered, overlay backdrop)
      — Fixed max-width (typically 480–640px)
      — Focus trapped, Escape to close
```

**When to use bottom sheet on mobile:**

- Content is 1–4 actions (share menu, filter options)
- User needs to see partial page context behind
- Quick, low-commitment interactions

**When to use full modal even on mobile:**

- Forms or complex content requiring full attention
- Multi-step flows within the overlay
- Content that benefits from full-width display

**Accessibility (bottom sheet):**

- Same ARIA requirements as dialog: `role="dialog"`, `aria-labelledby`, focus trap
- Swipe-to-dismiss MUST have a visible close button alternative
- Drag handle: visually decorative with close button for screen readers

---

## 5.5 Interaction Switching Across Breakpoints

Some interactions must fundamentally change between mobile and desktop — not just resize, but switch pattern.

| Pattern                  | Desktop                       | Mobile                                             |
| ------------------------ | ----------------------------- | -------------------------------------------------- |
| Side panel detail view   | Panel opens alongside list    | Full-screen detail page or bottom sheet            |
| Multi-column form        | Columns side by side          | Single column, vertically stacked                  |
| Table with row actions   | Actions revealed on row hover | Kebab menu (⋮) per row, or swipe                   |
| Tooltip information      | Hover tooltip                 | Tap to show popover, or always-visible inline text |
| Drag-and-drop reordering | Drag handles                  | Handle + long-press drag, or up/down arrow buttons |
| Context menu             | Right-click                   | Long-press, or explicit menu button (⋮)            |

**Implementation:** CSS media queries for layout changes. `useMediaQuery` hook or responsive Tailwind classes for interaction changes requiring JS.

---

## Anti-Patterns

| ❌ Don't                              | ✅ Do                                                    | Why                                                       |
| ------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| Tiny tap targets (<24px) on mobile    | Minimum 24px, target 44px for all interactive elements   | Mis-taps frustrate users — fat-finger problem             |
| Require hover for essential actions   | Provide tap/click alternative for all hover interactions | Touch devices have no hover state                         |
| Desktop-only right-click context menu | Visible menu button (⋮) + optional long-press on mobile  | Right-click not discoverable on touch                     |
| Show a desktop modal on mobile        | Bottom sheet for quick actions, full-screen for complex  | Centered modals on small screens leave no visible context |
