---
applyTo: 'src/components/**/*.{ts,tsx}, src/app/**/*.{ts,tsx}'
---

# Accessibility Constraints

## Standard

- Target standard is WCAG 2.2 Level AA — not 2.1

## Heading Structure

- One `<h1>` per page, matching the page topic
- Heading hierarchy MUST follow h1 → h2 → h3 with no skips

## Focus Visibility & Obscuring (WCAG 2.4.11)

- MUST NOT remove focus outline (`outline: none`) without a visible `focus-visible:ring-*` alternative
- Anchor targets at risk of obscuring behind sticky/fixed UI MUST have `scroll-margin-top` set to the fixed header height

## ARIA

- Use native HTML elements first — add ARIA only when no native element covers the use case
- MUST NOT use `role="button"` on `<div>` — use `<button>`
- `tabIndex` greater than 0 MUST NOT be used — it breaks the natural tab order

## Accessible Authentication (WCAG 3.3.8)

- MUST NOT block paste on password or email fields
- MUST NOT use `autocomplete="off"` on password or personal-data fields

## Redundant Entry (WCAG 3.3.7)

- Multi-step forms MUST retain all previously entered data — never require re-entry within the same session

## Cognitive Accessibility

- Navigation landmark placement MUST be consistent across pages (WCAG 3.2.3)
- MUST NOT trigger a context change on focus or input without explicit user initiation (WCAG 3.2.1, 3.2.2)
- Page MUST support browser zoom to 200% without content loss or overlap

## Error Messages

- Error messages MUST explain what went wrong and how to fix it — "Invalid input" alone is not acceptable

## Color & Contrast

- Contrast MUST be verified in all interactive states: default, hover, focus, active, disabled, error
- Contrast MUST be verified in sections with animated or parallax backgrounds where text overlays moving content
