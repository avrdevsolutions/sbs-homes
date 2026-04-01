# ADR-0027: Interactive Component Implementation

**Status**: Accepted
**Date**: 2026-03-21
**Supersedes**: N/A

---

## Context

ADRs 0024-0026 answer **"what pattern to use when"** — decision trees for navigation, feedback, content display, CRUD, search, drag-and-drop, dashboards, and onboarding. What they don't cover is **"how to build it"** — library wiring, component architecture, server/client boundaries, state management, accessibility implementation, and reduced motion integration.

Without this ADR, agents and developers know *which* pattern to apply but make ad-hoc decisions about implementation: inconsistent Radix usage, `'use client'` on entire feature trees, toast calls that don't reach server action results, carousels without keyboard navigation, data tables with client-side pagination that should be server-side.

This ADR provides the **technical implementation layer** for every interactive UI pattern recommended in ADRs 0024-0026.

This is **Part 4** and final of the UX knowledge series:

| ADR | Scope |
|-----|-------|
| ADR-0024 | Core interaction patterns — navigation, CTAs, feedback, form UX, responsive, keyboard/focus |
| ADR-0025 | Content display — carousels, tabs, accordions, galleries, data tables, timelines, trees |
| ADR-0026 | Application-specific — CRUD, search, drag-and-drop, real-time, dashboards, onboarding |
| **ADR-0027** (this) | Implementation — library wiring, component architecture, server/client boundaries, accessibility code |

## Decision

**Adopt standardized implementation patterns for interactive components: Radix UI (via shadcn/ui) as the headless primitive layer, thin client boundary extraction for server component composition, Sonner for toasts, Embla Carousel for sliders, dnd-kit for drag-and-drop, cmdk for command palette, TanStack Table for data tables, and project-specific utilities for focus management, keyboard shortcuts, scroll behavior, and reduced motion integration. All implementations follow the server-first principle (ADR-0004), the primitives-first rule (ADR-0023), and the state escalation ladder (ADR-0020).**

---

## Rules

| Rule | Level |
|------|-------|
| Use Radix UI (via shadcn/ui) for all overlay, menu, tooltip, tabs, accordion, and toggle components — never build custom implementations of these | **MUST** |
| Interactive components use `'use client'` only on the smallest possible wrapper — server component keeps layout + content (ADR-0004) | **MUST** |
| Every Radix component must be restyled with project tokens only — no default Tailwind palette (ADR-0002) | **MUST** |
| Toast notifications use Sonner — never build a custom toast system | **MUST** |
| Carousel/slider implementations use Embla Carousel — never build custom slide logic | **MUST** |
| Drag-and-drop implementations use dnd-kit with keyboard sensor enabled — never DnD without keyboard fallback | **MUST** |
| Data table implementations use TanStack Table for sorting, filtering, and pagination logic | **MUST** |
| Command palette implementations use cmdk — never build custom fuzzy search UI | **MUST** |
| Focus traps use Radix's built-in focus trap (Dialog, AlertDialog, Sheet) — never implement manual focus traps for overlay components | **MUST** |
| All interactive component transitions respect `useMotionEnabled()` — gate decorative animations, keep functional transitions (ADR-0003) | **MUST** |
| URL state (`nuqs` or `useSearchParams`) for shareable UI state (active tab, filter, sort, search query) — per ADR-0020 | **SHOULD** |
| Props crossing the server/client boundary must be serializable (no functions, no class instances, no Dates — use ISO strings) | **MUST** |
| Always import Radix components from `@/components/ui/*` barrels, never from `@radix-ui/*` directly in feature code | **MUST** |
| Test interactive components with RTL + `@testing-library/user-event` for keyboard/focus testing (ADR-0009) | **MUST** |
| Library recommendations in this ADR are classified as `recommended`, `compatible`, or `forbidden` per ADR-0002 conventions | **MUST** |

---

## 1. Radix UI Primitives (via shadcn/ui)

### 1.1 Pattern-to-Component Mapping

Every UX pattern in ADRs 0024-0026 that requires a headless accessible primitive maps to a specific Radix component:

| UX Pattern (ADR source) | Radix Component | shadcn/ui Name | Notes |
|------------------------|-----------------|----------------|-------|
| Modal editing (ADR-0026 §1.3) | `Dialog` | `Dialog` | Centered overlay with focus trap |
| Slide-over panel (ADR-0026 §1.3) | `Dialog` | `Sheet` | Side-anchored variant using Dialog internals |
| Destructive confirmation (ADR-0026 §1.5) | `AlertDialog` | `AlertDialog` | Requires explicit action — no close-on-overlay-click |
| Dropdown actions (ADR-0026 §12) | `DropdownMenu` | `DropdownMenu` | Context menu, kebab menu, bulk actions |
| Tooltip hints (ADR-0024 §3.3) | `Tooltip` | `Tooltip` | Hover/focus-triggered, delay-managed |
| Tabs (ADR-0025 §3) | `Tabs` | `Tabs` | Horizontal/vertical, roving tabindex built-in |
| Accordion (ADR-0025 §4) | `Accordion` | `Accordion` | Single/multi open, collapsible |
| Navigation menu (ADR-0024 §1.1) | `NavigationMenu` | `NavigationMenu` | Desktop mega-menu with viewport positioning |
| Popover (ADR-0024 §3.3) | `Popover` | `Popover` | Rich content tooltip alternative |
| Toggle (ADR-0025 §6) | `Toggle` / `ToggleGroup` | `Toggle` | Pressed/unpressed state, group for mutual exclusion |
| Select (ADR-0012) | `Select` | `Select` | Styled native-feel dropdown |
| Command palette (ADR-0024 §1.4) | — (cmdk wraps Dialog) | Custom | cmdk provides its own accessible combobox |
| Toast (ADR-0024 §3.2) | — (Sonner) | `Sonner` | Standalone — not a Radix component |

### 1.2 When to Use Radix vs Build Custom

```
Does the pattern need: overlay positioning, focus trap, 
dismiss-on-escape, roving tabindex, or ARIA role management?
  → YES: Use Radix (via shadcn/ui)
    → Is there a matching shadcn/ui component?
      → YES: Use it as-is, restyle with project tokens
      → NO: Install the Radix primitive directly, build wrapper in src/components/ui/
  → NO: Is it a simple toggle, visibility switch, or button variant?
    → YES: Build with native HTML + React state + ARIA attributes
    → NO: Is it a complex composite widget (data table, carousel, DnD)?
      → YES: Use the recommended headless library (TanStack Table, Embla, dnd-kit)
      → NO: Build custom with proper ARIA — document the choice
```

### 1.3 Styling Radix Components with Project Tokens

All Radix/shadcn components must be restyled to use project design tokens (ADR-0002). The restyling follows a strict hierarchy:

**Step 1: Token replacement in the component file**

```tsx
// src/components/ui/dialog/Dialog.tsx
'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'

import { cn } from '@/lib/utils'

// ✅ Project tokens only — no gray-100, slate-200, zinc-300, etc.
const DialogOverlay = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) => (
  <DialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-background-overlay/80 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      className
    )}
    {...props}
  />
)

const DialogContent = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      className={cn(
        'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
        'w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-lg',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
)
```

**Step 2: className override depth rules (per ADR-0002)**

| Override level | Allowed? | Example |
|---------------|----------|---------|
| Wrapper-level `className` | ✅ Always | `<Dialog className="max-w-2xl">` |
| cva variant props | ✅ Preferred | `<Button variant="destructive" size="lg">` |
| Deep child selectors | ❌ Forbidden | Never target `.dialog-overlay > div > span` |
| `!important` overrides | ❌ Forbidden | Never use `!important` on Radix internals |

**Step 3: Animation tokens**

Radix components use `data-[state=open]` / `data-[state=closed]` attributes. Tailwind animate utilities connect to these:

```css
/* globals.css — animation keyframes for Radix states */
@keyframes dialog-enter { from { opacity: 0; scale: 0.95; } }
@keyframes dialog-exit { to { opacity: 0; scale: 0.95; } }
```

Map these to Tailwind config or use `tailwindcss-animate` (pre-approved, already part of shadcn/ui setup).

### 1.4 Radix Component File Structure

```
src/components/ui/
  dialog/
    Dialog.tsx          # 'use client' — wraps @radix-ui/react-dialog
    index.ts            # Barrel: export { Dialog, DialogContent, DialogHeader, ... }
  dropdown-menu/
    DropdownMenu.tsx    # 'use client' — wraps @radix-ui/react-dropdown-menu
    index.ts
  accordion/
    Accordion.tsx       # 'use client' — wraps @radix-ui/react-accordion
    index.ts
  tabs/
    Tabs.tsx            # 'use client' — wraps @radix-ui/react-tabs
    index.ts
  tooltip/
    Tooltip.tsx         # 'use client' — wraps @radix-ui/react-tooltip
    index.ts
  sheet/
    Sheet.tsx           # 'use client' — wraps @radix-ui/react-dialog (side-anchored)
    index.ts
  alert-dialog/
    AlertDialog.tsx     # 'use client' — wraps @radix-ui/react-alert-dialog
    index.ts
```

Each component:
- Has `'use client'` directive (Radix primitives require DOM access)
- Re-exports compound parts (e.g., `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`)
- Applies project token styling in the component file (not at consumption site)
- Exposes `className` prop on every part for override

**Import rule:** Feature and layout components import from `@/components/ui/dialog`, never from `@radix-ui/react-dialog`. The UI tier owns the Radix dependency.

---

## 2. Client Boundary Extraction

### 2.1 The Pattern

Server Component by default (ADR-0004). When a component needs interactivity, extract only the interactive behavior into a thin `'use client'` wrapper. The server component retains layout, content, and data fetching.

```
Server Component (page or feature)
  └── Static layout + content (HTML + primitives)
  └── <ClientInteractiveWrapper>    ← 'use client', minimal
        └── Interactive behavior (state, events, Radix)
        └── {children}              ← Server Component children passed through
```

### 2.2 Client Boundary Convention

```
src/components/features/pricing/
  PricingSection.tsx          # Server Component — layout, content, data
  PricingToggle.tsx           # 'use client' on line 1 — toggle state (monthly/yearly)
  index.ts                    # Barrel exports
```

Name the file for what the component does. The `'use client'` directive on line 1 is the only rendering mode signal.

### 2.3 Props Serialization Boundary

Props passed from server to client components must be serializable. This is a Next.js constraint:

| Allowed | Not Allowed |
|---------|-------------|
| `string`, `number`, `boolean` | Functions (`onClick`, callbacks) |
| `null`, `undefined` | Class instances |
| Plain objects (`{ key: value }`) | `Date` objects (use ISO strings) |
| Arrays of serializable values | `Map`, `Set`, `Symbol` |
| JSX (`children`) | `RegExp` |

**Pattern for passing event handlers:**

```tsx
// ❌ WRONG — function prop crosses server/client boundary
// PricingSection.tsx (Server Component)
<PricingToggle onChange={(plan) => updatePlan(plan)} />

// ✅ CORRECT — server action is a special case, passed by reference
// PricingSection.tsx (Server Component)
import { updatePlan } from './actions'

<PricingToggle updatePlanAction={updatePlan} />

// PricingToggle.tsx
'use client'

import { useTransition } from 'react'

type PricingToggleProps = {
  updatePlanAction: (plan: string) => Promise<void>
}

export const PricingToggle = ({ updatePlanAction }: PricingToggleProps) => {
  const [isPending, startTransition] = useTransition()
  
  const handleToggle = (plan: string) => {
    startTransition(() => updatePlanAction(plan))
  }
  // ...
}
```

### 2.4 Composition Patterns

**Pattern A: Server layout wraps client interactive**

```tsx
// ProductCard.tsx (Server Component)
import { AddToCartButton } from './AddToCartButton.client'

export const ProductCard = ({ product }: { product: Product }) => (
  <div className="rounded-lg border border-border bg-surface p-4">
    <img src={product.image} alt={product.name} />
    <Typography variant="h3">{product.name}</Typography>
    <Typography variant="body">{product.description}</Typography>
    <AddToCartButton productId={product.id} />
  </div>
)
```

**Pattern B: Client wrapper accepts server children**

```tsx
// AccordionSection.tsx (Server Component)
import { AccordionWrapper } from './AccordionWrapper.client'

export const AccordionSection = ({ items }: { items: FaqItem[] }) => (
  <Section>
    <Container>
      <AccordionWrapper>
        {items.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>
              <Typography variant="body">{item.answer}</Typography>
            </AccordionContent>
          </AccordionItem>
        ))}
      </AccordionWrapper>
    </Container>
  </Section>
)
```

**Pattern C: Extracting a behavior hook**

When the interactivity is a reusable behavior (not UI-specific), extract to a hook in `src/hooks/`:

```tsx
// src/hooks/useScrollSpy.ts
'use client'

import { useEffect, useState } from 'react'

export const useScrollSpy = (sectionIds: string[], offset = 0) => {
  const [activeId, setActiveId] = useState<string>('')
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: `-${offset}px 0px 0px 0px`, threshold: 0.5 }
    )
    
    for (const id of sectionIds) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    
    return () => observer.disconnect()
  }, [sectionIds, offset])
  
  return activeId
}
```

### 2.5 Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Pattern |
|-------------|----------------|-----------------|
| `'use client'` on the entire feature component | Opts out the whole subtree from Server Components — loses streaming, increases bundle | Extract only interactive parts to separate files with `'use client'` on line 1 |
| Passing `className` computation from server to client | Unnecessary — Tailwind classes are strings, always serializable | Calculate classes on whatever side needs them |
| Wrapping a Server Component in a Client Component to add a click handler | The Server Component becomes a client component | Pass the Server Component as `children` prop instead |
| Using `useEffect` to fetch data in a client component | Defeats server-first principle | Fetch on server, pass data as props to client component |
| Importing a server-only module in a `'use client'` file | Build error or runtime error | Keep server imports in server files, pass results as props |

---

## 3. Toast Implementation (Sonner)

### 3.1 Setup in Layout

Sonner requires a `<Toaster>` provider in the root layout. Since it's a client component, it goes in the layout body:

```tsx
// src/app/layout.tsx
import { Toaster } from '@/components/ui/sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lang-depends-on-project"en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

### 3.2 Toaster Styling with Project Tokens

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

### 3.3 Triggering Toasts

**From client events:**

```tsx
'use client'

import { toast } from 'sonner'

export const CopyButton = ({ text }: { text: string }) => {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }
  
  return <Button onClick={handleCopy} variant="ghost">Copy</Button>
}
```

**From server actions (via return value):**

Sonner's `toast()` is a client-only API. Server Actions can't call it directly. Pattern: return a result from the server action, toast from the client based on the result.

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
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }
  
  return (
    <Button onClick={handleDelete} variant="destructive" disabled={isPending}>
      {isPending ? 'Deleting...' : 'Delete'}
    </Button>
  )
}
```

**Undo pattern (ADR-0026 §1.5):**

```tsx
toast('Item archived', {
  action: {
    label: 'Undo',
    onClick: () => restoreItem(id),
  },
  duration: 6000,
})
```

### 3.4 Toast Types and When to Use Each

| Toast Type | When to Use | Duration |
|-----------|-------------|----------|
| `toast.success()` | Completed action: saved, deleted, copied | 4s (auto-dismiss) |
| `toast.error()` | Failed action: network error, validation rejection | 8s or persistent |
| `toast.warning()` | Caution state: approaching limit, unsaved changes | 6s |
| `toast.info()` | Neutral notification: new message, update available | 4s |
| `toast()` with `action` | Undoable action: archive, move, status change | 6s (time to undo) |
| `toast.loading()` → `toast.success()` | Long-running action: file upload, export generation | Until completion |

**Accessibility:** Sonner renders toasts in an `aria-live="polite"` region by default. Error toasts should use `aria-live="assertive"` — Sonner handles this when using `toast.error()`.

---

## 4. Mobile Navigation Implementation

### 4.1 Architecture

Mobile navigation is a composition of server layout + client behavior:

```
MobileNav (Server Component — layout)
  ├── <header> with logo, nav links definition
  └── MobileMenuTrigger.tsx ('use client')
        ├── Hamburger button (trigger)
        └── Sheet/Drawer (Radix Dialog, side-anchored)
              ├── Navigation links
              ├── Focus trap (built-in from Radix)
              └── Body scroll lock (built-in from Radix)
```

### 4.2 Implementation

```tsx
// src/components/layout/header/MobileMenu.tsx
'use client'

import { useState } from 'react'

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'

type NavItem = {
  label: string
  href: string
}

type MobileMenuProps = {
  items: NavItem[]
}

export const MobileMenu = ({ items }: MobileMenuProps) => {
  const [open, setOpen] = useState(false)
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="lg:hidden p-2"
          aria-label="Open menu"
        >
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

### 4.3 Key Implementation Details

- **Focus trap:** Radix Dialog (which Sheet wraps) provides focus trap automatically — no manual implementation needed.
- **Body scroll lock:** Radix Dialog locks body scroll when open — handled automatically.
- **Close on navigation:** Call `setOpen(false)` in link `onClick` — the drawer must close when the user navigates.
- **Close on Escape:** Built-in from Radix — no manual `onKeyDown` handler needed.
- **Responsive breakpoint:** Show hamburger trigger at `lg:hidden`, show desktop nav at `hidden lg:flex`. The server component renders both; CSS hides the wrong one per breakpoint.

### 4.4 AnimatePresence for Enter/Exit

If the project uses Framer Motion for drawer animations instead of CSS (per ADR-0003), compose with Radix's `forceMount` prop:

```tsx
import { AnimatePresence, m } from 'framer-motion'

<SheetContent forceMount>
  <AnimatePresence>
    {open && (
      <m.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', ...springPresets.snappy }}
      >
        {/* nav content */}
      </m.div>
    )}
  </AnimatePresence>
</SheetContent>
```

Gate decorative spring bounce with `useMotionEnabled()` — if reduced motion, use `{ duration: 0.15 }` instead of spring.

---

## 5. Scroll Behavior Implementation

### 5.1 Smooth Scroll Utility

```tsx
// src/lib/scroll.ts

/**
 * Scrolls to a target element, accounting for sticky header offset.
 * Uses CSS scroll-behavior: smooth (respects prefers-reduced-motion automatically).
 */
export const scrollToSection = (sectionId: string, headerOffset = 80) => {
  const element = document.getElementById(sectionId)
  if (!element) return
  
  const y = element.getBoundingClientRect().top + window.scrollY - headerOffset
  window.scrollTo({ top: y, behavior: 'smooth' })
}
```

**CSS-first approach (preferred):**

```css
/* globals.css */
html {
  scroll-behavior: smooth;
}

/* scroll-margin-top accounts for sticky header — set on each section */
[id] {
  scroll-margin-top: 5rem; /* matches header height */
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
```

With this CSS, plain `<a href="#section-id">` anchors work without JavaScript. The `scrollToSection` utility is only needed for programmatic scrolling from event handlers.

### 5.2 Scroll Spy with Intersection Observer

```tsx
// src/hooks/useScrollSpy.ts
'use client'

import { useEffect, useState } from 'react'

type UseScrollSpyOptions = {
  /** CSS selector offset for sticky header (default: 80px) */
  rootMargin?: string
  /** Visibility threshold (0-1, default: 0.4) */
  threshold?: number
}

export const useScrollSpy = (
  sectionIds: string[],
  options: UseScrollSpyOptions = {}
) => {
  const { rootMargin = '-80px 0px 0px 0px', threshold = 0.4 } = options
  const [activeId, setActiveId] = useState<string>(sectionIds[0] ?? '')
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
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
// SectionNav.tsx
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

### 5.3 Scroll Position Preservation

For lists where the user navigates to a detail view and returns:

```tsx
// src/hooks/useScrollPosition.ts
'use client'

import { useEffect } from 'react'

const STORAGE_PREFIX = 'scroll_'

export const useScrollPosition = (key: string) => {
  useEffect(() => {
    // Restore on mount
    const saved = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10))
    }
    
    // Save on unmount
    return () => {
      sessionStorage.setItem(
        `${STORAGE_PREFIX}${key}`,
        String(window.scrollY)
      )
    }
  }, [key])
}
```

---

## 6. Form Interactivity

### 6.1 Connecting React Hook Form to UI Primitives

Per ADR-0012, medium/complex forms use React Hook Form (RHF) with Zod validation. The UI primitives (Input, Select, Textarea from ADR-0023) connect via RHF's `register` or `Controller`:

**Simple field (register):**

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const ProfileForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          {...register('name')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>
    </form>
  )
}
```

**Complex field (Controller) — for Radix Select, custom components:**

```tsx
import { Controller } from 'react-hook-form'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

<Controller
  name="role"
  control={control}
  render={({ field, fieldState }) => (
    <div className="space-y-2">
      <Label htmlFor="role">Role</Label>
      <Select onValueChange={field.onChange} value={field.value}>
        <SelectTrigger
          id="role"
          aria-invalid={!!fieldState.error}
          aria-describedby={fieldState.error ? 'role-error' : undefined}
        >
          <SelectValue placeholder="Select a role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="editor">Editor</SelectItem>
          <SelectItem value="viewer">Viewer</SelectItem>
        </SelectContent>
      </Select>
      {fieldState.error && (
        <p id="role-error" className="text-sm text-destructive" role="alert">
          {fieldState.error.message}
        </p>
      )}
    </div>
  )}
/>
```

### 6.2 Validation Feedback with Correct ARIA

| ARIA Attribute | When | Purpose |
|---------------|------|---------|
| `aria-invalid="true"` | Field has an error | Marks the field as invalid for assistive tech |
| `aria-describedby="field-error"` | Error message is visible | Links the field to its error message |
| `aria-errormessage="field-error"` | Alternative to `aria-describedby` | More explicit (but less supported) — prefer `aria-describedby` |
| `role="alert"` | On the error message element | Announces the error to screen readers when it appears |
| `aria-live="polite"` | On a validation summary region | For form-level error summaries |

### 6.3 Inline Validation on Blur

RHF supports `mode: 'onBlur'` for validate-on-blur, `mode: 'onChange'` for real-time validation. Per ADR-0024 §4.2 form timing:

```tsx
const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onBlur',           // Validate when user leaves field
  reValidateMode: 'onChange', // Re-validate in real-time after first error
})
```

Decision tree from ADR-0024:
- **Create forms (empty fields):** `mode: 'onBlur'` — don't show errors before user attempts input
- **Edit forms (pre-filled):** `mode: 'onBlur'` — same, user is modifying known-good data
- **Search/filter inputs:** `mode: 'onChange'` — immediate feedback is expected

### 6.4 Submit State Management

```tsx
'use client'

import { useTransition } from 'react'

import { useForm } from 'react-hook-form'

export const CreateItemForm = () => {
  const [isPending, startTransition] = useTransition()
  const form = useForm<CreateItemData>({
    resolver: zodResolver(createItemSchema),
  })
  
  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      const result = await createItem(data)
      if (result.success) {
        toast.success('Item created')
        form.reset()
      } else {
        toast.error(result.message)
      }
    })
  })
  
  return (
    <form onSubmit={onSubmit}>
      {/* fields */}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Item'}
      </Button>
    </form>
  )
}
```

Use `useTransition` (not `useFormStatus`) for submit state — it works with both server actions and client-side `fetch`. `useFormStatus` only works with `<form action={serverAction}>` pattern.

### 6.5 Multi-Step Wizard State

Per ADR-0026 §10.1 onboarding wizards and ADR-0020 state management:

```tsx
// src/hooks/useWizard.ts
'use client'

import { useCallback, useState } from 'react'

type UseWizardOptions = {
  totalSteps: number
  initialStep?: number
}

export const useWizard = ({ totalSteps, initialStep = 0 }: UseWizardOptions) => {
  const [currentStep, setCurrentStep] = useState(initialStep)
  
  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, totalSteps - 1))
  }, [totalSteps])
  
  const goPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }, [])
  
  const goTo = useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)))
  }, [totalSteps])
  
  return {
    currentStep,
    totalSteps,
    isFirst: currentStep === 0,
    isLast: currentStep === totalSteps - 1,
    goNext,
    goPrev,
    goTo,
  }
}
```

For wizard data that needs to persist across steps, use a single RHF form instance with conditional field rendering per step — not multiple separate forms. This keeps validation state unified.

---

## 7. State Management for UI Components

### 7.1 Decision Tree (per ADR-0020 Escalation)

```
What kind of state is it?
  → Toggle, open/closed, hover:
    → useState (local to component)
  → Complex local state with multiple transitions (wizard, multi-step flow):
    → useReducer (local, explicit transitions)
  → State shared within a subtree (theme within settings, tab within section):
    → React Context (scoped provider)
  → Global app-wide UI state (sidebar, theme, notification count):
    → Zustand store (global)
  → State that should be shareable via URL (active tab, filter, sort, search, page):
    → URL state (nuqs or useSearchParams)
```

### 7.2 URL State for Shareable UI

When the UI state should be bookmarkable, shareable, or persist across browser navigation:

**Active tab:**
```tsx
'use client'

import { useQueryState } from 'nuqs'

export const ProductTabs = () => {
  const [tab, setTab] = useQueryState('tab', { defaultValue: 'overview' })
  
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="specs">Specifications</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
      </TabsList>
      {/* TabsContent */}
    </Tabs>
  )
}
```

**Filters and search:**
```tsx
'use client'

import { parseAsString, parseAsInteger, useQueryStates } from 'nuqs'

export const useProductFilters = () => {
  return useQueryStates({
    search: parseAsString.withDefault(''),
    category: parseAsString.withDefault('all'),
    sort: parseAsString.withDefault('newest'),
    page: parseAsInteger.withDefault(1),
  })
}
```

### 7.3 Zustand for Global UI State

When state is truly global and needs to be accessed from unrelated components:

```tsx
// src/store/ui-store.ts
import { create } from 'zustand'

type UIState = {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
```

**When NOT to use Zustand** (per ADR-0020):
- Single-component toggle → `useState`
- Two sibling components sharing state → lift state or Context
- URL-representable state → `nuqs`
- Server state → TanStack Query (ADR-0005)

---

## 8. Carousel / Slider Implementation

### 8.1 Embla Carousel Setup

Embla is headless — it provides the behavior, you provide the markup and styles:

```tsx
// src/components/features/carousel/Carousel.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'

import useEmblaCarousel from 'embla-carousel-react'

type CarouselProps = {
  children: React.ReactNode
  options?: { loop?: boolean; align?: 'start' | 'center' | 'end' }
  autoplay?: boolean
  autoplayInterval?: number
}

export const Carousel = ({
  children,
  options = {},
  autoplay = false,
  autoplayInterval = 5000,
}: CarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(options)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [slideCount, setSlideCount] = useState(0)
  
  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])
  
  useEffect(() => {
    if (!emblaApi) return
    setSlideCount(emblaApi.scrollSnapList().length)
    onSelect()
    emblaApi.on('select', onSelect)
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi, onSelect])
  
  // Autoplay with pause on interaction
  useEffect(() => {
    if (!autoplay || !emblaApi) return
    
    let timer: ReturnType<typeof setInterval>
    
    const startAutoplay = () => {
      timer = setInterval(() => emblaApi.scrollNext(), autoplayInterval)
    }
    
    const stopAutoplay = () => clearInterval(timer)
    
    startAutoplay()
    emblaApi.on('pointerDown', stopAutoplay)
    emblaApi.on('pointerUp', startAutoplay)
    
    return () => {
      stopAutoplay()
      emblaApi.off('pointerDown', stopAutoplay)
      emblaApi.off('pointerUp', startAutoplay)
    }
  }, [emblaApi, autoplay, autoplayInterval])
  
  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Image carousel"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {children}
        </div>
      </div>
      
      {/* Navigation arrows */}
      <button
        onClick={() => emblaApi?.scrollPrev()}
        disabled={!canScrollPrev}
        aria-label="Previous slide"
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/80 p-2 disabled:opacity-30"
      >
        ←
      </button>
      <button
        onClick={() => emblaApi?.scrollNext()}
        disabled={!canScrollNext}
        aria-label="Next slide"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/80 p-2 disabled:opacity-30"
      >
        →
      </button>
      
      {/* Indicator dots */}
      <div
        className="mt-4 flex justify-center gap-2"
        role="tablist"
        aria-label="Slide indicators"
      >
        {Array.from({ length: slideCount }).map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === selectedIndex}
            aria-label={`Go to slide ${i + 1}`}
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              i === selectedIndex ? 'bg-primary' : 'bg-muted'
            )}
            onClick={() => emblaApi?.scrollTo(i)}
          />
        ))}
      </div>
    </div>
  )
}

export const CarouselSlide = ({ children }: { children: React.ReactNode }) => (
  <div
    className="min-w-0 flex-[0_0_100%] px-2"
    role="group"
    aria-roledescription="slide"
  >
    {children}
  </div>
)
```

### 8.2 Carousel Variants

| Variant (ADR-0025 §1) | Embla Config | Slide Sizing |
|-----------------------|-------------|--------------|
| Hero carousel (full-width, 1 slide) | `{ loop: true }` | `flex-[0_0_100%]` |
| Card carousel (multiple visible) | `{ align: 'start' }` | `flex-[0_0_33.33%]` (desktop), `flex-[0_0_80%]` (mobile) |
| Product gallery with thumbnails | Two Embla instances synced via `emblaApi.scrollTo()` on the thumb carousel | Main: full-width, Thumbs: small |

### 8.3 Keyboard Navigation

Embla doesn't provide keyboard navigation out of the box. Add it:

```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'ArrowLeft') {
    emblaApi?.scrollPrev()
    e.preventDefault()
  } else if (e.key === 'ArrowRight') {
    emblaApi?.scrollNext()
    e.preventDefault()
  }
}

// Add to the carousel container
<div
  role="region"
  aria-roledescription="carousel"
  tabIndex={0}
  onKeyDown={handleKeyDown}
>
```

### 8.4 Autoplay and Reduced Motion

Per ADR-0003:
- **Autoplay must pause** on hover, focus, and when `prefers-reduced-motion: reduce` is active
- Gate autoplay with `useMotionEnabled()`:

```tsx
import { useMotionEnabled } from '@/lib/motion/hooks/useMotionEnabled'

const motionEnabled = useMotionEnabled()
const shouldAutoplay = autoplay && motionEnabled
```

### 8.5 Accessibility Checklist

| Requirement | Implementation |
|------------|----------------|
| `role="region"` + `aria-roledescription="carousel"` on container | Identifies the widget |
| `aria-label` on container | Names the carousel |
| `role="group"` + `aria-roledescription="slide"` on each slide | Identifies slides |
| Previous/Next buttons with `aria-label` | Keyboard-accessible navigation |
| Indicator dots as `role="tab"` + `aria-selected` | Screen reader knows which is active |
| Autoplay pauses on hover and focus | Users can read content |
| Autoplay disabled under reduced motion | ADR-0003 requirement |

---

## 9. Data Table Implementation

### 9.1 TanStack Table Setup

TanStack Table is headless — it manages state (sorting, filtering, pagination, selection); you render the markup:

```tsx
// src/components/features/data-table/DataTable.tsx
'use client'

import { useState } from 'react'

import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  pageSize?: number
}

export const DataTable = <TData,>({
  columns,
  data,
  pageSize = 10,
}: DataTableProps<TData>) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: { pageSize },
    },
  })
  
  return (
    <div>
      <div className="rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-medium text-muted-foreground"
                    aria-sort={
                      header.column.getIsSorted() === 'asc'
                        ? 'ascending'
                        : header.column.getIsSorted() === 'desc'
                          ? 'descending'
                          : 'none'
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : header.column.getCanSort()
                        ? (
                          <button
                            className="flex items-center gap-1 hover:text-foreground"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortIcon direction={header.column.getIsSorted()} />
                          </button>
                        )
                        : flexRender(header.column.columnDef.header, header.getContext())
                    }
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-muted/30"
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between px-2 py-4">
        <Typography variant="small" className="text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected
        </Typography>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### 9.2 Server-Side vs Client-Side Decision Tree

```
How much data?
  → <500 rows, unlikely to grow past 1000:
    → Client-side — TanStack Table handles sort/filter/page in browser
    → Data fetched once, passed as prop from server component
  → 500-10000 rows:
    → Server-side pagination + client-side sort/filter
    → URL params for page number, server fetches page slice
  → 10000+ rows or complex search:
    → Full server-side — sort, filter, and page all via API
    → URL params for sort, filter, page — server computes everything
    → Consider virtual scrolling for display (TanStack Virtual)
```

### 9.3 Responsive Patterns

Per ADR-0025 §8:

```
Screen width?
  → ≥768px: Standard table layout
  → <768px: 
    → ≤5 columns: Horizontal scroll with sticky first column
    → >5 columns: Card/list view (each row becomes a card)
```

**Horizontal scroll with sticky column:**

```tsx
<div className="overflow-x-auto">
  <table className="w-full min-w-[600px]">
    {/* First column: sticky left-0 bg-surface z-10 */}
  </table>
</div>
```

**Card view toggle:**

```tsx
const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

// Auto-switch on mobile
useEffect(() => {
  const mq = window.matchMedia('(max-width: 768px)')
  const handler = (e: MediaQueryListEvent) => {
    setViewMode(e.matches ? 'cards' : 'table')
  }
  mq.addEventListener('change', handler)
  setViewMode(mq.matches ? 'cards' : 'table')
  return () => mq.removeEventListener('change', handler)
}, [])
```

### 9.4 Column Definitions Pattern

```tsx
import type { ColumnDef } from '@tanstack/react-table'

import { Checkbox } from '@/components/ui/checkbox'

export const columns: ColumnDef<User>[] = [
  // Selection column
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`Select row ${row.index + 1}`}
      />
    ),
    enableSorting: false,
  },
  // Data columns
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>,
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('role')}</Badge>,
    filterFn: 'equals',
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
  },
  // Actions column
  {
    id: 'actions',
    cell: ({ row }) => <RowActions user={row.original} />,
    enableSorting: false,
  },
]
```

---

## 10. Drag and Drop (dnd-kit)

### 10.1 Setup and Architecture

dnd-kit provides a sensor-based architecture: sensors detect user intent (mouse, touch, keyboard), collision algorithms determine drop targets, and sortable presets handle list reordering.

```
DndContext (provider)
  ├── Sensors: pointer, keyboard
  ├── Collision detection: closestCenter (lists), closestCorners (grids)
  └── SortableContext (for list reordering)
        └── SortableItem (each draggable)
```

### 10.2 Sortable List Implementation

```tsx
// src/components/features/sortable-list/SortableList.tsx
'use client'

import { useState } from 'react'

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers'

type SortableListProps<T extends { id: string }> = {
  items: T[]
  onReorder: (items: T[]) => void
  renderItem: (item: T) => React.ReactNode
}

export const SortableList = <T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: SortableListProps<T>) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // Prevent accidental drags
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    
    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    
    onReorder(arrayMove(items, oldIndex, newIndex))
  }
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul role="listbox" aria-label="Reorderable list">
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id}>
              {renderItem(item)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

const SortableItem = ({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-border bg-surface p-3"
      role="option"
      aria-selected={isDragging}
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="text-muted-foreground" aria-hidden="true" />
      {children}
    </li>
  )
}
```

### 10.3 Kanban Board

Per ADR-0026 §3.3, kanban requires cross-container drag:

```tsx
// Key differences from sortable list:
// 1. Multiple SortableContexts (one per column)
// 2. onDragOver for cross-column movement (not just onDragEnd)
// 3. closestCorners collision detection (2D, not 1D)

<DndContext
  sensors={sensors}
  collisionDetection={closestCorners}
  onDragOver={handleDragOver}   // Move between columns in real-time
  onDragEnd={handleDragEnd}     // Finalize position
>
  {columns.map((column) => (
    <SortableContext
      key={column.id}
      items={column.items.map((i) => i.id)}
      strategy={verticalListSortingStrategy}
    >
      <KanbanColumn column={column} />
    </SortableContext>
  ))}
  
  {/* Drag overlay — renders the dragged item above everything */}
  <DragOverlay>
    {activeItem ? <KanbanCard item={activeItem} /> : null}
  </DragOverlay>
</DndContext>
```

### 10.4 File Drop Zone

For file upload areas (ADR-0026 §8, ADR-0016):

```tsx
'use client'

import { useCallback, useState } from 'react'

type DropZoneProps = {
  onFiles: (files: File[]) => void
  accept?: string[]
  maxSizeMB?: number
}

export const DropZone = ({
  onFiles,
  accept = ['image/*', 'application/pdf'],
  maxSizeMB = 10,
}: DropZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false)
  
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      
      const files = Array.from(e.dataTransfer.files).filter((file) => {
        // Client-side pre-validation (server validates too — ADR-0016)
        if (file.size > maxSizeMB * 1024 * 1024) return false
        if (accept.length > 0) {
          return accept.some((type) => {
            if (type.endsWith('/*')) {
              return file.type.startsWith(type.replace('/*', '/'))
            }
            return file.type === type
          })
        }
        return true
      })
      
      if (files.length > 0) onFiles(files)
    },
    [onFiles, accept, maxSizeMB]
  )
  
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        'flex items-center justify-center rounded-lg border-2 border-dashed p-8',
        'transition-colors cursor-pointer',
        isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground'
      )}
      role="button"
      tabIndex={0}
      aria-label="Drop files here or click to browse"
    >
      <div className="text-center">
        <UploadIcon className="mx-auto mb-2 text-muted-foreground" />
        <Typography variant="body">
          Drag and drop files here, or click to browse
        </Typography>
        <Typography variant="small" className="text-muted-foreground">
          Max {maxSizeMB}MB per file
        </Typography>
      </div>
    </div>
  )
}
```

### 10.5 Accessibility

dnd-kit provides built-in accessibility announcements. Customize them:

```tsx
const announcements = {
  onDragStart: ({ active }: DragStartEvent) =>
    `Picked up item ${active.id}. Use arrow keys to move, space to drop, escape to cancel.`,
  onDragOver: ({ active, over }: DragOverEvent) =>
    over ? `Item ${active.id} is over ${over.id}` : `Item ${active.id} is no longer over a drop target`,
  onDragEnd: ({ active, over }: DragEndEvent) =>
    over ? `Item ${active.id} was dropped on ${over.id}` : `Item ${active.id} was dropped`,
  onDragCancel: () => 'Drag cancelled',
}

<DndContext accessibility={{ announcements }} />
```

---

## 11. Command Palette (cmdk)

### 11.1 Setup

cmdk provides a composable `<Command>` component that implements the WAI-ARIA combobox pattern:

```tsx
// src/components/features/command-palette/CommandPalette.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'

import { Command } from 'cmdk'

import { Dialog, DialogContent } from '@/components/ui/dialog'

export const CommandPalette = () => {
  const [open, setOpen] = useState(false)
  
  // ⌘K / Ctrl+K to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
  
  const runCommand = useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-xs">
          <Command.Input
            placeholder="Type a command or search..."
            className="h-12 w-full border-b border-border bg-transparent px-4 outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            
            <Command.Group heading="Navigation">
              <CommandItem
                onSelect={() => runCommand(() => router.push('/dashboard'))}
              >
                Dashboard
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push('/settings'))}
              >
                Settings
              </CommandItem>
            </Command.Group>
            
            <Command.Separator className="my-1 h-px bg-border" />
            
            <Command.Group heading="Actions">
              <CommandItem
                onSelect={() => runCommand(() => createNewItem())}
              >
                Create new item
              </CommandItem>
            </Command.Group>
            
            <Command.Group heading="Recent">
              {recentItems.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => runCommand(() => router.push(item.href))}
                >
                  {item.title}
                </CommandItem>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandItem = ({
  children,
  onSelect,
}: {
  children: React.ReactNode
  onSelect: () => void
}) => (
  <Command.Item
    onSelect={onSelect}
    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-muted"
  >
    {children}
  </Command.Item>
)
```

### 11.2 cmdk + Radix Dialog

cmdk provides `Command.Dialog` that wraps Radix Dialog internally. However, if you need more control over the dialog (custom animation, custom overlay), use the pattern above: your own Radix Dialog wrapping `<Command>`.

### 11.3 Sections and Search

cmdk performs built-in fuzzy matching on `Command.Item` text content. For custom search logic (API search, weighted results), use `shouldFilter={false}` on `<Command>` and manage filtering yourself.

### 11.4 Platform-Aware Shortcut Display

```tsx
'use client'

import { useEffect, useState } from 'react'

export const useIsMac = () => {
  const [isMac, setIsMac] = useState(false)
  
  useEffect(() => {
    setIsMac(navigator.userAgent.includes('Mac'))
  }, [])
  
  return isMac
}

// In trigger button:
const isMac = useIsMac()
<kbd className="text-xs text-muted-foreground">
  {isMac ? '⌘' : 'Ctrl+'}K
</kbd>
```

---

## 12. Focus Management Utilities

### 12.1 Focus Trap

**For overlay components (Dialog, Sheet, AlertDialog):** Radix provides focus trap automatically. Never build a manual focus trap for these.

**For custom composite widgets** that need focus containment but aren't Radix overlays:

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

### 12.2 Focus Restoration on Close

Radix Dialog/Sheet/AlertDialog restore focus automatically to the trigger element when closed. For custom implementations:

```tsx
// src/hooks/useFocusRestore.ts
'use client'

import { useEffect, useRef } from 'react'

export const useFocusRestore = (isOpen: boolean) => {
  const triggerRef = useRef<HTMLElement | null>(null)
  
  useEffect(() => {
    if (isOpen) {
      // Save the currently focused element
      triggerRef.current = document.activeElement as HTMLElement
    } else if (triggerRef.current) {
      // Restore focus when closed
      triggerRef.current.focus()
      triggerRef.current = null
    }
  }, [isOpen])
}
```

### 12.3 Skip Link

Per ADR-0019, every page must have a skip-to-content link:

```tsx
// src/components/layout/SkipLink.tsx (Server Component — no interactivity needed)
export const SkipLink = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
  >
    Skip to main content
  </a>
)
```

Place in root layout, before the header. Target `<main id="main-content">`.

### 12.4 Roving Tabindex

For composite widgets (toolbars, radio groups, tab lists) where Arrow keys move between items and Tab moves to the next widget:

```tsx
// src/hooks/useRovingTabindex.ts
'use client'

import { useCallback, useState } from 'react'

export const useRovingTabindex = (itemCount: number) => {
  const [focusedIndex, setFocusedIndex] = useState(0)
  
  const getTabIndex = useCallback(
    (index: number) => (index === focusedIndex ? 0 : -1),
    [focusedIndex]
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
    [itemCount]
  )
  
  return { focusedIndex, setFocusedIndex, getTabIndex, handleKeyDown }
}
```

**Note:** Radix components (Tabs, RadioGroup, ToggleGroup, NavigationMenu) implement roving tabindex internally. Only use this hook for custom composite widgets not built on Radix.

---

## 13. Keyboard Shortcut System

### 13.1 Registration Pattern

```tsx
// src/hooks/useKeyboardShortcut.ts
'use client'

import { useEffect } from 'react'

type KeyCombo = {
  key: string
  meta?: boolean   // ⌘ on Mac, Ctrl on Windows
  shift?: boolean
  alt?: boolean
}

type ShortcutOptions = {
  /** Prevent default browser behavior */
  preventDefault?: boolean
  /** Only fire when no input/textarea is focused */
  ignoreInputs?: boolean
}

export const useKeyboardShortcut = (
  combo: KeyCombo,
  callback: () => void,
  options: ShortcutOptions = {}
) => {
  const { preventDefault = true, ignoreInputs = true } = options
  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when typing in inputs
      if (ignoreInputs) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        if ((e.target as HTMLElement).isContentEditable) return
      }
      
      const metaMatch = combo.meta ? (e.metaKey || e.ctrlKey) : true
      const shiftMatch = combo.shift ? e.shiftKey : !e.shiftKey
      const altMatch = combo.alt ? e.altKey : !e.altKey
      
      if (e.key.toLowerCase() === combo.key.toLowerCase() && metaMatch && shiftMatch && altMatch) {
        if (preventDefault) e.preventDefault()
        callback()
      }
    }
    
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [combo, callback, preventDefault, ignoreInputs])
}
```

### 13.2 Scoping (Global vs Component)

| Scope | Pattern | Example |
|-------|---------|---------|
| Global | `useKeyboardShortcut` in a layout-level client component | ⌘K (command palette), ⌘/ (help) |
| Component | `useKeyboardShortcut` inside a specific component, registered on mount | Escape (close modal), Enter (submit) |
| Conditional | Pass `enabled` flag to the hook, or conditionally register | Shortcuts active only when a panel is open |

### 13.3 Reserved Shortcuts (Never Override)

Per ADR-0026 §15.4:

| Shortcut | Browser Function | Never Override |
|----------|-----------------|----------------|
| ⌘C / Ctrl+C | Copy | ✅ |
| ⌘V / Ctrl+V | Paste | ✅ |
| ⌘Z / Ctrl+Z | Undo | ✅ (unless app has custom undo) |
| ⌘T / Ctrl+T | New tab | ✅ |
| ⌘W / Ctrl+W | Close tab | ✅ |
| ⌘L / Ctrl+L | Address bar | ✅ |
| F5 / ⌘R | Refresh | ✅ |
| Tab | Tab navigation | ✅ (never capture globally) |

### 13.4 Discoverable Shortcut Help

```tsx
// Pattern: ? key opens shortcut help sheet
useKeyboardShortcut({ key: '?' }, () => setShortcutHelpOpen(true))
```

Display shortcuts in a Sheet/Dialog with grouped sections. Use `<kbd>` elements for key display:

```tsx
<div className="flex items-center justify-between py-1">
  <span className="text-sm text-foreground">Open command palette</span>
  <div className="flex gap-1">
    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono">
      {isMac ? '⌘' : 'Ctrl'}
    </kbd>
    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono">
      K
    </kbd>
  </div>
</div>
```

---

## 14. Reduced Motion Integration

### 14.1 How Interactive Components Connect to ADR-0003

The project's motion system uses `useMotionEnabled()` (positive logic — `true` means motion is allowed). Interactive components must integrate with this:

| Interactive Element | Reduced Motion Behavior |
|-------------------|------------------------|
| Dialog/Sheet enter/exit animation | Simplify to fade-only (no slide/scale). Keep the transition — it's functional (user needs to see overlay appear) |
| Carousel auto-advance | **Disable entirely** — autoplay with reduced motion is an accessibility violation |
| Carousel slide transition | Snap instantly (no slide animation) |
| Drag-and-drop move animation | Snap to position (no spring/ease) |
| Toast enter/exit | Simplify to fade-only (no slide from edge) |
| Tab panel switch | Instant switch (no crossfade) |
| Accordion expand/collapse | Instant expand (no height animation) |
| Scroll-to-section | `scroll-behavior: auto` (instant jump) |
| Command palette open/close | Fade-only (no scale/slide) |
| Loading spinners | **Keep** — functional, not decorative (but use `opacity` pulse, not `rotate`) |

### 14.2 Implementation Pattern

```tsx
'use client'

import { useMotionEnabled } from '@/lib/motion/hooks/useMotionEnabled'

export const AnimatedDialog = () => {
  const motionEnabled = useMotionEnabled()
  
  return (
    <DialogContent
      className={cn(
        motionEnabled
          ? 'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95'
          : 'data-[state=open]:animate-in data-[state=open]:fade-in-0'
        // ^ Reduced: fade only, no zoom
      )}
    >
      {/* content */}
    </DialogContent>
  )
}
```

### 14.3 CSS-First Approach (Preferred)

When animations are defined in CSS (via Tailwind's animate utilities), use the media query directly:

```css
@media (prefers-reduced-motion: reduce) {
  [data-state='open'] {
    animation-duration: 0.01ms !important;
  }
  [data-state='closed'] {
    animation-duration: 0.01ms !important;
  }
}
```

This blanket approach works for all Radix `data-state` animations. The `!important` is acceptable here as it's a motion override for accessibility.

### 14.4 Decision: CSS vs JS Reduced Motion

```
Is the animation defined in CSS (@keyframes, Tailwind animate)?
  → YES: Use CSS @media (prefers-reduced-motion: reduce) — automatic, no JS needed
Is the animation defined in JS (Framer Motion, Embla autoplay)?
  → YES: Use useMotionEnabled() to gate or simplify
Is the animation functional (loading spinner, progress bar)?
  → YES: Keep it — just simplify (opacity pulse instead of rotation)
```

---

## 15. Testing Interactive Components

### 15.1 Testing Radix Components with React Testing Library

Radix components render real DOM nodes — they work with RTL without mocking:

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
      </Dialog>
    )
    
    // Dialog content not visible initially
    expect(screen.queryByText('Dialog content')).not.toBeInTheDocument()
    
    // Click trigger
    await user.click(screen.getByText('Open'))
    
    // Content visible
    expect(screen.getByText('Dialog content')).toBeInTheDocument()
    
    // Escape closes
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
      </Dialog>
    )
    
    await user.click(screen.getByText('Open'))
    
    // Tab cycles within dialog, never escapes to trigger
    await user.tab()
    expect(screen.getByText('First')).toHaveFocus()
    await user.tab()
    expect(screen.getByText('Second')).toHaveFocus()
    await user.tab()
    // Wraps back to first focusable in dialog
    expect(screen.getByText('First')).toHaveFocus()
  })
})
```

### 15.2 Testing Focus Management

```tsx
it('restores focus to trigger after dialog closes', async () => {
  const user = userEvent.setup()
  
  render(
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <button>Close</button>
      </DialogContent>
    </Dialog>
  )
  
  await user.click(screen.getByText('Open'))
  await user.keyboard('{Escape}')
  
  expect(screen.getByText('Open')).toHaveFocus()
})
```

### 15.3 Testing Keyboard Navigation

```tsx
describe('Tabs keyboard navigation', () => {
  it('supports arrow key navigation between tabs', async () => {
    const user = userEvent.setup()
    
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
        <TabsContent value="tab3">Content 3</TabsContent>
      </Tabs>
    )
    
    // Focus first tab
    await user.tab()
    expect(screen.getByText('Tab 1')).toHaveFocus()
    
    // Arrow right moves to next tab
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('Tab 2')).toHaveFocus()
    
    // Content updates
    expect(screen.getByText('Content 2')).toBeInTheDocument()
  })
})
```

### 15.4 Mocking Intersection Observer

```tsx
// tests/setup.ts or individual test file
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})
window.IntersectionObserver = mockIntersectionObserver

// To test scroll spy behavior:
it('updates active section on intersection', () => {
  let intersectionCallback: IntersectionObserverCallback
  
  window.IntersectionObserver = vi.fn((callback) => {
    intersectionCallback = callback
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }
  }) as unknown as typeof IntersectionObserver
  
  render(<SectionNav />)
  
  // Simulate section becoming visible
  intersectionCallback(
    [{ isIntersecting: true, target: { id: 'features' } }] as IntersectionObserverEntry[],
    {} as IntersectionObserver
  )
  
  expect(screen.getByText('Features')).toHaveAttribute('aria-current', 'true')
})
```

### 15.5 Testing Drag and Drop

dnd-kit's sensor system makes testing possible with synthetic events:

```tsx
import { fireEvent } from '@testing-library/react'

it('reorders items via keyboard', async () => {
  const user = userEvent.setup()
  const onReorder = vi.fn()
  
  render(
    <SortableList
      items={[{ id: '1', name: 'A' }, { id: '2', name: 'B' }]}
      onReorder={onReorder}
      renderItem={(item) => <span>{item.name}</span>}
    />
  )
  
  // Focus first item
  const firstItem = screen.getByText('A').closest('[role="option"]')!
  firstItem.focus()
  
  // Space to pick up, ArrowDown to move, Space to drop
  await user.keyboard(' ')
  await user.keyboard('{ArrowDown}')
  await user.keyboard(' ')
  
  expect(onReorder).toHaveBeenCalledWith([
    { id: '2', name: 'B' },
    { id: '1', name: 'A' },
  ])
})
```

### 15.6 E2E Testing with Playwright

For interactive components that require real browser behavior:

```tsx
// tests/e2e/command-palette.spec.ts
import { expect, test } from '@playwright/test'

test('command palette opens with ⌘K and navigates', async ({ page }) => {
  await page.goto('/')
  
  // Open command palette
  await page.keyboard.press('Meta+k')
  
  // Verify it's open
  await expect(page.getByPlaceholder('Type a command or search...')).toBeVisible()
  
  // Type to search
  await page.keyboard.type('settings')
  
  // Navigate with arrow keys
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  
  // Verify navigation happened
  await expect(page).toHaveURL('/settings')
})
```

---

## Anti-Patterns

### Implementation Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Pattern |
|-------------|----------------|-----------------|
| `'use client'` on entire page/feature | Opts out entire subtree from server rendering, increases bundle | Extract only interactive parts to separate files with `'use client'` on line 1 (§2) |
| Building custom focus trap for dialogs | Radix provides this automatically, custom traps miss edge cases | Use Radix Dialog/AlertDialog/Sheet for overlays (§1.1) |
| `onClick` on `<div>` for interactive elements | Not keyboard accessible, no implicit ARIA role | Use `<button>` for actions, `<a>` for navigation (ADR-0019) |
| Importing `@radix-ui/*` in feature components | Breaks import boundaries, couples features to library internals | Import from `@/components/ui/*` barrels (§1.4) |
| `react-beautiful-dnd` for drag and drop | Archived/unmaintained, no keyboard sensor by default | dnd-kit with keyboard sensor (§10) |
| Global `useEffect` for keyboard shortcuts | No scoping, no conflict detection, listener leaks | `useKeyboardShortcut` hook with input filtering (§13) |
| Manual `window.scroll` without offset | Scrolls under sticky header | `scrollToSection` utility with header offset (§5.1) |
| `useFormStatus` for all submit states | Only works with `<form action={...}>` pattern | `useTransition` for universal submit state (§6.4) |
| Carousel with only swipe/touch support | Keyboard users and screen readers can't navigate | Embla + keyboard handler + ARIA roles (§8) |
| Toaster without project token styling | Breaks design consistency, uses default colors | Style via `classNames` prop on `<Toaster>` (§3.2) |

### Library Anti-Patterns

| Anti-Pattern | Why It's Wrong | Use Instead |
|-------------|----------------|-------------|
| Custom tooltip implementation | Missing delay management, collision detection, ARIA | Radix Tooltip (via shadcn/ui) |
| `react-dnd` for drag and drop | Complex API, large bundle, not actively maintained | dnd-kit |
| Custom command palette search | Missing fuzzy matching, accessibility, keyboard nav | cmdk |
| `ag-grid` or similar for data tables | Heavy, opinionated styling, conflicts with Tailwind-only (ADR-0002) | TanStack Table (headless) |
| Inline `<style>` or CSS modules for component animation | Violates Tailwind-only rule (ADR-0002) | Tailwind animate utilities or Framer Motion |
| `react-toast` / `react-hot-toast` | Less maintained, duplicates Sonner's functionality | Sonner (pre-approved) |
| `focus-trap-react` for overlays | Radix already provides this, adding both creates conflicts | Radix's built-in focus trap |

### State Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Pattern |
|-------------|----------------|-----------------|
| Zustand for a single component's open/close state | Over-engineering — ADR-0020 escalation says start with `useState` | `useState` for local toggles |
| `useContext` for global theme/sidebar | Context re-renders all consumers on any change | Zustand with selectors for global UI state |
| Tab value in React state instead of URL | Not shareable, lost on refresh | `nuqs` or `useSearchParams` for shareable UI state |
| `localStorage` for filter/sort state | Not shareable, not in URL, harder to debug | URL state for shareable, Zustand for non-shareable |
| Prop drilling through 4+ levels to avoid state library | Unreadable, fragile | Context (2-3 levels) or Zustand (4+) per ADR-0020 |

---

## Library Compatibility

| Library | Status | Purpose | Notes |
|---------|--------|---------|-------|
| Radix Primitives (via shadcn/ui) | `recommended` | Dialog, Sheet, AlertDialog, DropdownMenu, Tabs, Accordion, Tooltip, Popover, NavigationMenu, Toggle, Select | Pre-approved (ADR-0002/ADR-0023). Handles focus trap, roving tabindex, ARIA automatically |
| Sonner | `recommended` | Toast notifications with accessible `aria-live` regions | Pre-approved. Custom styling via `classNames` prop |
| cmdk | `recommended` | Command palette with fuzzy search, keyboard navigation, accessible combobox | ~3kB. By Paco Coursey. Pairs with Radix Dialog. Actively maintained |
| Embla Carousel | `recommended` | Headless carousel/slider with React hooks API, plugin system | Headless, framework-agnostic core, React wrapper. SSR-safe. Actively maintained |
| TanStack Table | `recommended` | Headless data table with sort, filter, pagination, row selection, column visibility | Headless, React hooks API. Framework-agnostic core. Actively maintained |
| dnd-kit | `recommended` | Drag-and-drop: sortable lists, kanban, grid reorder, file drop zones | Keyboard sensor built-in, accessible by default. Actively maintained |
| nuqs | `compatible` | Type-safe URL state management | Per ADR-0020. Install when URL state is needed for filters/tabs/search |
| Framer Motion (via `@/lib/motion`) | `recommended` | Overlay enter/exit animations, AnimatePresence, spring presets | Default dependency per ADR-0003 |
| Zustand | `compatible` | Global UI state (sidebar, theme, notification count) | Per ADR-0020 escalation rules. Install when Context is insufficient |
| React Hook Form | `compatible` | Form interactivity for medium/complex forms | Per ADR-0012. Install when HTML forms are insufficient |
| `react-beautiful-dnd` | `forbidden` | Drag and drop | Archived by Atlassian. Unmaintained. Use dnd-kit |
| `react-dnd` | `forbidden` | Drag and drop | Complex API, large bundle, not actively maintained. Use dnd-kit |
| `ag-grid` / `react-data-grid` | `forbidden` | Data tables | Opinionated styling, conflicts with Tailwind-only. Use TanStack Table |
| `react-hot-toast` / `react-toastify` | `forbidden` | Toasts | Sonner is the project standard. No duplicates |
| `focus-trap-react` | `forbidden` | Focus trap | Radix provides built-in. Adding both creates conflicts |
| Any CSS-in-JS animation library | `forbidden` | Animations | Violates ADR-0002 (no CSS-in-JS runtime). Use Tailwind animate or Framer Motion |
| Swiper | `compatible` | Carousel (if Embla can't cover use case) | Heavier, has built-in styles. Must disable default CSS and restyle with project tokens |

---

## Consequences

**Positive:**
- Every interactive pattern from ADRs 0024-0026 has a concrete implementation path — library, code structure, accessibility, and testing approach
- Radix-to-pattern mapping eliminates guessing about which headless primitive to use for each UX pattern
- Client boundary extraction pattern prevents the #1 Next.js anti-pattern (marking entire features as `'use client'`)
- Library choices are pre-evaluated for compatibility with the project stack (headless, Tailwind-native, actively maintained)
- Focus management is handled by Radix for overlays — custom focus code is only needed for non-Radix composite widgets
- Reduced motion integration follows a clear decision tree (CSS for CSS animations, `useMotionEnabled()` for JS animations, always keep functional transitions)
- Testing patterns cover the three hardest areas of interactive component testing: focus management, keyboard navigation, and Intersection Observer mocking
- State management decisions follow ADR-0020 escalation, preventing both under-engineering (prop drilling) and over-engineering (Zustand for local state)

**Negative:**
- Multiple library recommendations increase the overall dependency surface — each new library is a learning curve and maintenance burden
- dnd-kit's sensor/collision/sortable model has a steeper learning curve than simpler drag libraries (but the accessibility and flexibility justify it)
- Embla Carousel requires manual keyboard handler implementation — it doesn't provide this out of the box (code provided in §8.3)
- cmdk is a relatively small library by a single maintainer — consider fallback plan if it becomes unmaintained (the Radix Dialog wrapper pattern makes replacement straightforward)
- TanStack Table's headless approach means no pre-built table UI — every feature (sort indicators, filter UI, pagination controls) must be built. This is intentional (Tailwind-only constraint) but increases initial effort

## Related ADRs

- [ADR-0002](./0002-styling.md) — Styling (Tailwind-only rule, library compatibility table, token contract for Radix restyling)
- [ADR-0003](./0003-animation.md) — Animation (`useMotionEnabled()`, spring presets, AnimatePresence, reduced motion three-layer strategy)
- [ADR-0004](./0004-components.md) — Component Structure (server/client boundary, `'use client'` minimization, tier system, import boundaries)
- [ADR-0005](./0005-data-fetching.md) — Data Fetching (TanStack Query for client-side data in data tables, polling for real-time)
- [ADR-0009](./0009-testing.md) — Testing (Vitest + RTL, Playwright E2E, `@testing-library/user-event` for keyboard/focus testing)
- [ADR-0012](./0012-forms.md) — Forms (React Hook Form + Zod, Server Actions, validation timing, multi-step wizards)
- [ADR-0016](./0016-file-upload-storage.md) — File Upload (server-side validation, presigned URLs — DropZone is client-side complement)
- [ADR-0019](./0019-accessibility.md) — Accessibility (WCAG 2.1 AA compliance, ARIA patterns, keyboard navigation, focus management, skip links)
- [ADR-0020](./0020-state-management.md) — State Management (escalation ladder: useState → useReducer → Context → Zustand. URL state for shareable UI)
- [ADR-0023](./0023-ui-foundation-primitives.md) — UI Foundation Primitives (Optional tier: Dialog, Sheet, Tabs, Accordion, Toast, DropdownMenu, Tooltip)
- [ADR-0024](./0024-ux-interaction-patterns.md) — UX Interaction Patterns (navigation, CTAs, feedback, form UX timing, keyboard/focus patterns this ADR implements)
- [ADR-0025](./0025-ux-content-display-patterns.md) — UX Content Display Patterns (carousels, tabs, accordions, data tables, pagination patterns this ADR implements)
- [ADR-0026](./0026-ux-application-patterns.md) — UX Application Patterns (CRUD, search, drag-and-drop, dashboards, onboarding patterns this ADR implements)
