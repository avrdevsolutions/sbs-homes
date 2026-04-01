---
name: accessibility-foundations
description: >-
  WCAG 2.2 Level AA rules and code patterns — five new 2.2 criteria (Focus
  Not Obscured, Dragging Alternatives, Target Size, Redundant Entry,
  Accessible Auth), semantic HTML landmark and heading rules, color and
  contrast requirements, ARIA usage (first rule, live regions, icon buttons,
  toggle buttons, sr-only text), cognitive accessibility, common
  implementation patterns (skip nav, accessible responsive nav, error states,
  loading states, data tables, status messages), anti-patterns with code.
  Use when building any new page or component, adding ARIA attributes,
  implementing error or loading states, making navigation accessible, or
  reviewing semantic markup for WCAG 2.2 compliance.
---

# Accessibility — WCAG 2.2 Foundations & Code Patterns

**Compiled from**: ADR-0019 §WCAG 2.2 New Success Criteria, §Rules, §Implementation, §Common Patterns, §Anti-Patterns
**Last synced**: 2026-03-27

---

## WCAG 2.2 New Success Criteria

These criteria are new in WCAG 2.2. All Level A and AA criteria are mandatory.

### 2.4.11 Focus Not Obscured (Minimum) — Level AA

When an element receives keyboard focus, it must not be **entirely** hidden by author-created content such as sticky headers, cookie banners, or floating panels.

**Risk in this project:** `ScrollAwareHeader` is `fixed inset-x-0 top-0 z-50` and can cover focused elements. `CookieConsent` is fixed at the bottom. Sonner toasts can appear over interactive content.

**Fix:** Use `scroll-margin-top` on anchor targets to account for the fixed header height:

```tsx
// Tailwind — add scroll-mt-20 (80px) to sections with anchor IDs
<section id='features' className='scroll-mt-20'>
  {/* section content */}
</section>
```

### 2.5.7 Dragging Movements — Level AA

Any functionality that uses dragging MUST provide a single-pointer alternative requiring no dragging.

| Pattern                  | Required Alternative                                         |
| ------------------------ | ------------------------------------------------------------ |
| Sortable lists (dnd-kit) | Space/Arrow keys/Space keyboard reordering                   |
| Kanban cross-column drag | Keyboard sensor + move-to-column dropdown                    |
| Slider / range input     | Native `<input type="range">` or increment/decrement buttons |
| File drop zone           | Always include `<input type="file">` alongside the drop zone |

dnd-kit with `KeyboardSensor` enabled satisfies this requirement for sortable lists and kanban boards.

### 2.5.8 Target Size (Minimum) — Level AA

Interactive targets must be at least **24 × 24 CSS pixels** (visual size or unobscured surrounding area).

**Exemptions:** Inline links in prose; browser-controlled elements; essential size (e.g., map pins).

For interactive elements smaller than 24 px visually, use pseudo-element tap area extension:

```tsx
// ✅ Visual element is 16px, but the tap area is 32px (16 + 8 + 8)
<button
  className="relative h-4 w-4 before:absolute before:-inset-2 before:content-['']"
  onClick={onClose}
  aria-label='Close'
>
  <XIcon className='h-4 w-4' aria-hidden='true' />
</button>
```

### 3.3.7 Redundant Entry — Level A

Information already entered by the user must be auto-populated or available for selection — never re-typed.

| Pattern                    | Implementation                                                                  |
| -------------------------- | ------------------------------------------------------------------------------- |
| Multi-step wizard          | Single React Hook Form instance across all steps — values persist automatically |
| Shipping → billing address | "Same as shipping" checkbox pre-checked                                         |
| Profile data in forms      | Pre-fill from user context when available                                       |

**Exception:** Security re-authentication (e.g., entering a password for a sensitive action).

### 3.3.8 Accessible Authentication (Minimum) — Level AA

Authentication steps must not rely solely on cognitive tests (remembering a password, solving a puzzle) unless an alternative method or mechanism exists.

| Rule                              | Requirement                                                                 |
| --------------------------------- | --------------------------------------------------------------------------- |
| Allow password paste              | MUST — required by this criterion. Blocking paste breaks password managers. |
| CAPTCHAs                          | MUST have an alternative (audio CAPTCHA, checkbox CAPTCHA, etc.)            |
| OAuth / social login              | ✅ Satisfies the criterion — alternative method                             |
| Email magic links                 | ✅ Satisfies the criterion — alternative method                             |
| `autocomplete="off"` on passwords | MUST NOT — disable password manager support                                 |

---

## Semantic HTML Foundation

Use the right element for the job. ARIA cannot compensate for wrong HTML.

| Element                  | Use Case                                           | Rule                                           |
| ------------------------ | -------------------------------------------------- | ---------------------------------------------- |
| `<main>`                 | Primary page content — one per page                | MUST                                           |
| `<nav aria-label="...">` | Navigation regions                                 | MUST; label is required if multiple navs exist |
| `<header>` / `<footer>`  | Page-level header and footer                       | MUST                                           |
| `<article>`              | Independent content (blog post, card)              | SHOULD                                         |
| `<section>`              | Thematic grouping (with an associated heading)     | SHOULD                                         |
| `<button>`               | Actions (mutations, state changes, modal triggers) | MUST — never `<div>`                           |
| `<a href>`               | Navigation to a URL                                | MUST — never `<button>` to navigate            |
| `<ul>` / `<ol>`          | Lists of items                                     | SHOULD                                         |
| `<table>`                | Tabular data                                       | SHOULD                                         |

**Heading hierarchy:** One `<h1>` per page matching the page topic. Follow h1 → h2 → h3 with no level skips.

---

## Color & Contrast

| Rule                                        | Ratio   | Level   |
| ------------------------------------------- | ------- | ------- |
| Normal text (< 18px regular, < 14px bold)   | ≥ 4.5:1 | AA MUST |
| Large text (≥ 18px regular or ≥ 14px bold)  | ≥ 3:1   | AA MUST |
| UI components and graphical objects         | ≥ 3:1   | AA MUST |
| Don't use color alone to convey information | —       | MUST    |
| Error states: color + text label + icon     | —       | MUST    |

Verify contrast in **all interactive states**: default, hover, focus, active, disabled, error. Verify against **animated/parallax backgrounds** where text overlays moving content.

---

## ARIA Usage Rules

1. **First rule of ARIA:** Don't use ARIA when a native HTML element covers the use case. A `<button>` is inherently accessible; a `<div role="button" tabIndex={0}>` is not.
2. Use established WAI-ARIA Authoring Practices patterns for custom widgets.
3. `role="button"` on a `<div>` is always wrong — use `<button>`.
4. Custom widgets need the full `role` + state attributes (`aria-expanded`, `aria-selected`, etc.).
5. `aria-live="polite"` for non-urgent dynamic updates; `role="alert"` for urgent errors.
6. `aria-label` for elements with no visible text (icon buttons, close buttons).
7. `aria-hidden="true"` for decorative elements (icons inside labeled buttons).
8. `aria-describedby` to connect error messages and hints to their field.

---

## Cognitive Accessibility

Cognitive accessibility serves users with cognitive, learning, or neurological disabilities and improves UX for everyone.

| Rule                                                                                  | WCAG         | Level  |
| ------------------------------------------------------------------------------------- | ------------ | ------ |
| Navigation structure consistent across pages (same landmarks, same order)             | 3.2.3        | MUST   |
| No context change on focus or input (e.g., no page redirect when a field gains focus) | 3.2.1, 3.2.2 | MUST   |
| Error messages explain what went wrong AND how to fix it (not "Invalid input")        | 3.3.1        | MUST   |
| Provide format hints for complex inputs (date, phone, card number)                    | 3.3.2        | SHOULD |
| If session timeout exists, warn users before expiry and allow extension               | 2.2.1        | SHOULD |
| Support browser zoom to 200% without content loss or overlap                          | 1.4.4        | MUST   |
| Use plain, direct language — avoid jargon and unnecessarily complex words             | —            | SHOULD |

---

## Common Code Patterns

### Skip to Main Content Link

```tsx
// src/components/layout/skip-nav/SkipNav.tsx — Server Component, no 'use client'
export const SkipNav = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50
               focus:rounded-md focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-white"
  >
    Skip to main content
  </a>
)

// src/app/layout.tsx
<html lang="lang-depends-on-project"en">
  <body>
    <SkipNav />
    <Header />
    <main id="main-content">{children}</main>
    <Footer />
  </body>
</html>
```

### Icon-Only Buttons

```tsx
// ❌ Screen reader says "button" — no accessible name
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
// ✅ Success/info — announced without stealing focus
<div role="status" aria-live="polite">
  {successMessage && <p>{successMessage}</p>}
</div>

// ✅ Urgent error — announced immediately
<div role="alert" aria-live="assertive">
  {errorMessage && <p>{errorMessage}</p>}
</div>
```

### Accessible Error State

```tsx
// ✅ Three signals: color + text + icon. Connected to the field via aria-describedby.
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
    <p id='email-error' role='alert' className='text-error-600 flex items-center gap-1 text-sm'>
      <AlertCircle className='h-4 w-4' aria-hidden='true' />
      {error}
    </p>
  )}
</div>
```

### Accessible Loading State

```tsx
// ✅ Button loading — aria-busy communicates in-progress state
<button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? (
    <>
      <Spinner className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>Saving...</span>
    </>
  ) : 'Save'}
</button>

// ✅ Content region loading — aria-live announces when content appears
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? <Skeleton /> : <Content />}
</div>
```

### Data Tables

```tsx
// ✅ Semantic table with caption, column headers, row headers, and aria-sort
<table>
  <caption className='sr-only'>Monthly sales data for 2026</caption>
  <thead>
    <tr>
      <th scope='col' aria-sort='ascending'>
        Month
      </th>
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

### Visually Hidden Text (`sr-only`)

```tsx
// Screen readers hear "Total items in cart: 3"; sighted users see "3"
<span className="sr-only">Total items in cart:</span>
<span className="text-lg font-bold">{cartCount}</span>
```

---

## Anti-Patterns

```tsx
// ❌ div as interactive element — no keyboard access, no role, no focus
<div onClick={handleClick} className="cursor-pointer">Click me</div>

// ✅ Use the correct element
<button onClick={handleClick}>Click me</button>


// ❌ Removing focus outline (keyboard users cannot see where they are)
<button className="outline-none focus:outline-none">Submit</button>

// ✅ Replace with a visible focus indicator using project tokens
<button className="focus-visible:ring-2 focus-visible:ring-primary-500">Submit</button>


// ❌ Color-only error indication (fails for colorblind users)
<input className={error ? 'border-red-500' : 'border-gray-300'} />

// ✅ Color + text + icon (three signals)
<input className={error ? 'border-error-500' : 'border-primary-200'} aria-invalid={!!error} />
{error && <p role="alert" className="text-error-600"><AlertIcon aria-hidden /> {error}</p>}


// ❌ Focus obscured — sticky header covers the focused element (violates 2.4.11)
<header className="fixed top-0 z-50 h-16">...</header>
<section><a href="/about">About</a></section>   {/* may be hidden behind header when focused */}

// ✅ Add scroll-margin-top to account for fixed header height
<section className="scroll-mt-20"><a href="/about">About</a></section>


// ❌ Tiny icon button — 16×16 px visual and hit area (violates 2.5.8)
<button className="h-4 w-4" onClick={onClose}><XIcon className="h-4 w-4" /></button>

// ✅ Extend hit area with pseudo-element while keeping visual size small
<button className="relative h-4 w-4 before:absolute before:-inset-2 before:content-['']" onClick={onClose}>
  <XIcon className="h-4 w-4" aria-hidden="true" />
</button>


// ❌ Blocking password paste (violates 3.3.8 — breaks password managers)
<input type="password" onPaste={(e) => e.preventDefault()} />

// ✅ Allow paste; set autocomplete to help password managers
<input type="password" autoComplete="current-password" />


// ❌ Requiring re-entry in a multi-step form (violates 3.3.7)
// Step 2: "Please enter your email again for confirmation"

// ✅ Display the previously entered value; no re-entry required
// Step 2: "Email on file: user@example.com (pre-filled from Step 1)"
```
