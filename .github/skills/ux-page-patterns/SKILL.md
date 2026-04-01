---
name: ux-page-patterns
description: >-
  Page-level UX patterns — cookie consent / privacy banners (GDPR/CCPA decision tree, granular
  consent toggles, no-dark-patterns rule, banner ARIA and focus), View Transitions API
  (shared-element vs crossfade decision tree, Next.js experimental support, progressive enhancement,
  relationship to Framer Motion). Includes anti-patterns. Use when implementing cookie consent
  banners, GDPR/CCPA privacy flows, page transition animations, or choosing between View Transitions
  and Framer Motion for route changes.
---

# UX — Page-Level Patterns

**Compiled from**: ADR-0024 §8 (Page-Level Patterns), §7 Page-Level Anti-Patterns
**Last synced**: 2026-03-21

---

## 8.1 Cookie Consent / Privacy Banners

**Use:** Any site that uses cookies, analytics, or tracking subject to GDPR, ePrivacy, CCPA, or similar privacy regulations.
**Don't use:** Sites with zero cookies and zero tracking.

- **Banner position:** Bottom of viewport (most common) or top. Fixed position, overlays content but doesn't block it.
- **Timing:** Show on first visit when no consent is stored. Don't show again after user decides.
- **Options (minimum):** "Accept All" (primary CTA) + "Reject All" / "Manage Preferences" (secondary)
- **Granular consent (recommended):** Separate toggles — Essential (always on), Analytics, Marketing, Functional
- **Persistence:** Store consent in a cookie or `localStorage`. Check before loading any non-essential scripts.
- **No dark patterns:** "Reject All" must be as easy as "Accept All" — same visual weight, same number of clicks. Don't hide rejection behind nested modals.

#### Decision Tree — Consent Complexity

```
Does the site operate in the EU or target EU users?
  → YES: Full GDPR consent banner — Accept All, Reject All, Manage Preferences (granular toggles)
  → NO: Does it operate in California or target California users?
    → YES: CCPA notice — "Do Not Sell My Personal Information" link + opt-out mechanism
    → NO: Does the site use analytics or third-party cookies?
      → YES: Simple consent banner — Accept / Decline
      → NO: No banner needed
```

**Accessibility:**

- Banner: `role="dialog"` with `aria-label="Cookie consent"` — or `role="alertdialog"` if blocking
- Do NOT auto-focus the banner on page load — it interrupts screen reader users. Let it sit as a landmark. Consider a skip-past link.
- Buttons: full keyboard access, visible focus rings
- Preferences modal: focus trap when open, Escape to close (standard dialog pattern per §6.1 from `ux-focus-keyboard`)
- `aria-live` is not needed — the banner is present on load, not dynamically injected

**Responsive:**

- Desktop: fixed bottom bar, 1–2 rows, buttons side-by-side
- Mobile: fixed bottom bar, buttons stacked vertically. CTA buttons meet touch target size (§5.1 from `ux-responsive`)
- Don't cover >30% of viewport — compress to a minimal bar with "Manage" expansion if needed

---

## 8.2 View Transitions API

**Use:** Page-to-page navigation where visual continuity improves UX — shared elements between pages, page crossfades, route changes.
**Don't use:** Sites that don't need route transitions. Heavy use on low-powered mobile. When the transition delays perceived speed.

- Use native View Transitions API (`document.startViewTransition()`) for cross-document and same-document transitions
- Next.js: experimental support via `next.config.js` → `experimental.viewTransition: true` (check current version support)
- Fallback: if API not supported, navigation proceeds normally — progressive enhancement
- Shared element transitions: assign `view-transition-name` CSS property to elements that should animate between pages

#### Decision Tree — View Transition Type

```
Is there a shared visual element between source and destination page?
  → YES: Shared element transition — matching `view-transition-name` on both pages
      (e.g., thumbnail → hero image, card → detail page)
  → NO: Is a crossfade between pages desirable?
    → YES: Default crossfade — ::view-transition-old fades out, ::view-transition-new fades in
    → NO: Instant navigation — no transition
```

**Accessibility:**

- `prefers-reduced-motion: reduce` — disable or simplify transitions (crossfade only, no movement)
- Transitions must not delay content accessibility — screen readers announce the new page immediately
- Keep transitions short (200–350ms) to avoid blocking interaction

**Responsive:**

- Same transitions on all breakpoints, but consider disabling complex shared-element transitions on mobile if they cause jank
- Test on low-end devices — transitions below 30fps should be simplified or removed

**Browser support:** Chrome/Edge 111+, Safari 18+. Firefox in progress. Always feature-detect with `document.startViewTransition` before use.

**View Transitions vs Framer Motion:** View Transitions are CSS/browser-native and complement Framer Motion. Use View Transitions for page-level route changes. Use Framer Motion for within-page animations (scroll, viewport reveals, presence). Don't use both for the same transition.

---

## Anti-Patterns

| ❌ Don't                                                       | ✅ Do                                                              | Why                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| Load analytics scripts before cookie consent                   | Gate non-essential scripts behind consent check                    | GDPR violation — scripts run before user consents   |
| Make "Reject All" harder to find than "Accept All"             | Same visual weight, same number of clicks for both options         | Dark pattern — may violate GDPR, erodes user trust  |
| Pre-checked consent boxes                                      | Require affirmative opt-in (GDPR)                                  | Not legal under GDPR                                |
| Cookie wall blocking all content until consent                 | Allow content access; banner overlays but doesn't block            | Not legal under GDPR guidance for most sites        |
| Use View Transitions without feature detection                 | Feature-detect `document.startViewTransition` as progressive enhancement | Breaks navigation in unsupported browsers           |
| Use both View Transitions and Framer Motion for the same change | View Transitions for route changes, Framer Motion for within-page | Competing animations cause visual conflicts         |
