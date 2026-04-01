---
name: ux-form-patterns
description: >-
  Form UX timing and behavior — lazy-then-eager validation (blur first, change after first error),
  field/form/toast error display scope table, submit button state sequence (default→submitting→
  success→error), post-submit success redirect decision tree, multi-step wizard structure (step
  indicator, back/next, per-step validation, URL persistence), autofocus rules, input affordances
  (type, inputMode, autoComplete, maxlength indicator, password visibility). Includes anti-patterns.
  Use when implementing validation timing, submit loading states, post-submit success flows,
  multi-step onboarding or checkout, or setting input attributes for UX clarity.
---

# UX — Form Patterns (Timing & Behavior)

**Compiled from**: ADR-0024 §4 (Form UX), §7 Form UX Anti-Patterns
**Last synced**: 2026-03-21

> **Scope note:** Form validation mechanics, Server Actions, Zod schemas, and field primitives are covered separately. This skill covers the _UX timing and behavior_ layer.

---

## 4.1 Validation Timing — "Lazy Then Eager"

#### Decision Tree — When to Validate

```
Is this the user's first interaction with the field?
  → YES: Validate on blur (when they leave the field)
      Don't validate on every keystroke — shows errors before user finishes typing
  → NO: Has the field been submitted or blurred-with-error before?
    → YES: Validate on change (real-time — fix errors as user types)
    → NO: Validate on blur
```

**Pattern:** Lazy validation on first touch (blur), eager real-time validation after first error is shown. Respectful UX without stale errors.

**One deviation:** Email and URL fields may validate format on blur but validate uniqueness on submit (server-side).

---

## 4.2 Error Display Scope

| Error Scope     | Display Location                                                      | Trigger                                                      |
| --------------- | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Field-level** | Below the field, connected via `aria-describedby`          | Validation failure on blur/change/submit                     |
| **Form-level**  | Above the form (FormMessage primitive) or anchor-linked error summary | Server error, network failure, cross-field validation        |
| **Toast**       | Non-blocking notification                                             | Network errors, session expiry — no inline context available |

**When to use error summary (top-of-form):**

- Complex forms with 10+ fields where errors may be off-screen
- Summary links to each errored field: `<a href="#field-id">`
- Text: "Please fix N errors below:" + clickable list of error messages

**Don't use error summary:** Simple forms (≤5 fields) where all fields are visible — inline errors are sufficient.

---

## 4.3 Submit Button States

Sequential states of the submit button:

| State          | Visual                            | Behavior                                               |
| -------------- | --------------------------------- | ------------------------------------------------------ |
| **Default**    | "Submit" / "Save" / specific verb | Clickable                                              |
| **Submitting** | Spinner + "Saving..."             | Disabled — `aria-busy="true"` — prevents double-submit |
| **Success**    | "Saved ✓" (1–2s brief)            | Then reset to default or redirect                      |
| **Error**      | Re-enable button, show error      | Allow retry                                            |

**Accessibility:** Button text change ("Save" → "Saving...") is announced if button has focus. `aria-busy` on the form or button is an alternative. Never disable without visible loading indication.

---

## 4.4 Post-Submit Success Decision Tree

```
Does the form create a new resource the user should see?
  → YES: Redirect to the new resource (e.g., /projects/new-project-id)
  → NO: Is the form part of a multi-step flow?
    → YES: Advance to next step (update step indicator)
    → NO: Is the form on a dedicated page?
      → YES: Show success page/message + clear next action ("Return to dashboard")
      → NO: Is it inline or in a modal?
        → YES: Close modal + toast confirmation, OR inline success replacing the form
        → NO: Reset form + "Saved successfully" toast
```

---

## 4.5 Multi-Step Wizards

**Use:** Forms with 8+ fields that can be logically grouped into sequential steps. Onboarding flows, checkout, complex data entry.
**Don't use:** Forms with ≤7 fields — a single long form with sections is fine. Don't force steps for artificial simplification.

- Step indicator at top: current step, total steps, optional step labels
- Back/Next navigation within each step
- **Step validation:** validate the current step on "Next" before advancing — don't allow skipping with invalid data
- Final step: "Submit" replaces "Next"
- Progress persistence: URL (`?step=2`) or URL state — user can back without losing data
- Optional: auto-save step data to prevent loss on accidental navigation

**Accessibility:**

- `aria-label="Step 2 of 4: Contact information"` on step indicator
- Back/Next buttons clearly labeled — not just arrows
- On advance: focus moves to the first field of the new step
- On validation failure: focus moves to the first errored field

**Responsive:** Same step structure on all breakpoints. Mobile: compact numbered dots or vertical step indicator.

---

## 4.6 Autofocus

**Use:**

- Modal/dialog with a form: autofocus the first input
- Search page or search modal: autofocus the search input
- Login/signup forms: autofocus the first field
- Single-purpose pages (search, compose, create)

**Don't use:**

- Pages with mixed content — autofocusing a form scrolls past content above it
- Mobile: autofocus triggers the virtual keyboard (half the screen) — only use when user clearly intends to type (search modal, compose)
- Forms below the fold — autofocus scrolls the page unexpectedly

**Accessibility:** `autoFocus` attribute (React) / `autofocus` (HTML). Screen readers announce the focused element — ensure the label is clear. Never autofocus a hidden or off-screen element.

---

## 4.7 Input Affordances

Visual and behavioral cues that communicate what data is expected:

| Affordance               | When to Use                           | HTML / Attribute                                                                     |
| ------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------ |
| **Input type**           | Always — match to data                | `type="email"`, `type="tel"`, `type="url"`, `type="number"`                          |
| **Inputmode**            | Mobile keyboard optimization          | `inputMode="numeric"` for PIN/OTP, `inputMode="search"` for search                   |
| **Autocomplete**         | Known personal data fields            | `autoComplete="email"`, `autoComplete="given-name"`, `autoComplete="street-address"` |
| **Placeholder**          | Brief example (not label replacement) | `placeholder="jane@example.com"` — always pair with a visible `<label>`                |
| **Max length indicator** | Character-limited fields (bio, tweet) | Show "42/280" below input, updated live                                              |
| **Password visibility**  | Password fields                       | Toggle eye icon to show/hide, `aria-label="Show password"`                           |

---

## Anti-Patterns

| ❌ Don't                                   | ✅ Do                                                            | Why                                                            |
| ------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Validate on every keystroke from the start | Blur first, then change after first error                        | Aggressive validation before user finishes is hostile          |
| Placeholder as the only label              | Visible `<label>` above field; placeholder is supplementary      | Placeholder disappears on focus — user forgets field's purpose |
| Disable submit before user interacts       | Keep submit enabled; show errors on attempt                      | Disabled buttons are confusing — user doesn't know why         |
| Clear entire form on validation error      | Keep user input; highlight only errored fields                   | Clearing valid input forces re-entry — high frustration        |
| "Submit" as button text                    | Specific verbs: "Send message", "Create project", "Save changes" | Specific text sets expectations and confirms the action        |
