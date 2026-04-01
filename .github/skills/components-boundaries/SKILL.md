---
name: components-boundaries
description: >-
  Server vs client component decision, minimizing client boundary, error/loading/not-found
  file styling with project tokens, Suspense patterns, skeleton co-location, responsive
  nav requirement. Use when choosing server vs client directive, writing error boundaries,
  or implementing loading states.
---

# Components — Server/Client & Loading Boundaries

**Compiled from**: ADR-0004 §Server vs Client Components, §Loading Error and Suspense Boundaries
**Last synced**: 2026-03-13

---

## Server vs Client — Decision

All components are Server Components by default. Add `'use client'` only when crossing into interactivity.

| Add `'use client'` when…                                        | Keep as Server Component when…      |
| --------------------------------------------------------------- | ----------------------------------- |
| Event handlers (`onClick`, `onChange`, `onSubmit`)              | Pure data rendering                 |
| Browser APIs (`window`, `localStorage`, `IntersectionObserver`) | `async` data fetching               |
| `useState`, `useEffect`, `useRef` (with DOM manipulation)       | No user interaction needed          |
| Context providers / consumers                                   | Static or computed output           |
| Framer Motion `m.*` animated components                         | Sequential server rendering is fine |

---

## Minimize the Client Boundary

### Extract Only the Interactive Part

```tsx
// ✅ Card stays Server Component — only LikeButton crosses the boundary
// Card.tsx (no 'use client' directive)
export const Card = ({ data }: Props) => (
  <div className='rounded-lg border p-6'>
    <h2>{data.title}</h2>
    <p>{data.description}</p>
    <LikeButton id={data.id} /> {/* LikeButton has 'use client' in its own file */}
  </div>
)
```

### Pass Server Components as Children of Client Components

```tsx
// ✅ ClientWrapper is 'use client', but its children stay Server Components
'use client'

export const ClientWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && children} {/* children can still be Server Components */}
    </div>
  )
}

// Usage in a Server Component page:
;<ClientWrapper>
  <ServerDataComponent /> {/* ✅ Still a Server Component */}
</ClientWrapper>
```

---

## Loading / Error / Suspense Files

### Relationship with Page Components

```
app/dashboard/
  page.tsx          # The page component
  loading.tsx       # Shown during page load (Suspense wrapper — auto-applied)
  error.tsx         # Shown on throw ('use client' required)
  not-found.tsx     # Shown for notFound() calls
```

### Special File Styling — MUST Use Project Tokens

`error.tsx`, `not-found.tsx`, `global-error.tsx`, and `loading.tsx` MUST use project design tokens — never the default Tailwind palette.

```tsx
// ✅ error.tsx — project tokens
'use client'

import { Button } from '@/components/ui'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center px-4'>
      <div className='max-w-md space-y-6 text-center'>
        <div className='bg-error-100 mx-auto flex size-16 items-center justify-center rounded-full p-3' />
        <h1 className='text-foreground text-2xl font-bold'>Something went wrong</h1>
        <p className='text-foreground/70'>An unexpected error occurred. Please try again.</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}

// ❌ error.tsx — default Tailwind palette (wrong)
export default function Error({ reset }) {
  return (
    <div>
      <h1 className='text-gray-900'>Something went wrong</h1> {/* gray-900 not a token */}
      <p className='text-gray-600'>An error occurred.</p> {/* gray-600 not a token */}
    </div>
  )
}
```

```tsx
// ✅ not-found.tsx — project tokens
import Link from 'next/link'

import { Button } from '@/components/ui'

export default function NotFound() {
  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center px-4'>
      <div className='space-y-6 text-center'>
        <h1 className='text-foreground text-6xl font-bold'>404</h1>
        <h2 className='text-foreground/80 text-2xl font-semibold'>Page Not Found</h2>
        <p className='text-foreground/70 max-w-md'>The page you're looking for does not exist.</p>
        <Link href='/'>
          <Button>Go home</Button>
        </Link>
      </div>
    </div>
  )
}
```

```tsx
// ✅ global-error.tsx — renders its own <html>/<body>; lang MUST match root layout
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="lang-depends-on-project"en'>
      {' '}
      {/* ← MUST match root layout's lang attribute */}
      <body>
        <div className='bg-background flex min-h-screen flex-col items-center justify-center px-4'>
          <h1 className='text-foreground mb-4 text-4xl font-bold'>Something went wrong</h1>
          <p className='text-foreground/70 mb-6'>An unexpected error occurred.</p>
          <button
            onClick={reset}
            className='bg-primary-600 hover:bg-primary-700 rounded-md px-4 py-2 text-white'
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
```

```tsx
// ✅ loading.tsx — project tokens
export default function Loading() {
  return (
    <div className='flex min-h-[60vh] items-center justify-center'>
      <div className='space-y-4 text-center'>
        <div className='border-primary-600 inline-block size-12 animate-spin rounded-full border-4 border-solid border-r-transparent' />
        <p className='text-foreground/60 text-sm'>Loading...</p>
      </div>
    </div>
  )
}
```

---

## Suspense for Granular Loading

```tsx
// ✅ Wrap individual slow components — not the entire page
import { Suspense } from 'react'

export default async function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats /> {/* async Server Component — loads independently */}
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <RecentActivity /> {/* async Server Component — loads independently */}
      </Suspense>
    </div>
  )
}
```

## Skeleton Co-Location

```tsx
// ✅ Co-locate skeletons with their data component
// features/dashboard-stats/
//   DashboardStats.tsx
//   DashboardStatsSkeleton.tsx
//   index.ts  ← exports both

export const DashboardStatsSkeleton = () => (
  <div className='grid grid-cols-4 gap-4'>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className='bg-primary-100 h-24 animate-pulse rounded-lg' />
    ))}
  </div>
)
```

---

## Responsive Navigation Requirement

Hiding nav links on mobile screens without providing a mobile alternative is **forbidden** (violates accessibility requirements — mobile users must have navigation access).

```tsx
// ❌ Desktop-only navigation — mobile users have no nav
<div className="hidden lg:flex lg:items-center lg:gap-8">
  {NAV_LINKS.map(...)}
</div>

// ✅ Desktop nav + mobile menu toggle
<div className="hidden lg:flex lg:items-center lg:gap-8">
  {NAV_LINKS.map(...)}
</div>
<button
  className="lg:hidden"
  aria-expanded={isMenuOpen}
  aria-controls="mobile-nav"
  aria-label="Menu"
  onClick={() => setIsMenuOpen(!isMenuOpen)}
>
  <MenuIcon aria-hidden="true" />
</button>
{isMenuOpen && (
  <nav id="mobile-nav" className="lg:hidden">
    {NAV_LINKS.map(...)}
  </nav>
)}
```
