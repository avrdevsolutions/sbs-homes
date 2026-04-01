---
name: ux-app-chrome
description: >-
  Application chrome patterns — multi-select decision tree (checkbox/searchable/pill/
  transfer list), tag/token/pill multi-select with keyboard, transfer list, context menu
  decision tree (right-click/long-press/kebab/inline), kebab action menus with Radix,
  notification architecture (toast vs in-app vs banner decision tree), notification center
  panel, error recovery decision tree (network/validation/auth/server/conflict), retry with
  exponential backoff, session expiry modal, auto-save recovery, offline state handling,
  keyboard shortcut scoping decision tree, platform-specific keys, shortcut discovery modal,
  conflict prevention table. Use when building multi-select inputs, kebab/context menus,
  in-app notification centers, error recovery flows, session expiry handling, auto-save,
  keyboard shortcut systems, or offline-capable features.
---

# Application Chrome Patterns

**Compiled from**: ADR-0026 §11 (Multi-Select) + §12 (Context Menus) + §13 (Notifications) + §14 (Error Recovery) + §15 (Keyboard Shortcuts)
**Last synced**: 2026-03-22

---

## Multi-Select Patterns

### Multi-Select Decision Tree

```
What is the user selecting from?
  → Fixed list of <8 options (all visible): Checkbox group
  → Fixed list of 8-20 options: Scrollable checkbox list in a dropdown
  → Large or dynamic list (20+): Searchable multi-select with pills (tag/token)
  → Two explicit groups (available → selected): Transfer list
```

### Tag / Token / Pill Multi-Select

**Use when:** Tags, categories, team members, labels — selecting multiple items from a large list.

**Pattern:**
- Input area shows selected items as removable pills
- Typing filters available options in a dropdown below
- Selecting an option: adds as pill, clears input, refocuses for next selection
- Removing: click × on pill, or Backspace when input is empty removes last pill
- Dropdown shows only unselected options

**Accessibility:**
- Container: `role="combobox"` with `aria-expanded` pointing to dropdown
- Pills: `role="option"` or `role="listitem"` with `aria-label="[name], press Backspace to remove"`
- Remove button: `aria-label="Remove [name]"`
- Dropdown: `role="listbox"` with `role="option"` items
- Keyboard: Arrow keys navigate dropdown, Enter selects, Backspace removes last pill, Escape closes
- Announce: `aria-live="polite"` — "[name] added. 3 items selected" / "[name] removed. 2 items selected"

**Responsive:** Pills wrap to multiple lines on narrow screens; input stays full-width below.

### Transfer List

**Use when:** Moving items between two explicit groups — "Available permissions" → "Assigned permissions".

**When NOT to use:** Simple multi-select where the "available" list concept is unnecessary. When order within the selected group matters (use sortable list after selection).

**Pattern:**
- Two side-by-side lists with headers ("Available" / "Selected")
- Click to select — Shift+click for range, Ctrl/⌘+click to toggle
- Arrow buttons between lists (→ assign, ← unassign), or drag between lists
- "Add All" / "Remove All" buttons
- Search/filter within each list for large sets

**Accessibility:**
- Each list: `role="listbox"` with `aria-label="Available permissions"` / `aria-label="Selected permissions"`, `aria-multiselectable="true"`
- Items: `role="option"` with `aria-selected`
- Transfer buttons: `aria-label="Move selected to assigned"` / `aria-label="Remove selected from assigned"`
- Announce: `aria-live="polite"` — "3 items moved to Selected"

**Responsive:** Desktop: side-by-side. Mobile: stacked (Available above, Selected below) with buttons between.

---

## Context Menus

### Context Menu Decision Tree

```
What triggers the menu?
  → Right-click (desktop): Context menu — positioned at cursor
  → Long-press (mobile): Context menu — positioned at press, or bottom sheet
  → Explicit button click (⋮ kebab / ⋯ meatball): Radix DropdownMenu — below button
  → Row/card hover: ≤2 actions → inline buttons; overflow → kebab menu
```

### Right-Click Context Menu

**Use for:** Power users in file managers, design tools, project management tools.

**Never as the ONLY access path** — always pair with a visible button alternative (kebab menu).

**Pattern:**
- Intercept `contextmenu` event, show menu at cursor position
- Items: icon + label + optional keyboard shortcut hint (right-aligned)
- Dividers between related action groups
- Disabled items: aria-disabled + reason on hover tooltip ("Cannot delete — item is locked")
- Submenu: ▸ icon → flyout on hover/Arrow Right

**Accessibility:**
- Menu: `role="menu"` with `aria-label="Actions for [item name]"`
- Items: `role="menuitem"`, disabled: `aria-disabled="true"`
- Keyboard: Shift+F10 or context menu key to open, Arrow keys navigate, Enter selects, Escape closes, Arrow Right opens submenu, Arrow Left closes submenu
- Focus: first item focused on open; focus returns to trigger on close

**Responsive:** Desktop: at cursor. Mobile: long-press → bottom sheet (not a small floating menu).

### Kebab / Meatball Action Menu

**Use for:** Every entity with actions beyond its primary click — list items, cards, table rows.

**Pattern:**
- ⋮ (vertical kebab for rows/lists) or ⋯ (horizontal meatball for cards/headers)
- Click opens Radix DropdownMenu (via shadcn/ui)
- Items: icon + label + optional shortcut hint
- Destructive actions: last in list, danger text color, divider above

**Accessibility:**
- Button: `aria-label="Actions for [item name]"`, `aria-haspopup="true"`, `aria-expanded`
- Menu: `role="menu"` — automatic via Radix DropdownMenu with full keyboard navigation

---

## Notification Systems

### Notification Architecture Decision Tree

```
What type of notification?
  → Action feedback (save, delete, error): Toast — ephemeral, non-persistent
  → Asynchronous event (new message, assignment, system alert): In-app notification — persistent, stored
  → Critical system alert (maintenance, security breach): Banner — persistent bar until dismissed or resolved
```

### Notification Center

**Pattern:**
- Trigger: bell icon in header with unread count badge
- Panel: dropdown or slide-over, newest-first
- Each item: type icon, title, description, timestamp, read/unread state
- Click notification: navigate to relevant entity + mark as read
- Actions: "Mark all as read", per-item "Mark as read" / "Delete" / "Mute"
- Grouping: "5 new comments on [project]" instead of 5 separate items
- Empty: "No new notifications" with illustration

**Notification preferences:**
- Settings page: per-channel (email, push, in-app) × per-type (comments, assignments, system)
- Toggle matrix pattern (switch per cell)
- Per-entity mute: context menu option on specific items

**Accessibility:**
- Bell button: `aria-label="Notifications, N unread"`
- Panel: `role="dialog"` with `aria-label="Notifications"`
- List: `role="list"` with each item `role="listitem"`
- Unread items: `aria-label="Unread: [notification title]"`
- Live badge: `aria-live="polite"` — announce new notifications while panel is closed

**Responsive:**
- Desktop: dropdown panel (360-400px wide)
- Mobile: full-screen notification page or bottom sheet

### Banner Notifications

**Use for:** System-wide announcements — scheduled maintenance, critical alerts, new feature announcements.

**Pattern:**
- Fixed bar at top of page (above navigation)
- Severity colors: info (neutral), warning (amber), critical (red)
- Content: message + optional action link
- Dismissible with × — persist dismissal in `localStorage`
- Expiry: auto-remove after the event end date

**Accessibility:**
- Critical: `role="alert"` (assertive); informational: `role="status"`
- Dismiss: `aria-label="Dismiss notification"`
- Never auto-dismiss critical banners

---

## Error Recovery

### Error Recovery Decision Tree

```
What kind of error?
  → Network error (timeout, request failed): Retry with exponential backoff (auto for background), retry button for user actions
  → Validation error (server rejected input): Inline field-level errors — user corrects and resubmits
  → Auth error (session expired, 401): Session expiry flow (below)
  → Server error (500, service unavailable): Error boundary with "Try again" button
  → Conflict error (concurrent edit): Conflict resolution UI
```

### Retry Pattern

**TanStack Query (background queries):**
```ts
useQuery({
  queryKey,
  queryFn,
  retry: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000), // up to 30s
})
```

**Manual retry:**
- Error message: user-friendly ("Couldn't load your projects") — never raw error codes
- "Try again" button — re-executes the failed action
- After repeated failures: "If this keeps happening, try refreshing or contact support"

**Anti-patterns:**
- ❌ Silent failure — user doesn't know something went wrong
- ❌ Infinite auto-retry — wastes resources, may appear as an attack
- ❌ Technical error messages — "ECONNREFUSED" means nothing to users

### Session Expiry

**Pattern:**
- Detect: 401 response on any API call
- Pre-expiry warning (optional): "Your session expires in 5 minutes" toast + "Extend session" action
- Post-expiry: modal overlay: "Your session has expired. Please sign in again."
  - "Sign in" button: redirect to login preserving current URL as `?returnTo=/current/page`
  - Don't silently redirect — modal explains why and lets the user act
- Preserve draft data: store in `sessionStorage` before redirect → restore after re-authentication

**Accessibility:**
- Expiry modal: `role="alertdialog"` — urgent, focus trapped
- Pre-expiry toast: standard with "Extend" action button

### Auto-Save & Recovery

**Use for:** Long forms, content editors, complex configuration — anywhere losing work would frustrate the user.

**Pattern:**
- Auto-save every 30-60 seconds when changes are detected (not continuously)
- Status indicator: "Saved" / "Saving..." / "Unsaved changes" — near form title or in top bar, always visible
- Recovery on page load:
  1. Check for auto-saved draft in `localStorage` or server-side
  2. If found: banner — "You have unsaved changes from [time]. Restore or discard?"
  3. Restore: populate form with draft; Discard: clear draft, show fresh data

**Accessibility:**
- Status: `role="status"` with `aria-live="polite"` — announces "Saved" / "Saving"
- Recovery banner: `role="alert"` with Restore/Discard buttons

**State:** `localStorage` + Zustand persist for client-only drafts; server-side for collaborative tools.

### Offline State

**Use for:** PWAs and mobile-focused apps. Not for admin panels that are meaningless without fresh data.

**Pattern:**
- Detect: `navigator.onLine` + `online`/`offline` events
- Offline banner: "You're offline. Changes will be saved when you reconnect." — persistent, non-dismissible
- Queue mutations performed offline
- Sync on reconnect: play back queue, resolve conflicts
- Stale indicator: "Last synced: 5 minutes ago"

**Accessibility:**
- Banner: `role="alert"` — announced immediately

---

## Keyboard Shortcuts

### Shortcut Scope Decision Tree

```
Where does the shortcut apply?
  → Everywhere in the app (global):
    → Register on document level
    → Examples: ⌘K (command palette), ⌘/ (shortcuts help), Escape (close overlay)
  → Within a specific view/page:
    → Register on page component level, clean up on unmount
    → Examples: N (new item), E (edit selected), D (delete)
  → Within a specific component (editor, table):
    → Register on component level, active only when focused
    → Examples: ⌘B (bold in editor), ⌘Enter (submit form)
```

### Platform Keys

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Primary | ⌘ (Command) | Ctrl |
| Secondary | ⌥ (Option) | Alt |

- Detect: `event.metaKey` (Mac) vs `event.ctrlKey` (Windows/Linux)
- Platform detect: `navigator.platform` or `navigator.userAgent`
- Display with `<kbd>` elements: `<kbd>⌘</kbd><kbd>K</kbd>` on Mac, `<kbd>Ctrl</kbd><kbd>K</kbd>` on Windows

### Shortcut Discovery

**Use when:** The application has 5+ keyboard shortcuts.

**Pattern:**
- Help modal: triggered by `?` (Shift+/) or ⌘/
- Shortcuts grouped by category: Navigation, Actions, Editor
- Inline hints: shortcut next to action in menus and tooltips — "Delete ⌫"
- First-use tip: toast/tooltip after user clicks a button that has a shortcut — "Tip: Press N to create a new item"

**Accessibility:**
- Help modal: `role="dialog"` with `aria-label="Keyboard shortcuts"`
- Shortcut keys: `<kbd>` elements for proper semantics
- Shortcut list: `<dl>` or `<table>` for structured display

### Shortcut Conflict Prevention

| Priority | Layer | Rule |
|----------|-------|------|
| 1 (highest) | Browser/OS: ⌘C, ⌘V, ⌘T, ⌘W | **NEVER** override — sacrosanct |
| 2 | App global: ⌘K, ⌘/, Escape | Override only if app provides the canonical behavior |
| 3 | View-level: N, E, D (single letter) | Active only when no input is focused |
| 4 (lowest) | Component-level: ⌘B, ⌘Enter | Active only within the focused component |

**Single-letter shortcuts (N, E, D):**
```ts
const isInputFocused =
  ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName ?? '') ||
  document.activeElement?.getAttribute('contenteditable') === 'true'
// Only fire shortcut when !isInputFocused
```

**Anti-patterns:**
- ❌ Overriding ⌘C/⌘V/⌘T/⌘W — breaks OS-level expectations
- ❌ Single-letter shortcuts firing while typing in an input
- ❌ Shortcuts with zero discoverability
- ❌ Different shortcut for same action on different pages
- ❌ More than 20 shortcuts — cognitive overload

---

## Anti-Patterns

| Area | ❌ Don't | ✅ Do |
|------|----------|-------|
| Notifications | Count that never clears | Mark read on click + "Mark all as read" |
| Notifications | Desktop push without opt-in | Always request permission with value explanation |
| Notifications | Notification for every minor event | Group similar; respect user preferences |
| Error recovery | Silent failure | Always surface error with retry option |
| Sessions | Silent redirect on 401 | Modal explaining expiry + sign-in CTA preserving `returnTo` |
| Keyboard | Override ⌘C/⌘V/⌘T/⌘W | Never override browser/OS shortcuts |
| Context menus | Right-click as the only action path | Always pair with visible kebab button |
