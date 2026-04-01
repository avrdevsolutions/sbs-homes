---
name: impl-radix-client-state
description: >-
  Radix UI pattern-to-component mapping (Dialog→modal, Sheet→slide-over,
  AlertDialog→confirm, DropdownMenu, Tooltip, Tabs, Accordion, NavigationMenu),
  when-to-use-Radix decision tree, shadcn/ui file structure, project-token
  restyling rules and className override depth. Client boundary extraction —
  'use client' directive, props serialization rules, three server+client
  composition patterns. UI state management escalation — useState→useReducer→
  Context→Zustand→URL state with nuqs. Use when building overlays, dialogs,
  sheets, dropdown menus, tabs, accordions, tooltips, choosing a 'use client'
  boundary, or deciding between useState / Zustand / URL state.
---

# Interactive Component Architecture — Radix, Client Boundaries & State

**Compiled from**: ADR-0027 §1 (Radix UI Primitives), §2 (Client Boundary Extraction), §7 (State Management for UI Components)
**Last synced**: 2026-03-22

---

## 1. Radix Pattern-to-Component Mapping

Every pattern that needs overlay positioning, focus trap, dismiss-on-Escape, roving tabindex, or ARIA role management maps to a specific Radix component via shadcn/ui:

| UX Pattern | Radix Component | shadcn/ui Name | Notes |
|-----------|-----------------|----------------|-------|
| Modal / edit dialog | `Dialog` | `Dialog` | Centered overlay, built-in focus trap |
| Slide-over panel | `Dialog` (side-anchored) | `Sheet` | Anchored left/right/top/bottom |
| Destructive confirmation | `AlertDialog` | `AlertDialog` | No accidental close-on-overlay-click |
| Dropdown / kebab menu | `DropdownMenu` | `DropdownMenu` | Context menu, bulk actions |
| Tooltip hint | `Tooltip` | `Tooltip` | Hover/focus, delay-managed |
| Tabs | `Tabs` | `Tabs` | Roving tabindex built-in |
| Accordion | `Accordion` | `Accordion` | Single/multi-open |
| Desktop mega-menu | `NavigationMenu` | `NavigationMenu` | Viewport positioning |
| Rich popover | `Popover` | `Popover` | Rich tooltip alternative |
| Toggle / toggle group | `Toggle` / `ToggleGroup` | `Toggle` | Pressed/unpressed, mutual exclusion |
| Select dropdown | `Select` | `Select` | Styled native-feel dropdown |
| Command palette | cmdk wraps `Dialog` | Custom | cmdk provides accessible combobox |
| Toast | Sonner (standalone) | `Sonner` | Not a Radix component |

## 2. When to Use Radix vs Build Custom

```
Does the pattern need: overlay positioning, focus trap, dismiss-on-Escape,
roving tabindex, or ARIA role management?
  → YES → Use Radix (via shadcn/ui)
    → Matching shadcn/ui component exists?
      → YES → Use it, restyle with project tokens
      → NO → Install Radix primitive directly, build wrapper in src/components/ui/
  → NO → Simple toggle, visibility switch, button variant?
    → YES → Native HTML + React state + ARIA attributes
    → NO → Complex composite widget (data table, carousel, DnD)?
      → YES → Use recommended headless library (TanStack Table, Embla, dnd-kit)
      → NO → Build custom — document the choice
```

## 3. Radix Component File Structure

```
src/components/ui/
  dialog/
    Dialog.tsx        # 'use client' — wraps @radix-ui/react-dialog
    index.ts          # Barrel: export { Dialog, DialogContent, DialogHeader, ... }
  dropdown-menu/
    DropdownMenu.tsx
    index.ts
  accordion/
    Accordion.tsx
    index.ts
  sheet/
    Sheet.tsx         # Side-anchored Dialog variant
    index.ts
  alert-dialog/
    AlertDialog.tsx
    index.ts
```

Each component: has `'use client'`, re-exports all compound parts (e.g. `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogClose`), applies project-token styling internally, exposes `className` on every part. Feature and layout code imports from `@/components/ui/dialog` — never from `@radix-ui/react-dialog`.

## 4. Styling Radix Components with Project Tokens

```tsx
// ✅ Project tokens only — no gray-100, slate-200, zinc-300, etc.
const DialogContent = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) => (
  <DialogPrimitive.Content
    className={cn(
      'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
      'w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-lg',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      className
    )}
    {...props}
  />
)
```

| Override level | Allowed? |
|---------------|----------|
| Wrapper-level `className` prop | ✅ Always |
| cva variant props | ✅ Preferred |
| Deep child selectors | ❌ Forbidden |
| `!important` on Radix internals | ❌ Forbidden |

## 5. Client Boundary Extraction

**The pattern**: Server Component retains layout, content, and data fetching. Only the interactive behavior goes in a thin wrapper with `'use client'` on line 1.

```
ServerComponent (page or feature)
  └── Static layout + content (HTML, primitives, data)
  └── <InteractiveWidget.client>    ← 'use client', minimal
        └── state, event handlers, Radix behavior
        └── {children}              ← Server Component children pass through
```

**Client boundary convention:**

```
src/components/features/pricing/
  PricingSection.tsx          # Server Component — layout, content, data
  PricingToggle.tsx           # 'use client' on line 1 — toggle state only
  index.ts
```

## 6. Props Serialization Rules

Props from Server Component → Client Component must be serializable (Next.js constraint):

| Allowed | Not Allowed |
|---------|-------------|
| `string`, `number`, `boolean` | Functions / callbacks |
| `null`, `undefined` | Class instances |
| Plain objects `{ key: value }` | `Date` — use ISO string instead |
| Arrays of serializable values | `Map`, `Set`, `Symbol`, `RegExp` |
| JSX (`children`) | — |

**Event handlers** — use Server Actions (special case, serializable by reference):

```tsx
// PricingSection.tsx (Server Component)
import { updatePlan } from './actions'

<PricingToggle updatePlanAction={updatePlan} />  // ✅ server action reference is serializable

// PricingToggle.tsx ('use client')
export const PricingToggle = ({ updatePlanAction }: { updatePlanAction: (plan: string) => Promise<void> }) => {
  const [isPending, startTransition] = useTransition()
  const handleToggle = (plan: string) => startTransition(() => updatePlanAction(plan))
  // ...
}
```

## 7. Composition Patterns

**Pattern A — Server layout wraps client interactive:**

```tsx
// ProductCard.tsx (Server Component)
export const ProductCard = ({ product }: { product: Product }) => (
  <div className="rounded-lg border border-border bg-surface p-4">
    <img src={product.image} alt={product.name} />
    <Typography variant="h3">{product.name}</Typography>
    <AddToCartButton productId={product.id} />  {/* 'use client' */}
  </div>
)
```

**Pattern B — Client wrapper accepts server children:**

```tsx
// AccordionSection.tsx (Server Component)
<AccordionWrapper>  {/* 'use client' — state only */}
  {items.map((item) => (
    <AccordionItem key={item.id} value={item.id}>
      <AccordionTrigger>{item.question}</AccordionTrigger>
      <AccordionContent>
        <Typography variant="body">{item.answer}</Typography>
      </AccordionContent>
    </AccordionItem>
  ))}
</AccordionWrapper>
```

**Pattern C — Reusable behavior hook** (non-UI-specific interactivity → `src/hooks/`):

```tsx
// useScrollSpy, useLocalStorage, useDebounce etc. extracted as hooks
// Hook files use 'use client' at the top; they are discovered by the consuming client component
```

## 8. State Management Decision Tree

```
Toggle, open/closed, hover → useState (local)
Complex local state with multiple transitions (wizard, multi-step) → useReducer
Shared within a subtree (theme in settings, tab in one section) → React Context
Global UI state (sidebar open, theme, notification count) → Zustand store
State that should survive navigation / be shareable via URL → nuqs / useSearchParams
```

## 9. URL State for Shareable UI

```tsx
'use client'
import { useQueryState } from 'nuqs'

// Active tab (URL: ?tab=specs)
export const ProductTabs = () => {
  const [tab, setTab] = useQueryState('tab', { defaultValue: 'overview' })
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="specs">Specifications</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
```

```tsx
// Filters + search + pagination
import { parseAsString, parseAsInteger, useQueryStates } from 'nuqs'

export const useProductFilters = () =>
  useQueryStates({
    search: parseAsString.withDefault(''),
    category: parseAsString.withDefault('all'),
    sort: parseAsString.withDefault('newest'),
    page: parseAsInteger.withDefault(1),
  })
```

## 10. Zustand for Global UI State

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
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
```

## Anti-Patterns

| ❌ Anti-Pattern | ✅ Correct Pattern |
|----------------|-------------------|
| `'use client'` on entire page/feature | Extract only interactive parts to separate files with `'use client'` on line 1 |
| Custom focus trap for Dialog/Sheet/AlertDialog | Radix built-in focus trap — never build manually for overlays |
| `<div onClick>` for interactive elements | `<button>` for actions, `<a>` for navigation |
| Importing `@radix-ui/*` in feature/layout code | Import from `@/components/ui/*` barrels only |
| `useEffect` to fetch data in client component | Fetch on server, pass data as props |
| Wrapping Server Component in Client just for `onClick` | Pass the Server Component as `children` prop |
| Zustand for a single component's toggle state | `useState` — escalate only when truly needed |
| `localStorage` for shareable filter/sort state | URL state (nuqs) for shareable; Zustand for non-shareable |
