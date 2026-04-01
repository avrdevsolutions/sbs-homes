---
name: accessibility-testing
description: >-
  Accessibility testing — five layers: axe-core with WCAG 2.2 tags
  (wcag22aa) in Vitest and RTL (full config, install commands), Playwright
  plus @axe-core/playwright for full-page E2E scanning with a
  focus-not-obscured test and ARIA snapshot assertions, manual keyboard test
  checklist (eight tests), screen reader checklist (VoiceOver / NVDA /
  TalkBack), Lighthouse target score of 90 or higher. Use when writing
  component-level accessibility tests, setting up axe-core in Vitest,
  configuring Playwright a11y testing, or running the pre-launch
  accessibility test suite.
---

# Accessibility — 5-Layer Testing Strategy

**Compiled from**: ADR-0019 §Testing Strategy
**Last synced**: 2026-03-27

> This skill covers the testing setup and code patterns. The audit checklist (what to verify after the FEO + animation pipelines complete) is in a separate accessibility audit skill.

---

## Layer 1: Automated — axe-core in Vitest + RTL (Every Build)

axe-core catches ~30–40% of accessibility issues automatically. Configure with **WCAG 2.2 tags** for full coverage.

### Install

```bash
pnpm add -D jest-axe @types/jest-axe eslint-plugin-jsx-a11y
```

### ESLint plugin (catches JSX issues at dev time)

```javascript
// .eslintrc
{
  "extends": ["plugin:jsx-a11y/recommended"]
}
```

### Component test with WCAG 2.2 tags

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'
import { render } from '@testing-library/react'

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

**Why `wcag22aa` tag:** axe-core added WCAG 2.2 rule tags. Without explicitly including `wcag22aa`, the runner falls back to 2.1 coverage only. Always include all five tags above.

---

## Layer 2: E2E Accessibility — Playwright + @axe-core/playwright (Every PR)

axe-core in component tests checks isolated components. E2E a11y testing checks **full pages** with real layout, sticky headers, overlays, and interactive state — the composition issues that unit tests miss.

### Install

```bash
pnpm add -D @axe-core/playwright
```

### Full-page a11y scan

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

    // Main navigation is visible
    await page.keyboard.press('Tab')
    const nav = page.getByRole('navigation', { name: /main/i })
    await expect(nav).toBeVisible()
  })

  test('focused elements are not obscured by sticky header (WCAG 2.4.11)', async ({ page }) => {
    await page.goto('/')

    // Scroll down and tab to an element below the fold
    await page.evaluate(() => window.scrollTo(0, 500))
    await page.keyboard.press('Tab')

    // Focused element must not be hidden behind the sticky header (header is ~64-80px)
    const focused = page.locator(':focus')
    const box = await focused.boundingBox()
    if (box) {
      expect(box.y).toBeGreaterThan(80)
    }
  })
})
```

### ARIA snapshot testing (structural regression)

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

Use ARIA snapshot tests to lock in the accessibility tree structure of key UI regions. If the tree regresses (e.g., a heading disappears, a role changes), the test catches it before shipping.

---

## Layer 3: Manual Keyboard Testing (Every Interactive Feature)

Before merging any interactive feature, manually verify:

| Test                    | How                                         | Pass Criteria                                         |
| ----------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Tab through entire page | Press Tab repeatedly                        | Focus visits all interactive elements in visual order |
| Reverse tab             | Shift+Tab                                   | Focus moves backward logically                        |
| Activate buttons        | Enter and Space                             | Button action triggers                                |
| Navigate dropdowns      | Arrow keys                                  | Options are reachable                                 |
| Open/close modals       | Enter to open, Escape to close              | Focus traps inside; returns to trigger on close       |
| Form submission         | Tab to submit, Enter to submit              | Form submits without mouse                            |
| Focus visibility        | Tab through page                            | Every focused element has a visible focus ring        |
| Focus not obscured      | Tab through page with sticky header visible | No focused element is hidden behind fixed/sticky UI   |

Also test with `prefers-reduced-motion: reduce` enabled (Chrome: DevTools → Rendering → Emulate CSS media feature). All animations should be absent or simplified to fade-only.

---

## Layer 4: Screen Reader Testing (Before Launch)

Test with at least one screen reader before production launch. The goal is to catch issues automated tools can't: illogical tab order, confusing focus sequences, live region timing, and poor screen reader UX.

| Screen Reader | OS          | Browser          | Free?            |
| ------------- | ----------- | ---------------- | ---------------- |
| VoiceOver     | macOS / iOS | Safari           | ✅ Built-in      |
| NVDA          | Windows     | Firefox / Chrome | ✅ Free download |
| TalkBack      | Android     | Chrome           | ✅ Built-in      |

### Screen reader test checklist

- [ ] Page title is announced on navigation
- [ ] Headings are navigable (screen reader heading navigation — `H` key in NVDA/VoiceOver)
- [ ] Images have meaningful alt text (or are skipped if decorative)
- [ ] Form fields announce their label, required state, and errors
- [ ] Buttons announce their purpose (icon-only buttons must have `aria-label`)
- [ ] Live regions announce dynamic content (toasts, loading states) without stealing focus
- [ ] Modal focus management works correctly (enters on open, exits on close)

---

## Layer 5: Lighthouse Audit (Before Launch)

```bash
# Chrome DevTools → Lighthouse tab → check Accessibility → Generate report
# Target: Accessibility score ≥ 90
```

Lighthouse catches: missing labels, missing alt text, color contrast failures, missing landmarks, invalid ARIA. It does not catch: keyboard trap bugs, focus order issues, or screen reader UX.

Run Lighthouse in an **incognito window** to avoid extension interference. Run it on the production build (or `next build && next start`), not the dev server — dev mode includes extra runtime overhead that can skew scores.
