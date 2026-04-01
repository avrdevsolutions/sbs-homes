# ADR-0020: State Management

**Status**: Accepted
**Date**: 2026-03-02
**Supersedes**: N/A

---

## Context

The template is server-first (ADR-0001): Server Components fetch data directly, Server Actions handle mutations, and TanStack Query manages client-side server-state (ADR-0005). This eliminates the traditional SPA need for a global client-side cache of server data. What remains is **pure UI state** — modal open/closed, sidebar collapsed, theme preference, multi-step wizard progress, active filters, selected items. No ADR currently governs how to manage this state, when to use React built-ins vs. a third-party store, or what's forbidden and why. The approved libraries reference lists Zustand but points to ADR-0001, which doesn't discuss state management. This ADR fills that gap.

## Decision

**React built-ins (`useState`, `useReducer`, `useContext`) by default. Zustand as the sole third-party state library when React built-ins break down. No other state libraries permitted.**

---

## Rationale

### Why React Built-ins First

In a server-first architecture, most "state" never reaches the client:

| State Category | Where It Lives | Tool |
|---------------|---------------|------|
| Server/remote data | Server Components, TanStack Query | ADR-0005 |
| URL state (filters, pagination, tabs) | URL search params | `useSearchParams`, `<Link>` |
| Form state | Form inputs, Server Actions | ADR-0012 |
| **Component-local UI state** | **`useState` / `useReducer`** | **This ADR** |
| **Shared UI state (narrow subtree)** | **React Context** | **This ADR** |
| **Shared UI state (cross-cutting)** | **Zustand** | **This ADR** |

After server state, URL state, and form state are handled by purpose-built tools, the remaining client state is small and simple. `useState` handles component-local state. `useReducer` handles complex local state with multiple transitions. `useContext` shares state within a narrow subtree (e.g., an accordion, a compound component). These cover 80%+ of real-world client state needs with zero additional dependencies.

### Why Zustand as the Sole Escalation

React Context has known limitations:

1. **Re-render blast radius** — Every consumer re-renders when any value in the context changes, regardless of which value they read. This forces either splitting into many contexts or accepting wasted renders.
2. **Provider nesting** — Multiple contexts create deeply nested provider trees that are hard to read and maintain.
3. **No access outside React** — Context values can't be read in utility functions, event handlers detached from components, or middleware.
4. **No built-in selectors** — Components can't subscribe to a slice of context; it's all or nothing.

Zustand solves all four:

| Problem | Zustand Solution |
|---------|-----------------|
| Re-render blast radius | Selector-based subscriptions — components only re-render when their selected slice changes |
| Provider nesting | No providers — stores are plain modules |
| Access outside React | `store.getState()` works anywhere (utility functions, middleware, event handlers) |
| No selectors | `useStore(state => state.count)` — fine-grained subscriptions built in; `useShallow` for multi-value selectors |

Additional factors:
- **~1kB gzipped** — negligible bundle impact
- **Zero boilerplate** — no actions, reducers, dispatch, or middleware ceremony
- **Server Component friendly** — no Provider at the root, so layouts remain Server Components
- **TypeScript-first** — full type inference without manual typed hooks
- **Middleware ecosystem** — `persist` (localStorage), `devtools` (Redux DevTools), `immer` (immutable updates) available as opt-in middleware

### Key Factors

1. **Server-first architecture eliminates the primary use case for heavyweight state libraries** — server data caching, normalization, and synchronization are handled by Server Components + TanStack Query
2. **Provider-free stores preserve Server Component boundaries** — Zustand doesn't require wrapping the app in a client-side Provider, unlike Redux, MobX, or Jotai's Provider mode
3. **Selector-based subscriptions prevent unnecessary re-renders** — critical for performance in component-heavy UIs
4. **Minimal API surface matches the remaining problem space** — pure UI state doesn't need Redux's middleware chains, action creators, or normalized entity adapters

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| React built-ins + Zustand | `useState`/`useReducer`/`useContext` by default, Zustand for complex shared state | ✅ Chosen: zero deps for simple cases, minimal dep for complex cases, server-component friendly |
| React built-ins only | No third-party state library ever | ❌ Context re-render issues and provider nesting become painful when 3+ distant components share state |
| Jotai | Atomic state model (bottom-up) | ❌ Unfamiliar mental model, Provider recommended for SSR, overkill for simple shared UI state |
| Redux / RTK | Centralized store with slices, selectors, middleware | ❌ See detailed prohibition below |
| MobX | Observable-based reactive state | ❌ Proxy-based reactivity conflicts with React's model, decorator syntax, Provider required |

### Why Redux / RTK Is Forbidden

Redux was designed for SPAs where the client owns all state — fetching, caching, normalizing server data. In this architecture, that use case doesn't exist:

1. **Core use case eliminated.** Server Components + TanStack Query handle all server-state concerns (fetching, caching, invalidation, optimistic updates). Redux's biggest value — managing server-cache state — is redundant.
2. **Provider-at-root conflicts with Server Components.** Redux requires `<Provider store={store}>` wrapping the entire app, forcing the root layout into a Client Component boundary or requiring a client wrapper component. This undermines the server-first model.
3. **Disproportionate cost for UI state.** After server state is handled, what remains is UI state (modals, sidebars, theme, filters). Redux/RTK is ~40kB+ of slices, reducers, selectors, middleware, devtools configuration, and normalization machinery for a handful of booleans and small objects. Zustand does the same in ~1kB with zero boilerplate.
4. **Boilerplate overhead.** Even with RTK: store configuration, slice definitions, typed hooks (`useAppDispatch`, `useAppSelector`), provider wiring, and often `createAsyncThunk`. Zustand: define a store function, import and use it. Done.
5. **Hydration complexity.** Redux in SSR requires serializing store state on the server and hydrating on the client, with careful handling of mismatches. Zustand stores are client-only by nature (no Provider = no hydration concern).

**Redux and RTK are forbidden. This is not negotiable.**

---

## Implementation Guidelines

### Rules

| Rule | Level |
|------|-------|
| Use `useState` for component-local state | **MUST** |
| Use `useReducer` for complex local state with multiple transitions | **SHOULD** |
| Use React Context for shared state within a narrow subtree (≤3 levels, ≤5 consumers) | **SHOULD** |
| Escalate to Zustand when Context causes re-render issues or state is needed across distant components | **SHOULD** |
| Use Zustand when >3 components in different subtrees share the same state | **MUST** |
| Use Zustand when state must be accessed outside React (utility functions, middleware) | **MUST** |
| Use selectors in Zustand stores — never subscribe to the entire store | **MUST** |
| Use `useShallow` when selecting multiple values as an object or array — prevents re-renders from new references | **MUST** |
| Never use Redux, RTK, MobX, Recoil, or Valtio | **MUST NOT** |
| Never store server/remote data in Zustand — use Server Components or TanStack Query (ADR-0005) | **MUST NOT** |
| Never store URL-derivable state in Zustand — use `searchParams` | **MUST NOT** |
| Never store form state in Zustand — use form handling per ADR-0012 | **MUST NOT** |
| Keep Zustand stores small and focused — one store per domain concern, not one mega-store | **MUST** |
| Use the `persist` middleware for state that must survive page refreshes (e.g., theme preference) | **SHOULD** |
| Use the `devtools` middleware in development for debugging | **SHOULD** |

### Escalation Path

Use this decision tree to choose the right tool:

```
Is the state derived from a URL parameter?
  → YES: useSearchParams / <Link> — not state management
  → NO: ↓

Is the state server/remote data?
  → YES: Server Component or TanStack Query (ADR-0005)
  → NO: ↓

Is the state form input values?
  → YES: Form handling (ADR-0012)
  → NO: ↓

Is the state local to one component?
  → YES: useState (simple) or useReducer (complex transitions)
  → NO: ↓

Is the state shared within a narrow subtree (≤3 levels, ≤5 consumers)?
  → YES: React Context + useReducer
  → NO: ↓

Is the state shared across distant components, or needed outside React?
  → YES: Zustand store
```

### File Locations

```
src/
  stores/                          # All Zustand stores live here
    ui-store.ts                    # Global UI state (sidebar, theme)
    [feature]-store.ts             # Feature-specific stores
    index.ts                       # Barrel export
  hooks/
    use-[store-name].ts            # Optional: custom hooks wrapping store selectors
```

### Code Patterns

#### Level 1: `useState` — Component-Local State

```tsx
// ✅ Correct — simple local toggle
'use client'

import { useState } from 'react'

export const Accordion = ({ title, children }: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>{title}</button>
      {isOpen && <div>{children}</div>}
    </div>
  )
}
```

#### Level 2: `useReducer` — Complex Local State

```tsx
// ✅ Correct — multiple related transitions
'use client'

import { useReducer } from 'react'

type WizardState = {
  step: number
  data: Record<string, unknown>
  errors: string[]
}

type WizardAction =
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SET_DATA'; payload: Record<string, unknown> }
  | { type: 'SET_ERRORS'; payload: string[] }
  | { type: 'RESET' }

const wizardReducer = (state: WizardState, action: WizardAction): WizardState => {
  switch (action.type) {
    case 'NEXT':
      return { ...state, step: state.step + 1, errors: [] }
    case 'PREV':
      return { ...state, step: Math.max(0, state.step - 1), errors: [] }
    case 'SET_DATA':
      return { ...state, data: { ...state.data, ...action.payload } }
    case 'SET_ERRORS':
      return { ...state, errors: action.payload }
    case 'RESET':
      return { step: 0, data: {}, errors: [] }
  }
}

export const useWizard = () => {
  return useReducer(wizardReducer, { step: 0, data: {}, errors: [] })
}
```

#### Level 3: React Context — Narrow Subtree Sharing

```tsx
// ✅ Correct — compound component sharing state (≤3 levels, ≤5 consumers)
'use client'

import { createContext, useContext, useState } from 'react'

type TabsContextValue = {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

const useTabs = () => {
  const context = useContext(TabsContext)
  if (!context) throw new Error('useTabs must be used within <Tabs>')
  return context
}

export const Tabs = ({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  )
}

export const TabTrigger = ({ value, children }: { value: string; children: React.ReactNode }) => {
  const { activeTab, setActiveTab } = useTabs()

  return (
    <button
      role="tab"
      aria-selected={activeTab === value}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  )
}

export const TabContent = ({ value, children }: { value: string; children: React.ReactNode }) => {
  const { activeTab } = useTabs()

  if (activeTab !== value) return null
  return <div role="tabpanel">{children}</div>
}
```

#### Level 4: Zustand — Cross-Cutting Shared State

```tsx
// ✅ Correct — Zustand store with selectors, devtools, and persist

// src/stores/ui-store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

type UIState = {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
}

type UIActions = {
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: UIState['theme']) => void
}

export const useUIStore = create<UIState & UIActions>()(
  devtools(
    persist(
      (set) => ({
        // State
        sidebarOpen: true,
        theme: 'system',

        // Actions
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }), false, 'toggleSidebar'),
        setSidebarOpen: (open) => set({ sidebarOpen: open }, false, 'setSidebarOpen'),
        setTheme: (theme) => set({ theme }, false, 'setTheme'),
      }),
      { name: 'ui-store' },
    ),
    { name: 'UIStore' },
  ),
)
```

```tsx
// ✅ Correct — consuming with selectors (fine-grained subscription)

// src/components/layout/Sidebar.tsx
'use client'

import { useUIStore } from '@/stores/ui-store'

export const Sidebar = () => {
  // ✅ Only re-renders when sidebarOpen changes
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)

  return (
    <aside className={cn('transition-all', sidebarOpen ? 'w-64' : 'w-0')}>
      <button onClick={toggleSidebar}>Toggle</button>
      {/* sidebar content */}
    </aside>
  )
}
```

```tsx
// ✅ Correct — useShallow for selecting multiple values at once
// Without useShallow, returning an object from a selector creates a new reference
// every time ANY store value changes, causing unnecessary re-renders.

'use client'

import { useShallow } from 'zustand/react/shallow'
import { useUIStore } from '@/stores/ui-store'

export const Header = () => {
  // ✅ useShallow compares each property with Object.is — only re-renders
  // when sidebarOpen OR theme actually changes (not when other store values change)
  const { sidebarOpen, theme } = useUIStore(
    useShallow((state) => ({
      sidebarOpen: state.sidebarOpen,
      theme: state.theme,
    })),
  )

  return (
    <header>
      <span>{sidebarOpen ? 'Open' : 'Closed'}</span>
      <span>{theme}</span>
    </header>
  )
}
```

```tsx
// ✅ Also correct — useShallow with array destructuring
'use client'

import { useShallow } from 'zustand/react/shallow'
import { useUIStore } from '@/stores/ui-store'

export const ThemeToggle = () => {
  const [theme, setTheme] = useUIStore(
    useShallow((state) => [state.theme, state.setTheme]),
  )

  return <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme}</button>
}
```

```tsx
// ✅ Correct — accessing outside React (utility function, event handler)

// src/lib/some-utility.ts
import { useUIStore } from '@/stores/ui-store'

export const getTheme = () => {
  return useUIStore.getState().theme
}
```

```tsx
// ✅ Correct — feature-specific store (small and focused)

// src/stores/notification-store.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type Notification = {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

type NotificationState = {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set) => ({
      notifications: [],
      addNotification: (notification) =>
        set(
          (state) => ({
            notifications: [
              ...state.notifications,
              { ...notification, id: crypto.randomUUID() },
            ],
          }),
          false,
          'addNotification',
        ),
      removeNotification: (id) =>
        set(
          (state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }),
          false,
          'removeNotification',
        ),
      clearAll: () => set({ notifications: [] }, false, 'clearAll'),
    }),
    { name: 'NotificationStore' },
  ),
)
```

#### Anti-Patterns

```tsx
// ❌ Avoid — subscribing to entire store (re-renders on ANY change)
const { sidebarOpen, theme, toggleSidebar } = useUIStore()

// ✅ Correct — subscribe to individual slices
const sidebarOpen = useUIStore((state) => state.sidebarOpen)
const toggleSidebar = useUIStore((state) => state.toggleSidebar)
```

```tsx
// ❌ Avoid — selecting multiple values as object WITHOUT useShallow
// This creates a new object reference on every store change → re-renders every time
const { sidebarOpen, theme } = useUIStore((state) => ({
  sidebarOpen: state.sidebarOpen,
  theme: state.theme,
}))

// ✅ Correct — useShallow does shallow comparison of each property
import { useShallow } from 'zustand/react/shallow'

const { sidebarOpen, theme } = useUIStore(
  useShallow((state) => ({
    sidebarOpen: state.sidebarOpen,
    theme: state.theme,
  })),
)

// ✅ Also correct — individual selectors (no useShallow needed for single primitives)
const sidebarOpen = useUIStore((state) => state.sidebarOpen)
const theme = useUIStore((state) => state.theme)
```

```tsx
// ❌ Avoid — storing server data in Zustand
const useProductStore = create((set) => ({
  products: [],
  fetchProducts: async () => {
    const res = await fetch('/api/products')
    const data = await res.json()
    set({ products: data })
  },
}))

// ✅ Correct — server data belongs in Server Components or TanStack Query (ADR-0005)
```

```tsx
// ❌ Avoid — one mega-store for everything
const useAppStore = create((set) => ({
  // UI state
  sidebarOpen: true,
  theme: 'light',
  // User preferences
  locale: 'en',
  // Notifications
  notifications: [],
  // Cart items
  cart: [],
  // ... 50 more properties
}))

// ✅ Correct — separate stores per domain concern
// src/stores/ui-store.ts      → sidebar, theme
// src/stores/cart-store.ts    → cart items, quantities
// src/stores/notification-store.ts → notifications
```

```tsx
// ❌ Avoid — using Zustand for state that belongs in the URL
const useFilterStore = create((set) => ({
  search: '',
  category: 'all',
  sortBy: 'name',
}))

// ✅ Correct — URL state is shareable, bookmarkable, back-button friendly
// Use searchParams: /products?search=widget&category=electronics&sort=name
```

```tsx
// ❌ Avoid — using Context when distant components share state
// (5+ consumers across different subtrees = re-render problems)
<ThemeContext.Provider value={theme}>
  <Header />          {/* re-renders when ANY theme value changes */}
  <Sidebar />         {/* re-renders when ANY theme value changes */}
  <MainContent>
    <DeepChild />     {/* re-renders when ANY theme value changes */}
  </MainContent>
  <Footer />          {/* re-renders when ANY theme value changes */}
</ThemeContext.Provider>

// ✅ Correct — Zustand with selectors (only affected components re-render)
const theme = useUIStore((state) => state.theme)
```

---

## Consequences

**Positive:**
- Zero state management dependency for most components (React built-ins suffice)
- When Zustand is needed, it adds only ~1kB to the bundle
- No Provider wrappers — root layout stays a Server Component
- Selector-based subscriptions prevent unnecessary re-renders
- Stores are testable (plain functions, no Provider setup needed)
- Clear escalation path eliminates "which tool?" debates
- State access outside React components (utility functions, middleware) is trivial

**Negative:**
- Developers must learn the escalation path and resist reaching for Zustand prematurely — mitigated by the decision tree and clear rules
- Multiple small stores can become scattered — mitigated by the `src/stores/` convention and barrel exports
- `persist` middleware requires careful handling of SSR (localStorage not available on server) — mitigated by Zustand's built-in SSR-safe `persist` that skips hydration until the client

## Related ADRs

- **ADR-0001**: Architecture — server-first model that minimizes client state needs
- **ADR-0004**: Components — tier system and component splitting (where state hooks live)
- **ADR-0005**: Data Fetching — TanStack Query handles server-state on the client; Zustand must NOT duplicate this
- **ADR-0012**: Forms — form state handling; Zustand must NOT duplicate this
- **ADR-0021**: React Runtime Performance — re-render optimization, memoization patterns, state colocation as the #1 performance tool





