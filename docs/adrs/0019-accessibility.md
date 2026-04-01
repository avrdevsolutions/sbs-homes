# ADR-0019: Accessibility (a11y)

**Status**: Accepted
**Date**: 2026-03-27
**Supersedes**: N/A (updates the original 2026-02-27 version — WCAG 2.1 → 2.2)

---

## Context

Accessibility is not optional — it's a legal requirement in many jurisdictions (EU European Accessibility Act 2025, US ADA/Section 508, Canada AODA) and an ethical obligation. Approximately 15% of the global population lives with some form of disability. Beyond compliance, accessible websites serve more users, have better SEO (semantic HTML helps crawlers), and generally have better UX for everyone (keyboard navigation, clear focus states, readable text).

**WCAG 2.2 became a W3C Recommendation in October 2023** and is now the legally referenced version for the EU EAA 2025. It adds 9 new success criteria (6 at Level A/AA) addressing focus visibility, target sizing, dragging alternatives, redundant entry, and accessible authentication — all directly relevant to modern web applications. This ADR targets **WCAG 2.2**, not 2.1.

ADR-0004 (Components) covers component-level accessibility requirements (ARIA attributes, keyboard navigation, focus management). ADRs 0024-0027 cover pattern-level accessibility (per-component ARIA roles, focus management, and reduced motion). This ADR defines the **project-wide accessibility strategy** — standards, testing approach, audit process, post-pipeline audit protocol, cognitive accessibility, and the tools that enforce it.

## Decision

**WCAG 2.2 Level AA compliance as the minimum standard. Semantic HTML as the foundation. Automated testing with axe-core (WCAG 2.2 tags). Playwright E2E accessibility scanning. Manual keyboard testing for all interactive features. Post-pipeline accessibility audit gate after FEO and animation are complete. Accessibility audits before every major launch.**

---

## WCAG 2.2 Level AA — What It Means

WCAG (Web Content Accessibility Guidelines) defines three conformance levels:

| Level   | What It Requires                                                                                                                                                      | Our Target                  |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **A**   | Bare minimum — alt text, keyboard access, no seizure triggers, redundant entry auto-populate                                                                          | ✅ Included                 |
| **AA**  | Good accessibility — color contrast, resize text, focus visible, focus not obscured, target size ≥ 24px, dragging alternatives, accessible auth, error identification | ✅ **Our standard**         |
| **AAA** | Enhanced — sign language, extended audio description, stricter contrast, focus appearance (size + contrast)                                                           | Not required (nice-to-have) |

### The Four Principles (POUR)

Every page must be:

1. **Perceivable** — Users can perceive the content (see it, hear it, feel it)
   - Images have alt text
   - Videos have captions
   - Color is not the only way to convey information
   - Text has sufficient contrast

2. **Operable** — Users can interact with the interface
   - Everything is keyboard accessible
   - Users have enough time
   - Content doesn't cause seizures
   - Navigation is clear
   - Focused elements are not obscured by sticky UI
   - Touch targets meet minimum size
   - Dragging has single-pointer alternatives

3. **Understandable** — Users can understand the content and interface
   - Text is readable
   - Pages behave predictably
   - Errors are identified and described
   - Previously entered information is auto-populated (redundant entry)
   - Authentication doesn't require cognitive function tests

4. **Robust** — Content works across technologies
   - Valid HTML
   - ARIA used correctly
   - Works with assistive technologies

---

## WCAG 2.2 New Success Criteria

These criteria are **new in WCAG 2.2** and did not exist in 2.1. All Level A/AA criteria are mandatory for this project.

### 2.4.11 Focus Not Obscured (Minimum) — Level AA

When an element receives keyboard focus, it must not be **entirely** hidden by author-created content (e.g., sticky headers, cookie banners, floating panels).

| Risk in This Project                                                                      | Mitigation                                                                                                                           |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `ScrollAwareHeader` is `fixed inset-x-0 top-0 z-50` — can cover focused elements below it | Account for header height in scroll-to-section offsets (see ADR-0027 scroll behavior). Ensure `scroll-margin-top` on anchor targets. |
| `CookieConsent` banner is fixed at the bottom                                             | Banner must not cover focusable elements. If it does, use `scroll-padding-bottom` or reposition content.                             |
| Sonner toast stack                                                                        | Toasts should appear at the top-right or top-center, not covering the primary content focus area.                                    |

**Rule:** Sticky/fixed elements (e.g., headers, banners, floating CTAs) **MUST NOT** entirely obscure the focused element. Use `scroll-margin-top`/`scroll-padding-top` to account for fixed header height.

### 2.5.7 Dragging Movements — Level AA

Any functionality that uses dragging must provide a **single-pointer alternative** that does not require dragging.

| Pattern                  | Alternative Required                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Sortable lists (dnd-kit) | Move up/down buttons or keyboard Arrow keys (dnd-kit keyboard sensor — already required by ADR-0027) |
| Kanban board column drag | Keyboard sensor + move-to-column dropdown                                                            |
| Slider / range input     | Native `<input type="range">` (inherently keyboard accessible) or increment/decrement buttons        |
| File drop zone           | File `<input type="file">` always present alongside drop zone                                        |

**Rule:** Every draggable interaction **MUST** have a non-dragging alternative. dnd-kit with keyboard sensor enabled satisfies this requirement (per ADR-0027).

### 2.5.8 Target Size (Minimum) — Level AA

Interactive targets must be at least **24 × 24 CSS pixels**, or have sufficient spacing so the unobscured target area is at least 24 × 24 px.

| Exception                 | When It Applies                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------- |
| **Inline links**          | Links within a sentence or paragraph are exempt                                       |
| **User-agent controlled** | Browser default controls (e.g., `<select>`) are exempt                                |
| **Essential**             | Size is legally required or the size is essential to the information (e.g., map pins) |

**Rule:** All interactive elements (buttons, links outside of prose, form controls, icon buttons) **MUST** meet the 24 × 24 px minimum. Target 44 × 44 px for common touch targets. Use the pseudo-element tap area extension technique when the visual element is smaller than 24 px (see ADR-0024 responsive interaction patterns).

### 3.3.7 Redundant Entry — Level A

When a user has already entered information in a process (e.g., multi-step form), that information must be **auto-populated** or **available for selection** — the user must not have to re-enter it.

| Pattern                           | Implementation                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| Multi-step wizard (ADR-0012/0026) | Single RHF form instance across steps — previously entered values persist automatically |
| Shipping → billing address        | "Same as shipping" checkbox pre-checked                                                 |
| Profile data in forms             | Pre-fill from user context when available                                               |

**Exceptions:** Security re-authentication (e.g., re-entering password for sensitive actions) and content that has been invalidated.

**Rule:** Multi-step forms **MUST** retain previously entered data. Never require the user to re-type information already provided in the same session.

### 3.3.8 Accessible Authentication (Minimum) — Level AA

Authentication steps **MUST NOT** rely on cognitive function tests (e.g., remembering a password, solving a puzzle, performing a calculation) unless at least one of these is true:

- An **alternative** authentication method is available that doesn't rely on a cognitive test
- A **mechanism** helps the user complete the test (e.g., password manager, copy-paste allowed)
- The test is **object recognition** (e.g., "select all images with traffic lights")
- The test uses **personal content** the user provided (e.g., selecting their uploaded photo)

| Rule                                                                      | Level                      |
| ------------------------------------------------------------------------- | -------------------------- |
| Never block password paste (allow password managers)                      | **MUST**                   |
| CAPTCHAs must have an alternative (e.g., audio CAPTCHA, checkbox CAPTCHA) | **MUST**                   |
| OAuth/social login counts as an alternative method                        | ✅ Satisfies the criterion |
| Email magic links count as an alternative method                          | ✅ Satisfies the criterion |

**Rule:** Authentication flows (when implemented — ADR-0010) **MUST** allow password paste and provide alternative methods beyond cognitive recall. Never use `autocomplete="off"` on password fields.

### 4.1.1 Parsing — Removed in WCAG 2.2

**This criterion was removed** because modern HTML parsers handle malformed markup consistently. No action needed — but continue writing valid HTML as a best practice.

---

## Rules

### Semantic HTML (Foundation)

| Rule                                                                                      | Level      |
| ----------------------------------------------------------------------------------------- | ---------- |
| Use `<main>` for primary content (one per page)                                           | **MUST**   |
| Use `<nav>` for navigation regions (with `aria-label` if multiple)                        | **MUST**   |
| Use `<header>` and `<footer>` for page/section headers and footers                        | **MUST**   |
| Use `<article>` for independent content (e.g., blog posts, cards)                         | **SHOULD** |
| Use `<section>` with a heading for thematic grouping                                      | **SHOULD** |
| Use `<button>` for actions, `<a>` for navigation — never `<div>` for interactive elements | **MUST**   |
| Headings follow hierarchy (h1 → h2 → h3, no skips)                                        | **MUST**   |
| One `<h1>` per page matching the page topic                                               | **MUST**   |
| Use `<ul>`/`<ol>` for lists, `<table>` for tabular data                                   | **SHOULD** |
| Don't use `<div>` or `<span>` when a semantic element exists                              | **SHOULD** |

### Keyboard Navigation

| Rule                                                                                                                                                                 | Level        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| All interactive elements reachable via Tab key                                                                                                                       | **MUST**     |
| Navigation MUST be accessible on all screen sizes — hiding nav links on mobile (e.g., `hidden lg:flex`) without an alternative (hamburger menu, drawer) is forbidden | **MUST**     |
| Focus order follows visual order (no `tabIndex` > 0 hacks)                                                                                                           | **MUST**     |
| Focus is visible — `focus-visible:ring-2 focus-visible:ring-primary-500` (or project tokens equivalent) on all interactive elements                                  | **MUST**     |
| Focused elements not entirely obscured by sticky/fixed UI (WCAG 2.4.11)                                                                                              | **MUST**     |
| Modals/dialogs trap focus (Tab cycles within, Escape closes)                                                                                                         | **MUST**     |
| Dropdown menus navigable with Arrow keys                                                                                                                             | **MUST**     |
| Custom interactive components respond to Enter and Space                                                                                                             | **MUST**     |
| Skip to main content link as first focusable element                                                                                                                 | **SHOULD**   |
| Don't remove focus outline (`outline: none`) without a visible alternative                                                                                           | **MUST NOT** |

### Color & Contrast

| Rule                                                                                      | Level         |
| ----------------------------------------------------------------------------------------- | ------------- |
| Normal text: contrast ratio ≥ 4.5:1 against background                                    | **MUST** (AA) |
| Large text (≥18px bold or ≥24px regular): contrast ratio ≥ 3:1                            | **MUST** (AA) |
| UI components and graphical objects: contrast ratio ≥ 3:1                                 | **MUST** (AA) |
| Don't use color alone to convey information (add icons, text, patterns, among other cues) | **MUST**      |
| Error states use color + text label + icon (not color alone)                              | **MUST**      |
| Links are distinguishable from surrounding text (underline or other visual cue + color)   | **SHOULD**    |
| Verify contrast in all interactive states — hover, focus, active, disabled, error         | **MUST**      |
| Verify contrast on animated/parallax backgrounds where text overlays moving content       | **MUST**      |

### Target Size (WCAG 2.5.8)

| Rule                                                                                                            | Level         |
| --------------------------------------------------------------------------------------------------------------- | ------------- |
| All interactive elements (e.g., buttons, links outside prose, form controls) meet 24 × 24 CSS px minimum target | **MUST** (AA) |
| Target 44 × 44 CSS px for primary actions and common touch targets                                              | **SHOULD**    |
| Use pseudo-element tap area extension when the visual element is smaller than 24 px                             | **SHOULD**    |
| Inline links within sentences are exempt from target size requirements                                          | N/A           |

### Images & Media

| Rule                                                                         | Level      |
| ---------------------------------------------------------------------------- | ---------- |
| All `<img>` / `<Image>` have descriptive `alt` text                          | **MUST**   |
| Decorative images have `alt=""` (empty alt, not missing alt)                 | **MUST**   |
| Icons inside buttons: `aria-hidden="true"` on icon, `aria-label` on button   | **MUST**   |
| Complex images (e.g., charts, infographics): provide text alternative nearby | **SHOULD** |
| Videos have captions or transcripts                                          | **SHOULD** |
| Audio-only content has a transcript                                          | **SHOULD** |

### Forms (Cross-Reference ADR-0012)

| Rule                                                                                  | Level      |
| ------------------------------------------------------------------------------------- | ---------- |
| Every input has a visible `<label>` connected via `htmlFor`                           | **MUST**   |
| Error messages connected via `aria-describedby`                                       | **MUST**   |
| Invalid fields have `aria-invalid="true"`                                             | **MUST**   |
| Required fields have `aria-required="true"` or HTML `required`                        | **MUST**   |
| Form-level error summaries use `role="alert"`                                         | **MUST**   |
| Group related fields with `<fieldset>` and `<legend>`                                 | **SHOULD** |
| Multi-step forms retain previously entered data — never require re-entry (WCAG 3.3.7) | **MUST**   |
| Never block paste on password fields — allow password managers (WCAG 3.3.8)           | **MUST**   |
| Never use `autocomplete="off"` on password or personal-data fields                    | **MUST**   |

### ARIA (Use Sparingly)

| Rule                                                                                                    | Level        |
| ------------------------------------------------------------------------------------------------------- | ------------ |
| First rule of ARIA: don't use ARIA if a native HTML element works                                       | **MUST**     |
| If ARIA is needed, use established patterns from WAI-ARIA Authoring Practices                           | **MUST**     |
| Don't use `role="button"` on a `<div>` — use `<button>`                                                 | **MUST NOT** |
| Custom widgets must have correct `role`, `aria-expanded`, `aria-selected`, etc.                         | **MUST**     |
| Live regions (`aria-live`) for dynamic content updates (e.g., toasts, loading states, animated reveals) | **SHOULD**   |
| `aria-label` for elements with no visible text (e.g., icon buttons, close buttons)                      | **MUST**     |
| `aria-hidden="true"` for decorative elements that shouldn't be announced                                | **SHOULD**   |

### Motion & Animation (Cross-Reference ADR-0003, ADR-0027 §14)

| Rule                                                                                                                                                      | Level    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Respect `prefers-reduced-motion` — use `useMotionEnabled()` from `@/lib/motion` in every animated component                                               | **MUST** |
| Provide static or simplified alternative when motion is disabled (per-component decision table in ADR-0027 §14)                                           | **MUST** |
| No flashing content (more than 3 flashes per second)                                                                                                      | **MUST** |
| Animations must not be the only way to convey information                                                                                                 | **MUST** |
| Carousel autoplay **MUST** be disabled when `prefers-reduced-motion: reduce` is active                                                                    | **MUST** |
| Carousel slide transitions snap instantly under reduced motion — no slide animation                                                                       | **MUST** |
| Drag-and-drop settle animations snap to position under reduced motion                                                                                     | **MUST** |
| CSS-first reduced motion for Radix `data-state` animations (blanket `animation-duration: 0.01ms !important` in `@media (prefers-reduced-motion: reduce)`) | **MUST** |
| JS-gated reduced motion for Framer Motion and Embla autoplay via `useMotionEnabled()`                                                                     | **MUST** |

### Dragging Movements (WCAG 2.5.7)

| Rule                                                                                                          | Level         |
| ------------------------------------------------------------------------------------------------------------- | ------------- |
| Every drag interaction has a single-pointer alternative (e.g., dnd-kit keyboard sensor, move up/down buttons) | **MUST** (AA) |
| Sortable lists provide keyboard reordering (Space to grab, Arrow to move, Space to drop)                      | **MUST**      |
| File drop zones always include a visible `<input type="file">` fallback                                       | **MUST**      |

### Cognitive Accessibility

Cognitive accessibility addresses users with cognitive, learning, or neurological disabilities. The EU EAA 2025 explicitly references these users. These rules also improve UX for all users.

| Rule                                                                                                    | Level      |
| ------------------------------------------------------------------------------------------------------- | ---------- |
| Use plain, direct language — avoid jargon, idioms, or unnecessarily complex words                       | **SHOULD** |
| Navigation structure is consistent across pages — same elements in the same relative order (WCAG 3.2.3) | **MUST**   |
| Pages behave predictably — no surprise context changes on focus or input (WCAG 3.2.1, 3.2.2)            | **MUST**   |
| Error messages explain what went wrong and how to fix it (not just "Invalid input")                     | **MUST**   |
| Provide instructions or hints for complex inputs (e.g., expected format for date, phone)                | **SHOULD** |
| Sufficient time — if a session timeout exists, warn users before it expires and allow extension         | **SHOULD** |
| Support browser zoom to 200% without content loss or overlap                                            | **MUST**   |

---

## Implementation

### Skip to Main Content Link

```tsx
// src/components/layout/skip-nav/SkipNav.tsx
export const SkipNav = () => (
  <a
    href='#main-content'
    className='focus:bg-primary-600 sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:text-white'
  >
    Skip to main content
  </a>
)

// src/app/layout.tsx
import { SkipNav } from '@/components/layout/skip-nav'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lang-depends-on-project"en'>
      <body>
        <SkipNav />
        <Header />
        <main id='main-content'>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

### Responsive Navigation

Navigation links that are `hidden` on mobile with no alternative make the site completely unusable for mobile visitors — who are often **the majority of traffic**. This is a critical accessibility failure.

```tsx
// ❌ Forbidden — mobile users have no navigation
const Navbar = () => (
  <header>
    <nav>
      <Logo />
      <div className='hidden lg:flex lg:gap-8'>
        {NAV_LINKS.map(({ label, href }) => (
          <a key={label} href={href}>
            {label}
          </a>
        ))}
      </div>
      <Button>CTA</Button>
    </nav>
  </header>
)

// ✅ Correct — mobile toggle + desktop nav
;('use client')

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header>
      <nav aria-label='Main navigation'>
        <Logo />

        {/* Desktop nav — hidden on mobile */}
        <div className='hidden lg:flex lg:gap-8'>
          {NAV_LINKS.map(({ label, href }) => (
            <a key={label} href={href}>
              {label}
            </a>
          ))}
        </div>

        {/* Mobile toggle — hidden on desktop */}
        <button
          className='lg:hidden'
          aria-expanded={isOpen}
          aria-controls='mobile-nav'
          aria-label='Menu'
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <XIcon aria-hidden='true' /> : <MenuIcon aria-hidden='true' />}
        </button>

        <Button>CTA</Button>
      </nav>

      {/* Mobile nav panel */}
      {isOpen && (
        <nav id='mobile-nav' className='lg:hidden' aria-label='Mobile navigation'>
          {NAV_LINKS.map(({ label, href }) => (
            <a key={label} href={href} onClick={() => setIsOpen(false)}>
              {label}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}
```

**Key requirements for mobile navigation:**

- Toggle button has `aria-expanded`, `aria-controls`, and `aria-label`
- Mobile nav links close the menu on click (`onClick={() => setIsOpen(false)}`)
- Desktop nav and mobile nav share the same link data (single source of truth)
- Focus management: when menu opens, first link should receive focus (SHOULD)

### Focus Trap for Modals

If using shadcn/ui Dialog (built on Radix), focus trapping is automatic. For custom modals:

```tsx
// Focus trap pattern — Tab cycles within the modal
'use client'

import { useEffect, useRef } from 'react'

export const useFocusTrap = (isOpen: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element when modal opens
    firstElement?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
      if (e.key === 'Escape') {
        // Close modal — parent should handle this
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return containerRef
}
```

### Accessible Error States

```tsx
// ✅ Error state that works for everyone
<div>
  <label htmlFor='email' className='text-sm font-medium'>
    Email
    <span className='text-error-500 ml-0.5' aria-hidden='true'>
      *
    </span>
  </label>
  <input
    id='email'
    type='email'
    aria-invalid={!!error}
    aria-describedby={error ? 'email-error' : undefined}
    aria-required='true'
    className={cn('rounded-md border px-3 py-2', error ? 'border-error-500' : 'border-primary-200')}
  />
  {error && (
    <p id='email-error' className='text-error-600 flex items-center gap-1 text-sm' role='alert'>
      <AlertCircle className='h-4 w-4' aria-hidden='true' />
      {error}
    </p>
  )}
</div>
```

Note: Error uses **red color + text message + icon** — three signals, not just color.

### Accessible Loading States

```tsx
// ✅ Loading state announced to screen readers
<button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? (
    <>
      <Spinner className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>Saving...</span>
    </>
  ) : (
    'Save'
  )}
</button>

// ✅ Loading content area with live region
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? <Skeleton /> : <Content />}
</div>
```

---

## Post-Pipeline Accessibility Audit

The accessibility agent runs **after** the FEO pipeline (component build) and animation pipeline are complete. This section defines the audit protocol — what to verify and in what order.

### When to Run

The accessibility audit is a **gate** — it runs after:

1. FEO pipeline: component structure, styling, and content are finalized
2. Animation pipeline: scroll-driven animations, viewport reveals, transitions, and reduced motion gates are implemented

The audit verifies that the completed implementation meets all accessibility requirements without introducing regressions.

### Audit Checklist

#### 1. Semantic Structure Audit

- [ ] One `<h1>` per page, heading hierarchy has no skips
- [ ] `<main id="main-content">` wraps primary content
- [ ] All `<nav>` regions have `aria-label`
- [ ] `<button>` used for actions, `<a>` for navigation — no `<div>` for interactive elements
- [ ] Skip to main content link is the first focusable element

#### 2. Focus Management Audit (Post-Animation)

- [ ] Tab through the entire page — focus visits all interactive elements in visual order
- [ ] Focus ring is visible on every focused element (no `outline: none` without alternative)
- [ ] Focused elements are **not obscured** by the sticky header, cookie banner, or floating panels (WCAG 2.4.11)
- [ ] `scroll-margin-top` is set on anchor targets to account for fixed header height
- [ ] When `AnimatePresence` removes an element, focus returns to a logical target (the trigger, the previous element, or the parent container)
- [ ] When animated content enters the viewport (e.g., `MotionInView`), it does not steal focus or disrupt tab order
- [ ] Overlay open → focus moves to overlay; overlay close → focus returns to trigger element
- [ ] Focus traps in modals/sheets are provided by Radix — no manual focus trap on Radix overlays

#### 3. Reduced Motion Compliance Audit

Verify each animated component against the per-component decision table (ADR-0027 §14):

| Component Type                                       | Expected Behavior Under Reduced Motion                             |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Dialog / Sheet enter/exit                            | Fade-only — no slide or scale                                      |
| Carousel autoplay                                    | **Disabled entirely**                                              |
| Carousel slide transition                            | Snap instantly — no slide animation                                |
| DnD settle animation                                 | Snap to position — no spring/ease                                  |
| Toast enter/exit                                     | Fade-only — no slide from edge                                     |
| Tab panel switch                                     | Instant switch — no crossfade                                      |
| Accordion expand/collapse                            | Instant expand — no height animation                               |
| Scroll-to-section                                    | `scroll-behavior: auto` — instant jump                             |
| Command palette open/close                           | Fade-only — no scale or slide                                      |
| Loading spinner                                      | **Keep** — functional; simplify to opacity pulse if using rotation |
| Viewport reveal (`MotionInView`)                     | Content renders in final position — no entrance animation          |
| Parallax sections (`MotionBox`, `MotionSectionItem`) | Static position — no scroll-driven movement                        |

**How to test:** Enable `prefers-reduced-motion: reduce` in browser dev tools (Chrome: Rendering → Emulate CSS media feature), then navigate the complete page. Every animation should either be absent or simplified to fade-only.

#### 4. ARIA & Live Region Audit

- [ ] Toasts use `role="status"` (success) or `role="alert"` (error) — verified via Sonner configuration
- [ ] Loading states use `aria-busy="true"` on the container and `aria-live="polite"` for the region
- [ ] Dynamically loaded content (e.g., infinite scroll, search results) announces updates via `aria-live="polite"`
- [ ] Icon-only buttons have `aria-label`; icons have `aria-hidden="true"`
- [ ] Toggle buttons use `aria-expanded` and `aria-controls`
- [ ] Tabs use `role="tablist"` / `role="tab"` / `role="tabpanel"` (Radix Tabs provides this automatically)
- [ ] Data tables have `<caption>` (or `aria-label`), `<th scope>` for headers, and `aria-sort` on sortable columns

#### 5. Color & Contrast Audit

- [ ] Run browser contrast checker on all text against its background
- [ ] Check contrast on all interactive states: default, hover, focus, active, disabled, error
- [ ] Check contrast on sections with animated backgrounds (e.g., parallax sections with color gradients where text overlays moving content)
- [ ] Error states use 3 signals: color + text + icon

#### 6. Target Size Audit

- [ ] All buttons, links (outside prose), and form controls meet 24 × 24 CSS px minimum
- [ ] Navigation items on mobile meet 44 × 44 CSS px tap target
- [ ] Icon-only buttons use padding or pseudo-element to meet minimum target size

#### 7. Content & Cognitive Audit

- [ ] Error messages explain what went wrong and how to fix it
- [ ] Navigation structure is consistent across pages
- [ ] All images have appropriate `alt` text (descriptive for meaningful, empty for decorative)
- [ ] Multi-step forms retain previously entered data

---

## Testing Strategy

### Layer 1: Automated — axe-core (Every Build)

**axe-core** catches ~30-40% of accessibility issues automatically. Configure with **WCAG 2.2 tags** for full coverage:

```typescript
// In component tests (Vitest + RTL) — add axe checking with WCAG 2.2
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

it('has no accessibility violations', async () => {
  const { container } = render(<Button>Click me</Button>)
  const results = await axe(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
    },
  })
  expect(results).toHaveNoViolations()
})
```

```bash
# Install
pnpm add -D jest-axe @types/jest-axe
```

**ESLint plugin** catches HTML/JSX issues at development time:

```bash
pnpm add -D eslint-plugin-jsx-a11y
```

```javascript
// .eslintrc — add a11y plugin
{
  extends: ['plugin:jsx-a11y/recommended'],
}
```

### Layer 2: E2E Accessibility — Playwright + @axe-core/playwright (Every PR)

axe-core in component tests checks isolated components. E2E a11y testing checks **full pages** with real layout, sticky headers, overlays, and interactive state:

```typescript
// tests/e2e/accessibility.spec.ts
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('Accessibility', () => {
  test('home page has no a11y violations', async ({ page }) => {
    await page.goto('/')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('navigation is keyboard accessible', async ({ page }) => {
    await page.goto('/')

    // Skip link is the first focusable element
    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: /skip to main content/i })
    await expect(skipLink).toBeFocused()

    // Tab through navigation
    await page.keyboard.press('Tab')
    const nav = page.getByRole('navigation', { name: /main/i })
    await expect(nav).toBeVisible()
  })

  test('focused elements are not obscured by sticky header', async ({ page }) => {
    await page.goto('/')

    // Scroll down and tab to an element below the fold
    await page.evaluate(() => window.scrollTo(0, 500))
    await page.keyboard.press('Tab')

    // Verify the focused element is visible (not hidden behind sticky header)
    const focused = page.locator(':focus')
    const box = await focused.boundingBox()
    if (box) {
      // Element should not be under the header (header is ~64-80px tall)
      expect(box.y).toBeGreaterThan(80)
    }
  })
})
```

**ARIA snapshot testing** — verify accessibility tree structure doesn't regress:

```typescript
test('navigation has correct ARIA structure', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: /main/i })).toMatchAriaSnapshot(`
    - navigation "Main navigation":
      - link "Home"
      - link "Features"
      - link "About"
  `)
})
```

```bash
# Install
pnpm add -D @axe-core/playwright
```

### Layer 3: Manual Keyboard Testing (Every Feature)

it('has no accessibility violations', async () => {
const { container } = render(<Button>Click me</Button>)
const results = await axe(container)
expect(results).toHaveNoViolations()
})

````

```bash
# Install
pnpm add -D jest-axe @types/jest-axe
````

**ESLint plugin** catches HTML/JSX issues at development time:

```bash
pnpm add -D eslint-plugin-jsx-a11y
```

```javascript
// .eslintrc — add a11y plugin
{
  extends: ['plugin:jsx-a11y/recommended'],
}
```

Before merging any interactive feature, manually test:

| Test                    | How                                                              | Pass Criteria                                                     |
| ----------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| Tab through entire page | Press Tab repeatedly                                             | Focus visits all interactive elements in visual order             |
| Reverse tab             | Shift+Tab                                                        | Focus moves backward logically                                    |
| Activate buttons        | Enter and Space                                                  | Button action triggers                                            |
| Navigate dropdowns      | Arrow keys                                                       | Options are reachable                                             |
| Open/close modals       | Enter to open, Escape to close                                   | Focus traps inside modal, returns to trigger on close             |
| Form submission         | Tab to submit, Enter to submit                                   | Form submits without mouse                                        |
| Focus visibility        | Tab through page                                                 | Every focused element has visible focus ring                      |
| Focus not obscured      | Tab through page with sticky header                              | No focused element is hidden behind fixed/sticky UI (WCAG 2.4.11) |
| Reduced motion          | Enable `prefers-reduced-motion` in dev tools, navigate full page | All animations are absent or simplified to fade-only              |

### Layer 4: Screen Reader Testing (Before Launch)

Test with at least one screen reader before production launch:

| Screen Reader | OS        | Browser        | Free?            |
| ------------- | --------- | -------------- | ---------------- |
| VoiceOver     | macOS/iOS | Safari         | ✅ Built-in      |
| NVDA          | Windows   | Firefox/Chrome | ✅ Free download |
| TalkBack      | Android   | Chrome         | ✅ Built-in      |

**Basic screen reader test checklist:**

- [ ] Page title is announced on navigation
- [ ] Headings are navigable (screen reader heading navigation)
- [ ] Images have meaningful alt text (or are hidden from announcement)
- [ ] Form fields announce their label, required state, and errors
- [ ] Buttons announce their purpose
- [ ] Live regions announce dynamic content changes (toasts, loading)
- [ ] Modal focus management works correctly

### Layer 5: Lighthouse Audit (Before Launch)

```bash
# Chrome DevTools → Lighthouse → Accessibility
# Target: ≥ 90
```

---

## Common Patterns

### Icon-Only Buttons

```tsx
// ❌ No accessible name — screen reader says "button"
<button onClick={onClose}>
  <XIcon className="h-5 w-5" />
</button>

// ✅ Screen reader says "Close dialog"
<button onClick={onClose} aria-label="Close dialog">
  <XIcon className="h-5 w-5" aria-hidden="true" />
</button>
```

### Toggle Buttons

```tsx
// ✅ Announces "Menu, expanded" or "Menu, collapsed"
<button
  aria-expanded={isOpen}
  aria-controls="nav-menu"
  aria-label="Menu"
  onClick={() => setIsOpen(!isOpen)}
>
  <MenuIcon className="h-5 w-5" aria-hidden="true" />
</button>

<nav id="nav-menu" hidden={!isOpen}>
  {/* Navigation links */}
</nav>
```

### Status Messages

```tsx
// ✅ Toast/status announced to screen readers without stealing focus
<div role="status" aria-live="polite">
  {successMessage && <p>{successMessage}</p>}
</div>

// ✅ Urgent error announced immediately
<div role="alert" aria-live="assertive">
  {errorMessage && <p>{errorMessage}</p>}
</div>
```

### Data Tables

```tsx
// ✅ Accessible table with caption and headers
<table>
  <caption className='sr-only'>Monthly sales data for 2026</caption>
  <thead>
    <tr>
      <th scope='col'>Month</th>
      <th scope='col'>Revenue</th>
      <th scope='col'>Growth</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope='row'>January</th>
      <td>$12,000</td>
      <td>+5%</td>
    </tr>
  </tbody>
</table>
```

### Visually Hidden Text (For Screen Readers Only)

```tsx
// Tailwind's sr-only class — visible to screen readers, invisible visually
<span className="sr-only">Total items in cart:</span>
<span className="text-lg font-bold">{cartCount}</span>

// The screen reader hears: "Total items in cart: 3"
// The visual user sees: "3"
```

---

## Accessibility Checklist (Per Project)

### Every Page

- [ ] `<html lang="lang-depends-on-project"...">` set correctly
- [ ] One `<h1>` per page
- [ ] Heading hierarchy (h1 → h2 → h3, no skips)
- [ ] `<main>` wraps primary content
- [ ] Skip to main content link exists
- [ ] All images have `alt` text (or `alt=""` for decorative)
- [ ] Color contrast meets AA (4.5:1 text, 3:1 UI components)
- [ ] Focus visible on all interactive elements
- [ ] Focused elements not obscured by sticky/fixed UI (WCAG 2.4.11)
- [ ] All interactive elements meet 24 × 24 px minimum target size (WCAG 2.5.8)

### Every Interactive Feature

- [ ] Keyboard accessible (Tab, Enter, Space, Escape, Arrow keys where applicable)
- [ ] Focus management correct (modals trap focus, return focus on close)
- [ ] ARIA attributes correct (e.g., `aria-expanded`, `aria-label`, `aria-describedby`)
- [ ] Error states use text + icon + color (not color alone)
- [ ] Loading states announced to screen readers (`aria-busy`)
- [ ] Drag interactions have single-pointer/keyboard alternative (WCAG 2.5.7)
- [ ] Reduced motion respected — `useMotionEnabled()` gates decorative animation
- [ ] Form fields allow paste and password managers (WCAG 3.3.8)
- [ ] Multi-step forms retain previously entered data (WCAG 3.3.7)

### Before Launch

- [ ] Lighthouse Accessibility ≥ 90
- [ ] axe-core automated tests pass with WCAG 2.2 tags (no violations)
- [ ] Playwright E2E a11y tests pass (`@axe-core/playwright`)
- [ ] Manual keyboard navigation test completed (including focus-not-obscured check)
- [ ] Reduced motion test completed (enable `prefers-reduced-motion` and navigate full page)
- [ ] Screen reader test completed (VoiceOver or NVDA)
- [ ] eslint-plugin-jsx-a11y enabled with no warnings

---

## Anti-Patterns

### Semantic & ARIA Anti-Patterns

```tsx
// ❌ div as button — no keyboard access, no role, no focus
<div onClick={handleClick} className="cursor-pointer">Click me</div>

// ✅ Use a button
<button onClick={handleClick}>Click me</button>

// ❌ Removing focus outline (makes keyboard navigation invisible)
<button className="outline-none focus:outline-none">Submit</button>

// ✅ Replace with visible focus indicator
<button className="focus-visible:ring-2 focus-visible:ring-primary-500">Submit</button>

// ❌ Missing alt text (screen reader says "image" or reads filename)
<Image src="/hero.jpg" alt="" />  // Empty alt = decorative (only correct if truly decorative)

// ✅ Descriptive alt text
<Image src="/hero.jpg" alt="Art gallery exhibition room with contemporary paintings" />

// ❌ Color-only error indication
<input className={error ? 'border-red-500' : 'border-gray-300'} />

// ✅ Color + text + icon
<input className={error ? 'border-error-500' : 'border-primary-200'} aria-invalid={!!error} />
{error && <p role="alert" className="text-error-600"><AlertIcon /> {error}</p>}

// ❌ aria-label that duplicates visible text (redundant)
<button aria-label="Submit form">Submit form</button>

// ✅ aria-label only when there's no visible text
<button>Submit form</button>  // Visible text IS the accessible name
<button aria-label="Close"><XIcon aria-hidden="true" /></button>  // No visible text — needs aria-label

// ❌ Using tabIndex > 0 (breaks natural tab order)
<div tabIndex={5}>...</div>

// ✅ Use tabIndex="0" (adds to natural order) or tabIndex="-1" (programmatic focus only)
<div tabIndex={0}>...</div>
```

### WCAG 2.2 Anti-Patterns

```tsx
// ❌ Focus obscured — sticky header covers focused element (violates 2.4.11)
<header className="fixed top-0 z-50 h-16">...</header>
<section>
  <a href="/about">About</a>  {/* When focused after scrolling, may be hidden behind header */}
</section>

// ✅ Add scroll-margin-top to account for fixed header
<section className="scroll-mt-20">
  <a href="/about">About</a>
</section>

// ❌ Drag-only interaction — no alternative for keyboard/pointer users (violates 2.5.7)
<SortableList onDragEnd={handleReorder}>
  {items.map(item => <SortableItem key={item.id}>{item.name}</SortableItem>)}
</SortableList>

// ✅ dnd-kit with keyboard sensor — provides Space/Arrow/Escape keyboard reordering
<DndContext sensors={[useSensor(PointerSensor), useSensor(KeyboardSensor)]}>
  <SortableContext items={items}>
    {items.map(item => <SortableItem key={item.id}>{item.name}</SortableItem>)}
  </SortableContext>
</DndContext>

// ❌ Tiny icon button — 16x16px target (violates 2.5.8)
<button className="h-4 w-4" onClick={onClose}>
  <XIcon className="h-4 w-4" />
</button>

// ✅ Visual element can be small, but target area meets 24x24 minimum
<button className="relative h-4 w-4 before:absolute before:-inset-2 before:content-['']" onClick={onClose}>
  <XIcon className="h-4 w-4" aria-hidden="true" />
</button>

// ❌ Blocking password paste (violates 3.3.8)
<input type="password" onPaste={(e) => e.preventDefault()} />

// ✅ Allow paste — let password managers work
<input type="password" autoComplete="current-password" />

// ❌ Requiring re-entry in multi-step form (violates 3.3.7)
// Step 1: user enters email
// Step 2: "Please enter your email again for confirmation"

// ✅ Auto-populate from previous step or display for confirmation
// Step 1: user enters email
// Step 2: "Email: user@example.com" (displayed, not re-entered)
```

### Animation Accessibility Anti-Patterns

```tsx
// ❌ No reduced motion check — animation runs regardless of user preference
<m.div animate={{ y: [100, 0] }} transition={{ duration: 0.5 }}>
  Content reveals from bottom
</m.div>

// ✅ Gate decorative animation with useMotionEnabled()
const motionEnabled = useMotionEnabled()
<m.div
  animate={motionEnabled ? { y: [100, 0] } : { y: 0 }}
  transition={motionEnabled ? { duration: 0.5 } : { duration: 0 }}
>
  Content reveals from bottom
</m.div>

// ❌ AnimatePresence removes element without focus management
<AnimatePresence>
  {isOpen && <Panel onClose={close} />}
</AnimatePresence>
// After Panel exits, focus is lost to document.body

// ✅ Restore focus to trigger after AnimatePresence exit
const triggerRef = useRef<HTMLButtonElement>(null)
<button ref={triggerRef} onClick={() => setIsOpen(true)}>Open</button>
<AnimatePresence onExitComplete={() => triggerRef.current?.focus()}>
  {isOpen && <Panel onClose={close} />}
</AnimatePresence>

// ❌ Viewport-animated content has no ARIA announcement
<MotionInView>
  <p>Important status update that appears on scroll</p>
</MotionInView>

// ✅ If the content is informational (not just decorative reveal),
// use aria-live on a container or ensure the content is in the DOM from the start
// (MotionInView renders content in the DOM — it only animates appearance,
// so screen readers can access it regardless of animation state)
```

---

## Rationale

### Why WCAG 2.2 AA (Not 2.1, Not AAA)

**Not 2.1:** WCAG 2.2 became the W3C Recommendation in October 2023 and is now the legally referenced standard for the EU EAA 2025. Its new criteria (focus not obscured, target size, dragging alternatives, accessible authentication) address real issues in modern web applications. There is no benefit to targeting an older version.

**Not AAA:** AAA is extremely strict (7:1 contrast ratio, sign language for all video, focus indicator with specific area and contrast calculations) and impractical for most projects. AA is the widely accepted standard, required by most accessibility laws, and achievable without sacrificing design quality. Our component library defaults (ADR-0004) are built to AA compliance — all focus rings, contrast ratios, and ARIA patterns meet AA.

### Why Automated + E2E + Manual Testing

Automated tools (axe-core, ESLint) catch ~30-40% of issues — missing alt text, low contrast, missing labels. E2E a11y testing (Playwright + @axe-core/playwright) catches full-page composition issues — focus obscured by sticky headers, contrast failures across interactive states, ARIA tree regressions. Neither can catch: illogical tab order, poor screen reader experience, or confusing focus management. Manual testing fills the gap. All layers are required.

### Why Post-Pipeline Audit Gate

Accessibility cannot be fully verified until both the FEO pipeline (component structure) and animation pipeline (motion, transitions) are complete. A dedicated post-pipeline audit catches issues that only emerge in the composed state: animated elements stealing focus, reduced motion non-compliance, contrast failures on animated backgrounds, and focus obscured by sticky UI.

### Why Semantic HTML First

ARIA should be the last resort, not the first tool. A `<button>` is inherently accessible — it has keyboard support, focus management, and screen reader semantics built in. A `<div role="button" tabIndex={0} onKeyDown={...}>` requires reimplementing all of that. Use native HTML elements first; add ARIA only when no native element exists for the pattern.

### Key Factors

1. **Legal compliance** — EU EAA 2025, ADA, Section 508 now reference WCAG 2.2 AA.
2. **Market reach** — 15% of the global population has a disability; accessible sites serve more users.
3. **SEO benefit** — semantic HTML and good structure improve search engine understanding (ADR-0013).
4. **DX alignment** — our component library (ADR-0004) and form primitives (ADR-0012) are already built for accessibility.
5. **Testability** — axe-core (with WCAG 2.2 tags), @axe-core/playwright, eslint-plugin-jsx-a11y, and Lighthouse provide measurable, automatable checks.

## Options Considered

| Option                   | Description                        | Why Chosen / Why Not                                                                           |
| ------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| WCAG 2.2 Level AA        | Current W3C accessibility standard | ✅ Chosen: legally current, covers modern interaction patterns, well-documented                |
| WCAG 2.1 Level AA        | Previous accessibility standard    | ❌ Superseded: missing focus-not-obscured, target size, dragging alternatives, accessible auth |
| WCAG 2.2 Level AAA       | Enhanced accessibility             | ❌ Impractical for most projects (7:1 contrast, sign language, strict focus appearance)        |
| No formal standard       | Ad-hoc accessibility               | ❌ Legal risk, inconsistent, unreliable                                                        |
| axe-core (WCAG 2.2 tags) | Automated a11y testing             | ✅ Chosen: best automated detection, integrates with Vitest and Playwright                     |
| @axe-core/playwright     | E2E a11y scanning                  | ✅ Chosen: tests full pages with layout, overlays, and interactive state                       |
| eslint-plugin-jsx-a11y   | Static analysis for JSX            | ✅ Chosen: catches issues at development time                                                  |
| Lighthouse               | Browser-based audit                | ✅ Chosen: comprehensive, standardized score                                                   |

---

## Consequences

**Positive:**

- Legal compliance (EU EAA 2025, ADA) — reduces liability risk by targeting the current standard (WCAG 2.2).
- WCAG 2.2 criteria address modern UI patterns — focus-not-obscured catches sticky header issues, target size catches mobile tap problems, dragging alternatives catch DnD-only interactions.
- Reaches 15%+ more users — people with disabilities can use the application.
- Better SEO — semantic HTML and proper heading structure improve crawlability.
- Better UX for everyone — keyboard navigation, clear focus states, readable text, adequate touch targets.
- Post-pipeline audit gate catches composition-level issues that component-level testing misses.
- Automated testing catches regressions early — axe-core in CI prevents shipping violations.
- E2E a11y testing (Playwright) catches full-page issues — focus obscured, ARIA tree regressions.
- Component library is accessible by default — features built on top inherit accessibility.

**Negative:**

- Accessibility testing takes time — mitigated by automated tools catching most issues and post-pipeline audit providing a structured checklist.
- Some design choices are constrained (minimum contrast, visible focus rings, minimum target size) — mitigated by these being good design practices anyway.
- Screen reader testing requires learning new tools — mitigated by providing a simple checklist.
- ARIA is complex and easy to misuse — mitigated by "use native HTML first" rule and ESLint plugin.
- Post-pipeline audit adds a step to the delivery flow — mitigated by catching expensive-to-fix issues before launch.

## Related ADRs

- [ADR-0002](./0002-styling.md) — Styling (focus ring tokens, color contrast requirements)
- [ADR-0003](./0003-animation.md) — Animation (prefers-reduced-motion, useMotionEnabled, reduced motion strategy)
- [ADR-0004](./0004-components.md) — Components (UI tier accessibility requirements, ARIA on primitives)
- [ADR-0009](./0009-testing.md) — Testing (axe-core integration in component tests, Playwright E2E)
- [ADR-0012](./0012-forms.md) — Forms (label-input association, error messages, aria-invalid, redundant entry)
- [ADR-0018](./0018-performance-platform.md) — Performance — Platform, Infrastructure & Core Web Vitals (Lighthouse Accessibility ≥ 90 target)
- [ADR-0024](./0024-ux-interaction-patterns.md) — UX Interaction Patterns (navigation accessibility, CTA semantics, keyboard/focus rules, target size, responsive touch)
- [ADR-0025](./0025-ux-content-display-patterns.md) — UX Content Display Patterns (carousel ARIA, tab/accordion keyboard nav, data table accessibility)
- [ADR-0026](./0026-ux-application-patterns.md) — UX Application Patterns (drag-and-drop keyboard alternatives, accessible authentication, CRUD accessibility)
- [ADR-0027](./0027-interactive-component-implementation.md) — Interactive Component Implementation (focus management hooks, reduced motion per-component decision table §14, ARIA wiring, testing patterns)
