---
name: ux-user-settings-onboarding
description: >-
  User management, settings, and onboarding UX patterns — role picker decision tree
  (radio/dropdown/combobox by count), permission matrix table, invite flow with
  pending state, user status indicators, settings layout decision tree (sections/tabs/
  sidebar by category count), toggle/switch patterns, dirty-state save bar, danger zone
  with type-to-confirm, account deletion cooldown, onboarding strategy decision tree
  (empty state/wizard/checklist/tour), setup wizard, checklist widget, product tour
  spotlight, empty-to-populated transition. Use when building team member management,
  role assignment, permission configuration, settings pages, account danger zones,
  user onboarding flows, or feature discovery tours.
---

# User Management, Settings & Onboarding Patterns

**Compiled from**: ADR-0026 §8 (User & Permission Management) + §9 (Settings) + §10 (Onboarding)
**Last synced**: 2026-03-22

---

## Role Picker

### Decision Tree

```
How many roles exist?
  → 2-4: Radio buttons or segmented control (all visible at once)
  → 5-8: Dropdown select
  → 9+: Searchable dropdown or combobox
```

**Pattern:**
- Each role: name + short description ("Admin — Full access to all settings and data")
- Current role: pre-selected and visually indicated
- Change confirmation: show what the user will gain/lose
- Self-demotion warning: "You're removing your own admin access. You won't be able to undo this."

**Accessibility:**
- Radio group: `role="radiogroup"` with `aria-label="User role"`, each option `role="radio"` with `aria-checked`
- Dropdown: standard select, `aria-label="Select role for [user name]"`
- Role descriptions: `aria-describedby` linking each option to its description text

---

## Permission Matrix

**Pattern:**
- Table layout: rows = permissions/features, columns = roles
- Each cell: checkbox (can/can't) or dropdown (no access / read / write / admin)
- Group rows by feature area with `<th scope="rowgroup">` headers: "Projects", "Users", "Billing"
- Summary: total enabled permissions per role
- Highlight changes: changed cells show visual diff before saving

**Accessibility:**
- Use `<table>` with proper `<th>` headers
- Each checkbox: `aria-label="[Role] can [permission]"` (e.g., "Editor can Delete projects")

**Responsive:**
- Desktop: full matrix
- Mobile: one card per role listing its permissions, or horizontal scroll with sticky first column

---

## Invite Flow

**Pattern:**
1. "Invite member" button → modal or slide-over
2. Email input: supports multiple (comma-separated or one-per-line) → tag/pill multi-select pattern
3. Role selection (from role picker above)
4. Optional personal message
5. Send → generates invite link + sends email notification
6. Pending state: invited user shows in team list with "Pending" badge
7. Accepted: badge changes to role, user appears as active
8. Expired: show "Resend invite" action after 7 days

**Accessibility:**
- Pending member: `aria-label="[email], invite pending"` with "Resend" and "Revoke" actions

---

## User Status Indicators

| Status | Visual | Meaning |
|--------|--------|---------|
| Online | Green dot | Active in last 5 minutes |
| Idle | Yellow dot | No activity for 5–30 minutes |
| Offline | Gray dot (or none) | 30+ minutes or explicitly set |
| Busy / Do Not Disturb | Red dot | User set manually — suppress notifications |

- Never rely on color alone — pair with tooltip text on hover/focus: "Online", "Away", "Busy"
- Dot position: bottom-right of user avatar, overlapping slightly

---

## Settings Page Layout

### Decision Tree

```
How many settings categories exist?
  → 1-3: Single page with sections (headings + anchor links)
  → 4-8: Vertical tabs (desktop) + accordion (mobile)
  → 9+: Sidebar navigation to settings sub-pages
```

**Section organization:** "Profile", "Notifications", "Security", "Billing" — each group has form fields saved independently or together.

---

## Toggle / Switch Patterns

**Use for:** Binary settings — on/off, enabled/disabled. Notification preferences, privacy settings, feature flags.

**Pattern:**
- Label left, toggle switch right
- Description text below the label (secondary text explaining effect)
- Immediate effect: toggle saves on change (no form submit) → show toast on save
- If toggles are in a larger form: group them with a single Save button

**Accessibility:**
- `role="switch"` with `aria-checked` (not `role="checkbox"`)
- Standard `<label>` connected via `htmlFor`
- Description: `aria-describedby` linking toggle to description text
- Keyboard: Space toggles

---

## Save / Discard Dirty State

**Use when:** Settings forms where changes are saved together (not auto-saved individually).

**Pattern:**
- Track dirty state: compare current form values to last-saved values
- When dirty: sticky save bar — "You have unsaved changes" + "Save" + "Discard"
- Save: submit changes → success feedback → clear dirty state
- Discard: reset form to saved values → clear dirty state
- Navigation guard: if user navigates away with unsaved changes → show "Discard changes?" `role="alertdialog"`

**Implementation:**
- React Hook Form: `formState.isDirty` tracks dirty automatically
- Non-form settings: Zustand store with a `hasChanges` derived value
- Navigation guard: `beforeunload` event + Next.js router interception

**Accessibility:**
- Save bar: `role="status"` with `aria-live="polite"` — announces "You have unsaved changes"
- Navigation guard dialog: `role="alertdialog"`

---

## Danger Zone

**Use for:** Destructive or hard-to-reverse settings — account deletion, team disbanding, API key regeneration.

**Pattern:**
- Visually separated section at the bottom of the settings page — danger/error border color
- Section title: "Danger Zone" or "Destructive Actions"
- Each action: description of consequences + destructive variant button
- Type-to-confirm for irreversible actions; standard confirmation for reversible ones
- Explain what the user is about to lose and whether it's recoverable

**Anti-pattern:** Never mix danger zone actions with regular settings — keep them visually and spatially separated.

---

## Account Deletion Flow

Required by GDPR Article 17 (right to be forgotten).

**Pattern:**
1. "Delete my account" in Danger Zone → informational modal/page explaining what will be deleted
2. Offer: "Export your data first?"
3. Type-to-confirm: user types account email or name to enable the "Delete" button
4. Cooldown: "Your account will be deleted in 14 days. You can cancel during this period."
5. Email confirmation: with cancellation link
6. After cooldown: permanent deletion + confirmation email

---

## Onboarding Strategy Decision Tree

```
Is the product simple (<3 core features)?
  → YES: No formal onboarding — empty states guide the user naturally
  → NO: Does the user need to complete setup before using the product?
    → YES: Setup wizard (blocking flow for essential configuration)
    → NO: Is the product used daily (habitual use)?
      → YES: Checklist onboarding (persistent checklist in sidebar/dashboard)
      → NO: Product tour (guided walkthrough of key features on first visit)
```

---

## Setup Wizard

**Use when:** New user/team onboarding requires configuration — selecting a plan, connecting integrations, inviting team members.

**Pattern:**
- Multi-step wizard, 3-5 steps (use step indicator with numbered steps + labels)
- Each step: focused on one task — don't combine unrelated configuration
- "Skip" option on non-essential steps — never force optional setup
- Final step: summary of what was configured + "Get started" CTA
- Redirect: after completion, go to the product with a welcome state

**Accessibility:**
- Skip button: visible and labeled — "Skip this step"
- Progress: `aria-label="Setup progress: Step 2 of 4"`
- Step indicator: numbered steps with completed/current/future/error states per ARIA step pattern

---

## Checklist Onboarding

**Use when:** 4-8 key actions the user should complete to get product value.

**Pattern:**
- Persistent widget: sidebar card, dashboard card, or floating widget
- Progress: "3 of 6 completed" with progress bar
- Each item: checkbox + label + optional CTA button
- Completed items: checked with strikethrough or muted style
- Dismissible after 80%+ completion or 7 days — never permanently forced
- Celebration on 100%: optional confetti — MUST respect `prefers-reduced-motion: reduce`

**Accessibility:**
- List: `role="list"` with `aria-label="Getting started checklist"`
- Completed item: `aria-label="[task], completed"`
- Progress: `role="progressbar"` with `aria-valuenow`
- Dismiss: `aria-label="Dismiss getting started checklist"`

**Responsive:**
- Desktop: sidebar card or dashboard widget
- Mobile: collapsible banner at top or accessible from a menu item

---

## Product Tour / Feature Discovery

**Use when:** Showing features users won't discover on their own — new feature announcements, complex hidden workflows.

**When NOT to use:** Tour as substitute for poor UX (fix the UX instead). More than 5 steps. Re-shows on every visit.

**Tooltip spotlight pattern:**
- Highlight a UI element with a tooltip pointer, dimmed background on everything else
- Step progression: "1 of 4" with Next / Previous / Skip buttons in the tooltip
- Auto-position: avoids viewport edges
- Trigger: on first visit to a page / after a feature release / via "Take a tour" help menu
- Store completion in `localStorage` — never show again after completed or skipped

**Progressive disclosure (alternative for individual features):**
- Pulsing dot or "New!" badge on the UI element — click to see explanation
- Single tooltip, shown once per feature per user

**Accessibility:**
- Focus trapped within the tooltip step — keyboard-accessible Next, Previous, Skip
- Highlighted element: `aria-describedby` linking to tooltip content
- Skip: always visible and focusable — "Skip tour"
- Never block critical UI during the tour

**Responsive:**
- Desktop: tooltip pointing to specific UI element
- Mobile: full-width card at top/bottom of screen (tooltips obscure too much on small screens)

---

## Empty-to-Populated Transition

**Pattern:**
- Empty state shows guided CTA: "Create your first project"
- After first item created: empty state disappears, item list appears with the new item highlighted
- Optional: brief fade animation (empty state → list) — MUST respect `prefers-reduced-motion`
- Contextual tip on subsequent items: "Tip: Press ⌘K to quickly create new items"

---

## Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Forced product tour that can't be skipped | Always provide "Skip tour" or × close |
| Tour that re-shows on every visit | Show once, track in `localStorage` |
| 10+ step tour | Maximum 5 steps — link to docs for more |
| Danger zone actions mixed with regular settings | Separate visually at bottom with warning border |
| Instant account deletion with no cooling period | 14-day cooldown with cancellation by email link |
| Settings form with no dirty state tracking | Show unsaved changes indicator + save/discard bar |
