---
name: impl-focus-accessibility
description: >-
  Focus management implementation — useFocusTrap hook (for custom composite
  widgets only, NOT Radix overlays), useFocusRestore (save and restore on
  open/close), SkipLink server component, useRovingTabindex hook (Arrow/Home/
  End keys). Reduced motion integration — per-component type decision table
  (dialog/carousel/DnD/toast/accordion/scroll), CSS-first approach vs
  useMotionEnabled() decision tree. RTL testing — Dialog open/close, focus
  trap cycle, focus restoration after close, IntersectionObserver mock for
  scroll spy, Tabs arrow key navigation. Use when implementing custom
  composite widget focus management, adding skip navigation, writing
  accessibility tests, or deciding how to handle reduced motion per component.
---

# Focus Management, Reduced Motion & Accessibility Testing

**Compiled from**: ADR-0027 §12 (Focus Management), §14 (Reduced Motion Integration), §15.1-15.4 (Testing); ADR-0019 §WCAG 2.4.11, §Animation Accessibility Anti-Patterns
**Last synced**: 2026-03-27

---

## 1. useFocusTrap (Custom Widgets Only)

**When to use:** Custom composite widgets that need focus containment but are NOT built on Radix Dialog, Sheet, or AlertDialog. Radix overlays trap focus automatically — never add useFocusTrap to them.

```tsx
// src/hooks/useFocusTrap.ts
'use client'
import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const useFocusTrap = <T extends HTMLElement>(active = true) => {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!active || !ref.current) return

    const container = ref.current
    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    const first = focusables[0]
    const last = focusables[focusables.length - 1]

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    container.addEventListener('keydown', handler)
    first?.focus()
    return () => container.removeEventListener('keydown', handler)
  }, [active])

  return ref
}
```

---

## 2. useFocusRestore (Custom Overlay Close)

**Note:** Radix Dialog/Sheet/AlertDialog restore focus automatically. Only use this for custom overlays that don't use Radix.

```tsx
// src/hooks/useFocusRestore.ts
'use client'
import { useEffect, useRef } from 'react'

export const useFocusRestore = (isOpen: boolean) => {
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement
    } else if (triggerRef.current) {
      triggerRef.current.focus()
      triggerRef.current = null
    }
  }, [isOpen])
}
```

---

## 3. SkipLink (Server Component)

Every page must have a skip-to-content link as the first focusable element. It is visible only on keyboard focus.

```tsx
// src/components/layout/SkipLink.tsx  — Server Component, no 'use client' needed
export const SkipLink = () => (
  <a
    href='#main-content'
    className='focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:outline-none'
  >
    Skip to main content
  </a>
)
```

Place in root layout before the `<Header>`. Target element: `<main id="main-content">`.

---

## 4. useRovingTabindex (Custom Composite Widgets)

**When to use:** Custom toolbars, radio groups, or tab lists NOT built on Radix. Radix Tabs, RadioGroup, ToggleGroup, and NavigationMenu implement roving tabindex internally.

```tsx
// src/hooks/useRovingTabindex.ts
'use client'
import { useCallback, useState } from 'react'

export const useRovingTabindex = (itemCount: number) => {
  const [focusedIndex, setFocusedIndex] = useState(0)

  const getTabIndex = useCallback(
    (index: number) => (index === focusedIndex ? 0 : -1),
    [focusedIndex],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let next = index
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          next = (index + 1) % itemCount
          e.preventDefault()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          next = (index - 1 + itemCount) % itemCount
          e.preventDefault()
          break
        case 'Home':
          next = 0
          e.preventDefault()
          break
        case 'End':
          next = itemCount - 1
          e.preventDefault()
          break
        default:
          return
      }
      setFocusedIndex(next)
    },
    [itemCount],
  )

  return { focusedIndex, setFocusedIndex, getTabIndex, handleKeyDown }
}
```

---

## 5. Reduced Motion — Per-Component Decision Table

| Interactive Element            | Under Reduced Motion                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| Dialog / Sheet enter/exit      | Fade-only — no slide or scale. Keep the transition (functional: user must see overlay appear) |
| Carousel autoplay              | **Disable entirely** — autoplay is an a11y violation under reduced motion                     |
| Carousel slide transition      | Snap instantly — no slide animation                                                           |
| Drag-and-drop settle animation | Snap to position — no spring/ease                                                             |
| Toast enter/exit               | Fade-only — no slide from screen edge                                                         |
| Tab panel switch               | Instant switch — no crossfade                                                                 |
| Accordion expand/collapse      | Instant expand — no height animation                                                          |
| Scroll-to-section              | `scroll-behavior: auto` — instant jump                                                        |
| Command palette open/close     | Fade-only — no scale or slide                                                                 |
| Loading spinner                | **Keep** — functional, not decorative; use opacity pulse instead of rotation                  |

### CSS-First Approach (Preferred for Radix `data-state` animations)

```css
/* globals.css — blanket override for all Radix data-state animations */
@media (prefers-reduced-motion: reduce) {
  [data-state='open'],
  [data-state='closed'] {
    animation-duration: 0.01ms !important;
  }
}
```

The `!important` is acceptable here — it is a motion accessibility override, not a specificity shortcut.

### JS Approach (Required for Framer Motion and Embla Autoplay)

```tsx
import { useMotionEnabled } from '@/lib/motion/hooks/useMotionEnabled'

const motionEnabled = useMotionEnabled()

// Gate decorative animations:
const shouldAutoplay = autoplay && motionEnabled

// Simplify transition:
const transition = motionEnabled ? transition : 'none'
```

### Decision: CSS vs JS

```
Is the animation defined in CSS (Tailwind animate utilities)?
  → YES: Use CSS @media (prefers-reduced-motion: reduce) — automatic
Is the animation defined in JS (Framer Motion, Embla autoplay)?
  → YES: Use useMotionEnabled() to gate or simplify
Is the animation functional (loading spinner, progress indicator)?
  → YES: Keep it — simplify to opacity pulse if it uses rotation
```

---

## 6. Testing Radix Components with RTL

Radix renders real DOM — no mocking required:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

describe('Dialog', () => {
  it('opens on trigger click and closes on Escape', async () => {
    const user = userEvent.setup()

    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <p>Dialog content</p>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.queryByText('Dialog content')).not.toBeInTheDocument()
    await user.click(screen.getByText('Open'))
    expect(screen.getByText('Dialog content')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Dialog content')).not.toBeInTheDocument()
  })

  it('traps focus within dialog', async () => {
    const user = userEvent.setup()

    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <button>First</button>
          <button>Second</button>
        </DialogContent>
      </Dialog>,
    )

    await user.click(screen.getByText('Open'))
    await user.tab()
    expect(screen.getByText('First')).toHaveFocus()
    await user.tab()
    expect(screen.getByText('Second')).toHaveFocus()
    await user.tab()
    // Wraps back — focus stays inside dialog
    expect(screen.getByText('First')).toHaveFocus()
  })
})
```

---

## 7. Testing Focus Restoration

```tsx
it('restores focus to trigger after dialog closes', async () => {
  const user = userEvent.setup()

  render(
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <button>Close</button>
      </DialogContent>
    </Dialog>,
  )

  await user.click(screen.getByText('Open'))
  await user.keyboard('{Escape}')
  expect(screen.getByText('Open')).toHaveFocus()
})
```

---

## 8. Testing Keyboard Navigation (Radix Tabs)

```tsx
describe('Tabs keyboard navigation', () => {
  it('moves between tabs with ArrowRight', async () => {
    const user = userEvent.setup()

    render(
      <Tabs defaultValue='tab1'>
        <TabsList>
          <TabsTrigger value='tab1'>Tab 1</TabsTrigger>
          <TabsTrigger value='tab2'>Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value='tab1'>Content 1</TabsContent>
        <TabsContent value='tab2'>Content 2</TabsContent>
      </Tabs>,
    )

    await user.tab()
    expect(screen.getByText('Tab 1')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('Tab 2')).toHaveFocus()
    expect(screen.getByText('Content 2')).toBeInTheDocument()
  })
})
```

---

## 9. Mocking IntersectionObserver (Scroll Spy Tests)

```ts
// tests/setup.ts or per-test file
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})
window.IntersectionObserver = mockIntersectionObserver
```

**Testing the callback directly:**

```tsx
it('updates active section when section becomes visible', () => {
  let intersectionCallback: IntersectionObserverCallback

  window.IntersectionObserver = vi.fn((callback) => {
    intersectionCallback = callback
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }
  }) as unknown as typeof IntersectionObserver

  render(<SectionNav />)

  // Simulate the IntersectionObserver callback firing
  intersectionCallback!(
    [{ isIntersecting: true, target: { id: 'features' } }] as IntersectionObserverEntry[],
    {} as IntersectionObserver,
  )

  expect(screen.getByText('Features')).toHaveAttribute('aria-current', 'true')
})
```

---

## 10. AnimatePresence Focus Restoration & WCAG 2.4.11

### AnimatePresence — Restore Focus on Exit

When `AnimatePresence` removes an animated overlay (panel, drawer, popover), focus is dropped to `document.body` unless explicitly restored. Use `onExitComplete` to return focus to the trigger:

```tsx
'use client'
import { AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'

const triggerRef = useRef<HTMLButtonElement>(null)
const [isOpen, setIsOpen] = useState(false)

// ❌ Focus lost to document.body when Panel exits
<AnimatePresence>
  {isOpen && <Panel onClose={() => setIsOpen(false)} />}
</AnimatePresence>

// ✅ Focus returns to trigger after AnimatePresence exit completes
<button ref={triggerRef} onClick={() => setIsOpen(true)}>Open</button>
<AnimatePresence onExitComplete={() => triggerRef.current?.focus()}>
  {isOpen && <Panel onClose={() => setIsOpen(false)} />}
</AnimatePresence>
```

**Why `onExitComplete` not `onClose`:** The exit animation runs asynchronously. If you call `focus()` in the close handler, the element may still be in the DOM mid-animation. `onExitComplete` fires after the element is fully removed.

> Apply `scroll-mt-20` (or the equivalent of your header height) to every `<section>` with an `id` anchor. This prevents focused elements from disappearing behind the fixed header (WCAG 2.4.11) — both during normal tab navigation and after animated reveals.
