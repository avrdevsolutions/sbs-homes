# ADR-0021: Performance — React Runtime & Rendering

**Status**: Accepted
**Date**: 2026-03-02
**Supersedes**: N/A

---

## Context

ADR-0018 governs platform-level performance: images, fonts, code splitting, bundle budgets, Lighthouse, and Core Web Vitals targets. But once a component is marked `'use client'`, it enters React's rendering lifecycle — and React has its own performance characteristics. Unnecessary re-renders, unstable references, synchronous blocking layouts, and expensive computations during render all degrade responsiveness. These directly impact **INP (Interaction to Next Paint)**, the Core Web Vital that measures how fast the UI responds to user input.

React 18+ introduced `useTransition` and `useDeferredValue` for concurrent rendering. React has long provided `useMemo`, `useCallback`, and `React.memo` for memoization. `useLayoutEffect` exists for DOM measurement before paint. These are powerful tools — but they have real costs (memory, complexity, stale closure bugs) and are frequently misused. This ADR establishes when and how to use each one, and — critically — when NOT to.

This ADR applies **only to Client Components** (`'use client'`). Server Components have no rendering lifecycle, no hooks, and no re-renders — they are governed by ADR-0004 and ADR-0018.

## Decision

**Prefer component composition and state colocation over memoization. When memoization is needed, use `useMemo` for expensive computations, `useCallback` for stable function references passed to memoized children, and `React.memo` for components that re-render with the same props. Use `useTransition` for non-urgent state updates. Use `useDeferredValue` for expensive derived renders. Use `useLayoutEffect` only for DOM measurement before paint. Never memoize by default — measure first.**

---

## Rationale

### The Re-render Mental Model

React re-renders a component when:
1. Its **state** changes (`useState`, `useReducer`)
2. Its **parent** re-renders (props may or may not have changed)
3. A **context** it consumes changes (`useContext`)

Re-renders are **not inherently bad**. React's reconciliation is fast. A component re-rendering and producing the same VDOM is cheap. The problem is when:
- A re-render triggers **expensive computation** (filtering 10,000 items)
- A re-render triggers **expensive child trees** (deep component hierarchies re-render unnecessarily)
- A re-render triggers **DOM-heavy side effects** (layout thrashing)

### Why Composition Before Memoization

The #1 cause of unnecessary re-renders is **state being too high in the tree**. Before reaching for `useMemo` or `React.memo`, restructure the component tree:

```tsx
// ❌ Problem: typing in input re-renders the entire page including ExpensiveList
'use client'
const Page = () => {
  const [query, setQuery] = useState('')
  const [items] = useState(generateLargeList())

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ExpensiveList items={items} />  {/* Re-renders on every keystroke! */}
    </div>
  )
}

// ✅ Solution: Extract the stateful part — no memoization needed
'use client'
const SearchInput = () => {
  const [query, setQuery] = useState('')
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />
}

// Parent doesn't re-render when SearchInput's state changes
const Page = () => {
  const items = generateLargeList()
  return (
    <div>
      <SearchInput />
      <ExpensiveList items={items} />  {/* Never re-renders from typing */}
    </div>
  )
}
```

This is **always** the first tool. It has zero runtime cost (no memoization overhead), zero complexity, and solves the majority of re-render problems.

### Key Factors
1. **Composition is free, memoization is not** — `useMemo`/`useCallback` consume memory and add comparison overhead on every render. Restructuring the component tree costs nothing at runtime.
2. **React 19's compiler direction** — React Compiler (formerly React Forget) auto-memoizes. Manual memoization today may become redundant — but composition patterns remain valuable regardless.
3. **INP is a Core Web Vital** — `useTransition` and `useDeferredValue` directly improve INP by keeping the main thread responsive during heavy updates.
4. **Premature memoization obscures intent** — `useMemo` everywhere makes code harder to read with no measurable benefit in most cases. Reserve it for measured bottlenecks.
5. **`useLayoutEffect` is blocking** — It runs synchronously after DOM mutation but before paint. Misuse causes visible jank.

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| Memoize everything by default | Wrap all computations in `useMemo`, all callbacks in `useCallback` | ❌ Premature optimization, adds memory overhead and complexity without measured need. React 19 Compiler will make this redundant. |
| Memoize nothing, rely on React Compiler | Wait for React Compiler to handle all memoization | ❌ Compiler is not yet stable/default. We need guidance for today while being ready for tomorrow. |
| Measure first, memoize selectively | Use composition as the primary tool, apply memoization only when profiling shows a bottleneck | ✅ Chosen: Balances performance with code simplicity. Aligns with React team guidance and prepares for Compiler adoption. |

---

## Implementation Guidelines

### Rules

| Rule | Level |
|------|-------|
| Prefer state colocation and component composition over memoization | **MUST** |
| Profile before memoizing — use React DevTools Profiler to identify the bottleneck | **MUST** |
| `useCallback` MUST be paired with `React.memo` on the child — alone it does nothing | **MUST** |
| `useLayoutEffect` MUST only be used for DOM measurement/mutation before paint | **MUST** |
| `useLayoutEffect` MUST NOT contain async operations, subscriptions, or network calls | **MUST NOT** |
| `useEffect` MUST NOT be used for derived state — compute during render or use `useMemo` | **MUST NOT** |
| Don't memoize trivial computations (simple math, string concatenation, small array maps) | **MUST NOT** |
| Use `useTransition` for state updates that trigger expensive re-renders | **SHOULD** |
| Use `useDeferredValue` for expensive derived renders from external/prop values | **SHOULD** |
| `React.memo` for components that receive the same props frequently but whose parent re-renders often | **SHOULD** |
| `useMemo` for computations that are genuinely expensive (>1ms, large datasets, complex transformations) | **SHOULD** |

---

### Hook Reference

#### `useMemo` — Memoize Expensive Computations

Caches the result of a computation between re-renders. Only recomputes when dependencies change.

**When to use:**
- Filtering/sorting large datasets (hundreds+ items)
- Complex transformations (parsing, aggregation)
- Creating objects/arrays passed as props to memoized children (reference stability)

**When NOT to use:**
- Simple computations (adding numbers, string concatenation)
- Values that change every render anyway (dependencies always change)
- As a semantic guarantee — `useMemo` is a performance hint, not a semantic guarantee. React may discard cached values.

```tsx
'use client'
import { useMemo, useState } from 'react'

// ✅ Correct — expensive computation on large dataset
const FilteredProducts = ({ products, category }: Props) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Products could be 1000+ items — memoize filtering and sorting
  const filteredAndSorted = useMemo(() => {
    const filtered = products.filter((p) => p.category === category)
    return filtered.sort((a, b) =>
      sortOrder === 'asc' ? a.price - b.price : b.price - a.price
    )
  }, [products, category, sortOrder])

  return (
    <div>
      <SortButton order={sortOrder} onToggle={() => setSortOrder((o) => o === 'asc' ? 'desc' : 'asc')} />
      <ProductList products={filteredAndSorted} />
    </div>
  )
}

// ❌ Avoid — trivial computation, useMemo overhead exceeds the computation itself
const Greeting = ({ firstName, lastName }: Props) => {
  const fullName = useMemo(() => `${firstName} ${lastName}`, [firstName, lastName])
  //                ^^^^^^^^ useMemo here costs MORE than the string concatenation
  return <h1>{fullName}</h1>
}

// ✅ Correct — just compute it inline
const Greeting = ({ firstName, lastName }: Props) => {
  const fullName = `${firstName} ${lastName}`
  return <h1>{fullName}</h1>
}
```

#### `useCallback` — Stable Function References

Returns a memoized version of a callback that only changes when dependencies change. **Pointless unless the child consuming the callback is wrapped in `React.memo`.**

**When to use:**
- Function prop passed to a `React.memo`-wrapped child
- Function stored as a dependency of `useEffect` or `useMemo` in a child
- Event handlers passed to large lists of memoized items

**When NOT to use:**
- When the child is NOT memoized (the callback stability saves nothing — the child re-renders anyway)
- When you just "feel like it should be memoized"

```tsx
'use client'
import { memo, useCallback, useState } from 'react'

// ✅ Correct — useCallback + React.memo work together
const TodoItem = memo(({ todo, onToggle }: TodoItemProps) => {
  return (
    <li onClick={() => onToggle(todo.id)}>
      {todo.completed ? '✅' : '⬜'} {todo.text}
    </li>
  )
})
TodoItem.displayName = 'TodoItem'

const TodoList = ({ todos }: { todos: Todo[] }) => {
  const [items, setItems] = useState(todos)

  // Stable reference — TodoItem is memo'd, so this prevents re-renders
  const handleToggle = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }, [])

  return (
    <ul>
      {items.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} />
      ))}
    </ul>
  )
}

// ❌ Avoid — useCallback without React.memo on the child is useless
const Parent = () => {
  const [count, setCount] = useState(0)

  // This does nothing — Child is not memo'd, so it re-renders when Parent re-renders
  const handleClick = useCallback(() => {
    console.log('clicked')
  }, [])

  return <Child onClick={handleClick} />  // Child re-renders anyway!
}
```

#### `React.memo` — Skip Re-renders When Props Haven't Changed

Wraps a component to skip re-rendering when its props are shallowly equal to the previous render's props.

**When to use:**
- Component receives the same props frequently but parent re-renders often
- Component's render is expensive (complex UI, large lists)
- List item components rendered by a frequently-updating parent

**When NOT to use:**
- Component's props change on every render (memo comparison is wasted work)
- Component is trivially cheap to render (a simple `<div>`)
- As a default wrapper on every component ("just in case")

```tsx
'use client'
import { memo } from 'react'

// ✅ Correct — expensive component that often receives the same props
const ExpensiveChart = memo(({ data, config }: ChartProps) => {
  // Expensive rendering logic...
  return <canvas ref={canvasRef} />
})
ExpensiveChart.displayName = 'ExpensiveChart'

// ✅ Correct — list item in a large list
const ProductCard = memo(({ product }: { product: Product }) => {
  return (
    <div className="rounded-lg border p-4">
      <Image src={product.image} alt={product.name} width={200} height={200} />
      <h3 className="font-semibold">{product.name}</h3>
      <p className="text-muted-foreground">{product.description}</p>
    </div>
  )
})
ProductCard.displayName = 'ProductCard'

// ❌ Avoid — trivially cheap component
const Label = memo(({ text }: { text: string }) => {
  return <span>{text}</span>  // This is cheaper to re-render than to memoize
})
```

**Important:** Always set `displayName` on memo'd components — React DevTools shows them as `Memo(Anonymous)` otherwise, making profiling difficult.

#### `useTransition` — Non-Urgent State Updates

Marks a state update as non-urgent. React keeps the current UI responsive while computing the next state in the background. **This directly improves INP.**

**When to use:**
- State update triggers an expensive re-render (filtering a large list, switching complex tabs)
- User-facing responsiveness matters more than showing the update instantly
- Navigation transitions (Next.js `router.push` already uses transitions internally)

```tsx
'use client'
import { useState, useTransition } from 'react'

// ✅ Correct — filtering a large list, keep input responsive
const SearchableList = ({ items }: { items: Item[] }) => {
  const [query, setQuery] = useState('')
  const [filteredItems, setFilteredItems] = useState(items)
  const [isPending, startTransition] = useTransition()

  const handleSearch = (value: string) => {
    setQuery(value)  // ← urgent: update the input immediately

    startTransition(() => {
      // ← non-urgent: filter can happen in the background
      const filtered = items.filter((item) =>
        item.name.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredItems(filtered)
    })
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
      />
      <div className={isPending ? 'opacity-70 transition-opacity' : ''}>
        {filteredItems.map((item) => (
          <ListItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

// ✅ Correct — tab switching with heavy content
const Tabs = ({ tabs }: { tabs: TabConfig[] }) => {
  const [activeTab, setActiveTab] = useState(tabs[0].id)
  const [isPending, startTransition] = useTransition()

  const handleTabChange = (tabId: string) => {
    startTransition(() => {
      setActiveTab(tabId)
    })
  }

  return (
    <div>
      <div className="flex gap-2" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={activeTab === tab.id ? 'border-b-2 border-primary-600' : ''}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={isPending ? 'opacity-70 transition-opacity' : ''}>
        <ActiveTabContent tabId={activeTab} />
      </div>
    </div>
  )
}
```

#### `useDeferredValue` — Defer Expensive Derived Renders

Similar to `useTransition`, but for values you receive as **props** (where you don't control the state update). React renders with the old value first (fast), then re-renders with the new value in the background.

**When to use:**
- You receive a prop that changes frequently and triggers expensive rendering
- You don't control the state update (it comes from a parent or external source)
- Search results, filtered lists, visualizations driven by external input

```tsx
'use client'
import { useDeferredValue, useMemo } from 'react'

// ✅ Correct — parent controls the query, this component defers the expensive render
const SearchResults = ({ query }: { query: string }) => {
  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery

  // Expensive computation uses the deferred (old) value — fast render
  const results = useMemo(
    () => searchLargeDataset(deferredQuery),
    [deferredQuery],
  )

  return (
    <div className={isStale ? 'opacity-70 transition-opacity' : ''}>
      {results.map((result) => (
        <ResultCard key={result.id} result={result} />
      ))}
    </div>
  )
}
```

**`useTransition` vs `useDeferredValue`:**

| | `useTransition` | `useDeferredValue` |
|---|---|---|
| You control the state update | ✅ Wrap `setState` in `startTransition` | ❌ |
| Value comes from props/external | ❌ | ✅ Wrap the prop value |
| Returns pending state | `isPending` boolean | Compare current vs deferred value |

#### `useLayoutEffect` — Synchronous DOM Measurement

Fires synchronously **after DOM mutation but before the browser paints**. This means the user never sees the "before" state. Use it when you need to measure the DOM and adjust layout before the user sees anything.

**When to use:**
- Measuring DOM dimensions (`getBoundingClientRect()`) to position elements (tooltips, popovers)
- Reading scroll position before adjusting content
- Preventing visual flicker where `useEffect` would show one frame of the "wrong" state

**When NOT to use:**
- Anything that doesn't require DOM measurement before paint — use `useEffect` instead
- Data fetching, subscriptions, timers — these don't need to block paint
- Anything async — `useLayoutEffect` is synchronous and blocking

```tsx
'use client'
import { useLayoutEffect, useRef, useState } from 'react'

// ✅ Correct — measure element to position a tooltip before paint
const Tooltip = ({ anchorRef, children }: TooltipProps) => {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!anchorRef.current || !tooltipRef.current) return

    const anchorRect = anchorRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()

    setPosition({
      top: anchorRect.top - tooltipRect.height - 8,
      left: anchorRect.left + (anchorRect.width - tooltipRect.width) / 2,
    })
  }, [anchorRef])

  return (
    <div
      ref={tooltipRef}
      className="absolute rounded bg-neutral-900 px-2 py-1 text-sm text-white"
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>
  )
}

// ✅ Correct — auto-scroll to bottom of chat, measured before paint
const ChatMessages = ({ messages }: { messages: Message[] }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  return (
    <div ref={containerRef} className="h-96 overflow-y-auto">
      {messages.map((msg) => (
        <ChatBubble key={msg.id} message={msg} />
      ))}
    </div>
  )
}

// ❌ Wrong — data fetching does NOT need to block paint
const BadExample = () => {
  useLayoutEffect(() => {
    fetch('/api/data').then(/* ... */)  // Blocks paint for no reason!
  }, [])
}
```

**SSR Warning:** `useLayoutEffect` does not run during server-side rendering. If the component renders on the server, React will emit a warning. For components that truly need `useLayoutEffect`, ensure they're in `'use client'` files and handle the SSR case:

```tsx
// For components that must measure on mount and SSR is involved:
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect
```

---

### State Colocation — The #1 Performance Pattern

Before any hook-based optimization, ask: **"Is this state in the right place?"**

```
State colocation rules (in order of preference):
1. Keep state in the component that uses it
2. If siblings need it → lift to the nearest common parent
3. If a subtree needs it → React Context (ADR-0020)
4. If cross-cutting/global → Zustand (ADR-0020)

The higher state lives, the more components re-render when it changes.
The lower state lives, the fewer components are affected.
```

```tsx
// ❌ State too high — hoveredId in the page re-renders the entire page
const Page = () => {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  return (
    <div>
      <Header />  {/* Re-renders when hoveredId changes */}
      <Sidebar />  {/* Re-renders when hoveredId changes */}
      <ProductGrid onHover={setHoveredId} hoveredId={hoveredId} />
    </div>
  )
}

// ✅ State colocated — only ProductGrid manages hover state
const Page = () => {
  return (
    <div>
      <Header />
      <Sidebar />
      <ProductGrid />  {/* Manages its own hoveredId internally */}
    </div>
  )
}
```

---

### Measuring Performance — The Profiler Workflow

**Never optimize without measuring.** React DevTools Profiler is the primary tool.

#### Step 1: Record a Profile
1. Open React DevTools → Profiler tab
2. Click Record
3. Perform the interaction that feels slow
4. Stop recording

#### Step 2: Identify the Problem
- **Flame chart**: Shows which components rendered and how long each took
- **Ranked chart**: Shows components sorted by render time (slowest first)
- **"Why did this render?"**: Enable in DevTools settings — shows the reason for each re-render

> **Agent execution note**: AI agents cannot open the React DevTools Profiler GUI. Use these programmatic alternatives:
>
> - **CDP via Playwright MCP**: Use `browser_devtools_execute_cdp` with `Profiler.start()` / `Profiler.stop()` for CPU profiling (function-level timing), and `Performance.getMetrics()` for runtime metrics (JS heap size, DOM nodes, layout count). Use `Tracing.start()` / `Tracing.end()` for full performance traces.
> - **React Profiler API**: Wrap suspect components in `<Profiler id="name" onRender={callback}>` to collect render timing data programmatically. Log `actualDuration`, `baseDuration`, and `commitTime` to identify slow components.
> - **Lighthouse CLI**: Run `npx lighthouse http://localhost:3000 --output=json --chrome-flags="--headless"` for INP, TBT, and overall responsiveness metrics (see ADR-0018).
>
> These give the same raw data as DevTools — component render times, JS execution cost, layout/paint counts — in a format agents can analyze. See `docs/agent-tooling.md` for full MCP tool documentation.

#### Step 3: Apply the Right Fix

| Problem | Fix |
|---------|-----|
| Component re-renders but props haven't changed | `React.memo` on the component |
| Function prop causes re-render of memo'd child | `useCallback` for the function prop |
| Expensive computation reruns on every render | `useMemo` for the computation |
| State change re-renders unrelated siblings | Colocate state lower in the tree |
| Context change re-renders all consumers | Split context, or move to Zustand (ADR-0020) |
| Input feels laggy during expensive update | `useTransition` or `useDeferredValue` |
| Visual flicker before layout adjustment | `useLayoutEffect` instead of `useEffect` |

---

### Decision Tree: Which Optimization?

```
Is the UI slow or laggy?
├─ No → DON'T OPTIMIZE. Ship it.
│
├─ Yes → Profile with React DevTools
│   │
│   ├─ Component re-renders unnecessarily (same props)?
│   │   ├─ Can you move state lower in the tree? → DO THAT (composition)
│   │   └─ No → React.memo + useCallback for function props
│   │
│   ├─ Expensive computation during render?
│   │   └─ useMemo
│   │
│   ├─ Input feels laggy when typing/interacting?
│   │   ├─ You control the setState → useTransition
│   │   └─ Value comes from props → useDeferredValue
│   │
│   ├─ Visual flicker (element jumps)?
│   │   └─ useLayoutEffect for DOM measurement
│   │
│   └─ Everything is slow?
│       └─ Check bundle size (ADR-0018), check for accidental 'use client'
│           on large trees, check for missing Suspense boundaries
```

---

## Anti-Patterns

```tsx
// ❌ ANTI-PATTERN: Memoizing everything "just in case"
const Component = () => {
  const value = useMemo(() => 2 + 2, [])          // Pointless
  const handler = useCallback(() => {}, [])        // Pointless without memo'd child
  const label = useMemo(() => `Hello ${name}`, [name])  // Pointless
  // This adds memory overhead and cognitive noise for zero benefit
}

// ❌ ANTI-PATTERN: useCallback without React.memo
const Parent = () => {
  const handleClick = useCallback(() => { /* ... */ }, [])
  return <Child onClick={handleClick} />  // Child re-renders anyway!
}

// ❌ ANTI-PATTERN: Derived state in useEffect
const Component = ({ items }: Props) => {
  const [filtered, setFiltered] = useState<Item[]>([])

  useEffect(() => {
    setFiltered(items.filter((i) => i.active))
  }, [items])
  // Causes TWO renders: one with stale filtered, one with correct.
  // Also a common source of bugs (race conditions, stale closures).

  // ✅ Fix: Compute during render
  const filtered = useMemo(
    () => items.filter((i) => i.active),
    [items],
  )
  // Or if it's cheap, just compute inline:
  // const filtered = items.filter((i) => i.active)
}

// ❌ ANTI-PATTERN: useLayoutEffect for non-DOM work
useLayoutEffect(() => {
  trackAnalytics('page_view')  // Blocks paint for analytics?!
}, [])
// ✅ Fix: use useEffect — analytics don't need to block paint

// ❌ ANTI-PATTERN: State too high in the tree
// See "State Colocation" section above

// ❌ ANTI-PATTERN: useMemo with constantly-changing deps
const Component = ({ config }: Props) => {
  // If parent creates a new `config` object every render,
  // this recomputes every render — the memoization does nothing
  const processed = useMemo(() => processConfig(config), [config])
  // Fix: Ensure parent stabilizes the reference, or memoize by value
}
```

---

## Consequences

**Positive:**
- Composition-first approach keeps code simple and avoids premature optimization.
- Clear decision tree prevents developers from guessing which optimization to use.
- `useTransition` and `useDeferredValue` patterns directly improve INP, a Core Web Vital.
- "Measure first" culture prevents wasted effort on non-bottlenecks.
- Aligns with React team's guidance and prepares for React Compiler adoption.
- `useLayoutEffect` guidance prevents both misuse (blocking paint unnecessarily) and under-use (visual flicker).

**Negative:**
- Developers must learn when NOT to optimize — counter-intuitive for those trained to memoize everything. Mitigated by decision tree and clear anti-patterns.
- Profiling adds a step before optimization. Mitigated by making it a MUST rule — no one spends time on premature memoization.
- `useLayoutEffect` is easy to misuse (blocking paint for non-DOM work). Mitigated by strict MUST rules and examples of correct/incorrect usage.

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (React 19, Server Components, server-first)
- [ADR-0004](./0004-components.md) — Components (Server Components by default, `'use client'` only where needed)
- [ADR-0018](./0018-performance-platform.md) — Performance — Platform, Infrastructure & Core Web Vitals (images, fonts, bundle, Lighthouse)
- [ADR-0019](./0019-accessibility.md) — Accessibility (reduced motion interacts with transition/animation perf)
- [ADR-0020](./0020-state-management.md) — State Management (state colocation, Context vs Zustand re-render tradeoffs)



