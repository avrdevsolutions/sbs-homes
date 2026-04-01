---
name: ux-cta-feedback
description: >-
  CTA hierarchy and action feedback patterns — button vs anchor decision tree, primary/secondary/
  tertiary CTA levels, external link rules, modal trigger semantics, feedback type decision tree,
  toast patterns with Sonner (success/error/loading/action), inline messages (error/success/
  warning), confirmation dialog structure, optimistic UI with TanStack Query. Includes anti-patterns.
  Use when building CTA sections, choosing between button and anchor, implementing toasts,
  handling form submission results, showing action feedback, or confirming destructive operations.
---

# UX — CTA Hierarchy & Action Feedback Patterns

**Compiled from**: ADR-0024 §2 (CTA & Link Behavior), §3.1–3.4, §3.7 (Feedback), §7 CTA/Links & Feedback Anti-Patterns
**Last synced**: 2026-03-21

---

## 2.1 CTA Hierarchy

Every section needs clear action priority. Competing equal-weight CTAs create decision paralysis.

| Level         | Visual Weight                      | HTML Element                                | Use Case                                                  |
| ------------- | ---------------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| **Primary**   | Filled/solid button, high contrast | `<button>` or `<a>` with `buttonVariants()` | Main desired action per section — "Get Started", "Submit" |
| **Secondary** | Outlined or ghost button           | `<button>` or `<a>` with `buttonVariants()` | Alternative action — "Learn More", "View Demo"            |
| **Tertiary**  | Text link with underline or arrow  | `<a>`                                       | Supporting navigation — "Read documentation →"            |

**Responsive:**

- Desktop: CTAs side-by-side (primary left or right depending on context)
- Mobile: Stack vertically, primary on top, full width

**Rule:** Max 1 primary CTA per viewport section. Exception: A/B testing where measuring which CTA resonates.

---

## 2.2 CTA Element Decision Tree

```
Does clicking trigger a URL change (same site or external)?
  → YES: Use <a> (with buttonVariants() for button styling if needed)
  → NO: Does it trigger a mutation, modal, or state change?
    → YES: Use <button>
    → NO: Is it a download?
      → YES: Use <a download>
      → NO: Probably shouldn't be a CTA — reconsider
```

---

## 2.3 External Links

Any link to a different domain:

- `target="_blank" rel="noopener noreferrer"`
- Visual indicator: external link icon after link text (Lucide `ExternalLink` at 12–14px)
- Screen reader: visually-hidden "(opens in new tab)" or `aria-label` including that phrase

**Don't:** Use `target="_blank"` for same-site internal navigation — breaks back-button.

---

## 2.4 Scroll Target Anchors (In-Page CTAs)

**Use:** Landing pages where a CTA ("See Pricing") targets a section below on the same page.

- `<a href="#pricing">` — progressive enhancement, works without JS
- `scroll-behavior: smooth` in CSS handles animation
- Target section needs `scroll-margin-top` matching sticky header height + 16–24px

**Don't use:** When the target is on a different route — use `<Link href="/pricing">` instead.

---

## 2.5 Modal Triggers

- Trigger: `<button>` — never `<a>` (modals are actions, not navigation)
- Modal: Radix Dialog via shadcn/ui handles focus management automatically
- `role="dialog"` with `aria-labelledby` pointing to modal title
- `aria-modal="true"` to indicate background content is inert
- Escape closes, focus returns to triggering element on close

---

## 3.1 Feedback Type Decision Tree

```
Is feedback about a specific element on screen (form field, inline action)?
  → YES: Inline message (next to the element)
  → NO: Is it a background operation the user didn't directly trigger?
    → YES: Toast notification (non-blocking)
    → NO: Is the action destructive or irreversible?
      → YES: Confirmation dialog (blocking)
      → NO: Is the result important enough to interrupt workflow?
        → YES: Toast (success/error)
        → NO: Inline status change (badge, icon swap, text update)
```

---

## 3.2 Toast Notifications (Sonner)

**Use:** Non-blocking feedback for background operations, successful actions not otherwise visible, errors from actions without inline context.
**Don't use:** Form field errors (use inline errors with `aria-describedby` connecting error to field). Never as the _only_ indicator for critical errors — pair with inline state.

| Toast Type       | Sonner API                                            | When                                             |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------ |
| Success          | `toast.success(message)`                              | Action completed — "Saved", "Copied"             |
| Error            | `toast.error(message)`                                | Action failed — "Failed to save", network errors |
| Loading → result | `toast.promise(promise, { loading, success, error })` | Async ops with visible progress                  |
| Info             | `toast(message)`                                      | Neutral — "New version available"                |
| Action           | `toast(message, { action: { label, onClick } })`      | Undo, retry, follow-up action                    |

**Accessibility:**

- Sonner uses `aria-live="polite"` by default
- Error toasts: use `role="alert"` (assertive) for critical failures
- Auto-dismiss: 4s for success, longer for errors; never rely on toast as sole error indicator

**Responsive:** Desktop: bottom-right or top-right. Mobile: top-center (full width, above content — avoids conflict with bottom nav).

---

## 3.3 Inline Messages

**Use:** Feedback relating to a visible element — field errors, inline success confirmations, contextual warnings.

- Error: red text + icon below the field, connected via `aria-describedby`
- Success: green text or check icon replacing the action briefly ("Saved ✓")
- Warning: amber banner above the relevant section
- Dynamically inserted error messages: `role="alert"`
- Dynamically inserted success/info: `role="status"`
- Connect to related inputs via `aria-describedby`

---

## 3.4 Confirmation Dialogs

**Use:** Destructive actions (delete, remove, cancel subscription), irreversible actions (publish, send email), actions with significant consequences.
**Don't use:** Routine actions (save, update). Frequent actions done 10+ times per session — offer undo instead.

- Title: states the action ("Delete project?")
- Body: explains the consequence with specific item name and "This cannot be undone."
- Actions: destructive button (right, red/danger variant) + Cancel (left, ghost/secondary)
- Destructive button text: specific verb — "Delete", "Remove", "Cancel subscription" — not "OK"
- `role="alertdialog"` (not `role="dialog"`) — more urgent announcement
- Auto-focus the cancel/safe action, not the destructive one
- Focus trap, Escape to close, return focus to trigger

---

## 3.7 Optimistic UI

**Use:** User mutations where success rate is >95% and UI update is simple (like/unlike, toggle, reorder).
**Don't use:** Complex mutations with high failure rates, payments, irreversible actions, or when the optimistic state is hard to calculate.

**Pattern:**

1. On user action → immediately update UI to expected state
2. Fire mutation in background
3. On success → no-op (UI already correct)
4. On failure → revert UI, show error toast

**State management:** TanStack Query `onMutate`/`onError`/`onSettled` for server state. `useState` for simple client toggles.

---

## Anti-Patterns

### CTA & Links

| ❌ Don't                                  | ✅ Do                                         | Why                                                  |
| ----------------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| `<a href="#">` with `onClick` for actions | `<button>` for actions, `<a>` for navigation  | Semantic HTML, correct keyboard behavior — buttons must be focusable and activate on Enter/Space  |
| Open internal links in new tabs           | `target="_blank"` for external links only     | New tabs break back-button, confuse navigation model |
| "Click Here" link text                    | "View pricing plans" — descriptive text       | Screen readers announce link text out of context     |
| 3+ primary CTAs in one viewport           | One primary CTA per section, others secondary | Decision paralysis                                   |
| `<div>` styled as button/link             | `<button>` or `<a>` with appropriate styling  | Missing keyboard access, no implicit role            |

### Feedback

| ❌ Don't                          | ✅ Do                                              | Why                                                     |
| --------------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| Toast for form field errors       | Inline errors next to fields, connected via `aria-describedby`            | Toast disappears — user can't reference it while fixing |
| Auto-dismiss error toasts quickly | Keep error toasts 8–10s or until dismissed         | Users need time to read and act on errors               |
| Confirm every routine action      | Confirm only destructive/irreversible; offer undo  | Confirmation fatigue — users click "OK" without reading |
| Show spinner for 5+ second ops    | Progress bar or step indicator for long operations | Spinners with no progress trigger abandonment after ~3s |
