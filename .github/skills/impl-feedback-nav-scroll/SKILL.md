---
name: impl-feedback-nav-scroll
description: >-
  Sonner toast implementation — setup in root layout, project-token styling via
  classNames prop, triggering from client events and server action return values
  (never directly from server), undo toast pattern, toast type decision table.
  Mobile navigation with Radix Sheet — architecture, full implementation with
  focus trap + body scroll lock, AnimatePresence integration. Scroll behavior —
  CSS-first smooth scroll with reduced motion support, scrollToSection utility
  accounting for sticky header offset, useScrollSpy hook with
  IntersectionObserver, scroll position preservation via sessionStorage. Use
  when wiring toast feedback from server actions, building mobile navigation
  drawers, implementing scroll-to-section anchors, or adding scroll spy to nav.
---

# Toast, Mobile Navigation & Scroll — Implementation Patterns

**Compiled from**: ADR-0027 §3 (Toast/Sonner), §4 (Mobile Navigation), §5 (Scroll Behavior)
**Last synced**: 2026-03-22

---

## 1. Sonner Setup in Root Layout

```tsx
// src/app/layout.tsx
import { Toaster } from '@/components/ui/sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lang-depends-on-project"en">
      <body>
        {children}
        <Toaster />  {/* Sonner manages its own aria-live region */}
      </body>
    </html>
  )
}
```

## 2. Sonner Styling with Project Tokens

```tsx
// src/components/ui/sonner/Sonner.tsx
'use client'
import { Toaster as SonnerToaster } from 'sonner'

export const Toaster = () => (
  <SonnerToaster
    position="bottom-right"
    toastOptions={{
      classNames: {
        toast: 'bg-surface border-border text-foreground shadow-lg rounded-lg',
        title: 'text-foreground font-medium',
        description: 'text-muted-foreground text-sm',
        actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
        cancelButton: 'bg-muted text-muted-foreground hover:bg-muted/90',
        error: 'bg-destructive/10 border-destructive/20 text-destructive',
        success: 'bg-success/10 border-success/20 text-success',
        warning: 'bg-warning/10 border-warning/20 text-warning',
        info: 'bg-info/10 border-info/20 text-info',
      },
    }}
  />
)
```

## 3. Triggering Toasts

**From a client event:**

```tsx
'use client'
import { toast } from 'sonner'

const handleCopy = async () => {
  await navigator.clipboard.writeText(text)
  toast.success('Copied to clipboard')
}
```

**From a server action — return a result object; toast from the client:**

Sonner's `toast()` is a client-only API. Server Actions cannot call it directly. Pattern: return `{ success, message }` from the action and call `toast` in the client handler.

```tsx
// actions.ts
'use server'
export const deleteItem = async (id: string) => {
  try {
    await db.item.delete({ where: { id } })
    return { success: true, message: 'Item deleted' }
  } catch {
    return { success: false, message: 'Failed to delete item' }
  }
}
```

```tsx
// DeleteButton.tsx
'use client'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { deleteItem } from './actions'

export const DeleteButton = ({ id }: { id: string }) => {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteItem(id)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <Button onClick={handleDelete} variant="destructive" disabled={isPending}>
      {isPending ? 'Deleting...' : 'Delete'}
    </Button>
  )
}
```

**Undo pattern:**

```tsx
toast('Item archived', {
  action: { label: 'Undo', onClick: () => restoreItem(id) },
  duration: 6000,
})
```

## 4. Toast Types

| Type | When to Use | Duration |
|------|-------------|----------|
| `toast.success()` | Completed: saved, deleted, copied | 4s (auto-dismiss) |
| `toast.error()` | Failed: network error, rejection | 8s or persistent |
| `toast.warning()` | Caution: approaching limit, unsaved | 6s |
| `toast.info()` | Neutral: new message, update available | 4s |
| `toast()` with `action` | Undoable: archive, move, status change | 6s |
| `toast.loading()` → `toast.success()` | Long-running: upload, export | Until complete |

Sonner renders in `aria-live="polite"` by default. `toast.error()` automatically uses `aria-live="assertive"`.

---

## 5. Mobile Navigation with Sheet

**Architecture:**

```
Header (Server Component — layout)
  ├── Desktop navigation links (hidden on mobile via CSS)
  └── MobileMenu.tsx ('use client')
        ├── Hamburger <button> trigger
        └── Sheet (Radix Dialog, side-anchored)
              ├── Navigation links
              └── Focus trap + body scroll lock (Radix built-in, automatic)
```

**Implementation:**

```tsx
// src/components/layout/header/MobileMenu.tsx
'use client'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'

type NavItem = { label: string; href: string }

export const MobileMenu = ({ items }: { items: NavItem[] }) => {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="lg:hidden p-2" aria-label="Open menu">
          <HamburgerIcon aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-surface">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <nav aria-label="Mobile navigation">
          <ul className="flex flex-col gap-2 pt-8">
            {items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="block px-4 py-3 text-foreground hover:bg-muted rounded-md"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
```

**Key details:**
- Focus trap + body scroll lock: Radix Dialog handles both automatically
- Close on navigation: call `setOpen(false)` in link `onClick`
- Close on Escape: built-in from Radix — no manual `onKeyDown` needed
- Responsive split: hamburger at `lg:hidden`, desktop nav at `hidden lg:flex`

**With Framer Motion** (gate spring with `useMotionEnabled()`):

```tsx
<SheetContent forceMount>
  <AnimatePresence>
    {open && (
      <m.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={motionEnabled ? { type: 'spring', ...springPresets.snappy } : { duration: 0.15 }}
      >
        {/* nav content */}
      </m.div>
    )}
  </AnimatePresence>
</SheetContent>
```

---

## 6. Smooth Scroll

**CSS-first (preferred) — respects reduced motion automatically:**

```css
/* globals.css */
html { scroll-behavior: smooth; }

[id] { scroll-margin-top: 5rem; } /* matches sticky header height */

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
```

With this CSS, plain `<a href="#section-id">` anchors work without JavaScript.

**JS utility (for programmatic scrolling from event handlers):**

```tsx
// src/lib/scroll.ts
export const scrollToSection = (sectionId: string, headerOffset = 80) => {
  const element = document.getElementById(sectionId)
  if (!element) return
  const y = element.getBoundingClientRect().top + window.scrollY - headerOffset
  window.scrollTo({ top: y, behavior: 'smooth' })
}
```

## 7. Scroll Spy (useScrollSpy)

```tsx
// src/hooks/useScrollSpy.ts
'use client'
import { useEffect, useState } from 'react'

export const useScrollSpy = (
  sectionIds: string[],
  options: { rootMargin?: string; threshold?: number } = {}
) => {
  const { rootMargin = '-80px 0px 0px 0px', threshold = 0.4 } = options
  const [activeId, setActiveId] = useState<string>(sectionIds[0] ?? '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActiveId(visible[0].target.id)
      },
      { rootMargin, threshold }
    )
    for (const id of sectionIds) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [sectionIds, rootMargin, threshold])

  return activeId
}
```

**Usage in navigation:**

```tsx
'use client'
import { useScrollSpy } from '@/hooks/useScrollSpy'

const sections = ['about', 'features', 'pricing', 'faq']

export const SectionNav = () => {
  const activeId = useScrollSpy(sections)
  return (
    <nav aria-label="Page sections">
      <ul className="flex gap-4">
        {sections.map((id) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={activeId === id ? 'true' : undefined}
              className={cn(
                'px-3 py-1 rounded-full text-sm transition-colors',
                activeId === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

## 8. Scroll Position Preservation

For list→detail navigation where the user should return to the previous scroll position:

```tsx
// src/hooks/useScrollPosition.ts
'use client'
import { useEffect } from 'react'

export const useScrollPosition = (key: string) => {
  useEffect(() => {
    const saved = sessionStorage.getItem(`scroll_${key}`)
    if (saved) window.scrollTo(0, parseInt(saved, 10))
    return () => {
      sessionStorage.setItem(`scroll_${key}`, String(window.scrollY))
    }
  }, [key])
}
```
