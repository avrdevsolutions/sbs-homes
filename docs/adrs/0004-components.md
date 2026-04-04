# ADR-0004: Component Structure & Tiers

**Status**: Accepted
**Date**: 2026-03-13
**Supersedes**: Previous ADR-0004 (2026-02-27)

---

## Context

Clear component organization is critical for maintainability, team collaboration, and AI-assisted development. We need predictable placement, clear boundaries, enforced import directions, and consistent patterns for props, composition, exports, and accessibility. This ADR covers the full component lifecycle — from where a component lives, to how it's typed, composed, exported, and documented.

## Decision

**Adopt a tiered component organization with strict import boundaries, standardized props/composition patterns, and accessibility requirements.**

---

## Tier System

| Tier            | Location               | Purpose                                                                | May Import From               |
| --------------- | ---------------------- | ---------------------------------------------------------------------- | ----------------------------- |
| **1: UI**       | `components/ui/`       | Design-system primitives (e.g., Button, Typography, Container, Stack)  | Nothing from `components/`    |
| **2: Shared**   | `components/shared/`   | Reusable composites across features (e.g., content cards, stat blocks) | `ui/` only                    |
| **3: Features** | `components/features/` | Feature-specific sections (e.g., Hero, PricingCard, TeamGrid)          | `ui/`, `shared/`              |
| **4: Layout**   | `components/layout/`   | App-wide chrome (e.g., Header, Footer, Sidebar, Nav)                   | `ui/`, `shared/`, `features/` |
| **Page**        | `app/*/_components/`   | Page-private (not reusable)                                            | All tiers                     |

**Import boundary rule:** Higher tiers may import lower tiers. Lower tiers MUST NOT import higher tiers. Features MUST NOT import from other features — use `shared/` instead (see ADR-0028).

```
app/* → layout/ → features/ → shared/ → ui/
                                          ↑ Never import upward
```

### Layout Tier vs Next.js `layout.tsx`

These are **different things**:

- `src/app/layout.tsx` — Next.js special file (routing, metadata, providers). Uses `function` declaration.
- `src/components/layout/Header.tsx` — Reusable layout component (visual chrome). Uses arrow function.

`layout.tsx` **imports from** `components/layout/`. They don't compete — they collaborate.

```tsx
// src/app/layout.tsx — Next.js special file
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lang-depends-on-project"en'>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

### Layout-Level vs Page-Level Chrome — Decision Tree

Shared navigation, headers, and footers MUST go in `layout.tsx` — NOT in individual `page.tsx` files. This ensures consistent chrome across all routes (including `not-found.tsx` and `error.tsx`), avoids duplication, and matches Next.js's intended architecture.

```
Is this chrome (header, footer, nav, sidebar) shared across multiple routes?
  → YES: Put it in layout.tsx (root or route group layout)
  → NO: Is it specific to only ONE page?
    → YES: Put it in page.tsx or _components/
    → NO: It's shared — put it in layout.tsx
```

```tsx
// ✅ Correct — shared chrome in layout.tsx
// src/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lang-depends-on-project"en'>
      <body>
        <SkipNav />
        <Navbar />
        <main id='main-content'>{children}</main>
        <Footer />
      </body>
    </html>
  )
}

// src/app/page.tsx — only page-specific content
export default function HomePage() {
  return (
    <>
      <Hero />
      <Collections />
      <Services />
    </>
  )
}

// ❌ Wrong — chrome duplicated in page.tsx
export default function HomePage() {
  return (
    <>
      <Navbar /> {/* Should be in layout.tsx */}
      <main>
        <Hero />
      </main>
      <Footer /> {/* Should be in layout.tsx */}
    </>
  )
}
```

**Why this matters**:

1. `error.tsx` and `not-found.tsx` render within the layout — if Navbar/Footer are in `layout.tsx`, users see them even on error/404 pages.
2. If Navbar/Footer are in `page.tsx`, every new page must duplicate them.
3. Next.js layouts persist across navigations — chrome doesn't re-render unnecessarily.

---

## One Component Per File — CRITICAL

Every `.tsx` file exports exactly ONE React component. No secondary component functions in the same file.

**What stays in the same file as the component (not separate components):**

- `cva()` definitions, variant maps, style objects at module scope
- Type definitions used only by that component
- Constants (animation variants, config objects, static maps)

**What MUST be a separate file:**

- Any function that returns JSX and is used in another component's render
- Any wrapper (animation wrapper, client boundary, layout helper)
- Any per-item component extracted from a `.map()` iteration

**Ownership rule:** Helpers, hooks, and types live inside the folder of the component that uses them — never in shared `components/`, `hooks/`, or `utils/` sub-folders. A dependency is owned by its consumer.

---

## Component Splitting Triggers

A new sibling component file MUST be created when ANY of these is true:

1. A function returns JSX and is used in another component's render — it is its own component
2. A `.map()` iteration item needs its own hooks — extract into a named per-item component file
3. A visual region serves a different purpose from its parent (e.g., animated wrapper vs content layout)
4. JSX is duplicated across multiple places — extract to a shared sibling
5. A section of the component needs `'use client'` but the parent is a server component

**Split by responsibility, not by line count.** Line count is not a trigger.

---

## Folder Structure

### Simple Component (no sub-components)

```
ui/button/
  Button.tsx
  Button.stories.tsx
  manifest.json
  index.ts
```

### Feature Section (flat sub-components + graduated sub-components)

```
features/landing-page/hero/
  index.tsx                          # HeroSection (main component)
  index.ts                           # Barrel: exports only HeroSection
  heroContent.ts                     # Content contract/types
  HeroBackground.tsx                 # Simple sub-component — flat file
  HeroCta.tsx                        # Simple sub-component — flat file
  HeroContentSequence/               # Complex sub-component — graduated
    index.tsx                        # The component
    heroContentSequence.utils.ts     # Helpers for this component only
    useHeroContentAnimation.ts       # Hook for this component only
```

### Folder Graduation

A sub-component starts as a flat `.tsx` file. The moment it needs a helper, hook, utils, or types file, it graduates to a folder:

- **Before**: `HeroBackground.tsx` (flat file, no deps)
- **After**: `HeroBackground/index.tsx` + `useHeroParallax.ts` (graduated, has a hook)

The import path (`./HeroBackground`) doesn't change — it resolves to the folder's `index.tsx`.

### Multi-Component Feature (Contained Composition)

When a feature component is composed of multiple sub-components that together form a single unit, all parts MUST live in their own folder under the feature domain. The folder contains every piece of the composition and exports a clean public API via barrel.

```
features/landing-page/
  hero/
    index.tsx                    # HeroSection (main component)
    index.ts                     # Barrel: exports only HeroSection
    heroContent.ts               # Content contract/types
    HeroBackground.tsx           # Simple sub-component — flat file
    HeroCta.tsx                  # Simple sub-component — flat file
    HeroContentSequence/         # Complex sub-component — graduated
      index.tsx                  # The component
      heroContentSequence.utils.ts
      useHeroContentAnimation.ts
  testimonials/
    index.tsx                    # TestimonialsSection (main)
    index.ts                     # Barrel
    testimonialsContent.ts
    TestimonialCard.tsx          # Simple sub-component
    TestimonialAvatar.tsx        # Simple sub-component
    TestimonialsCarousel/        # Complex — has its own hook
      index.tsx                  # Carousel interaction ('use client')
      useTestimonialAutoplay.ts  # Hook — co-located, NOT shared
```

**Rules for multi-component features:**

| Rule                                                                                                                                  | Level      |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Every sub-component MUST be a separate file (flat `.tsx` or folder with `index.tsx`) — never a second function in the parent's file   | **MUST**   |
| Each composition lives in its own kebab-case folder                                                                                   | **MUST**   |
| Sub-components are siblings of the main component                                                                                     | **MUST**   |
| Only the main component is exported from `index.ts`                                                                                   | **MUST**   |
| Sub-components are private — consumers never import them directly                                                                     | **MUST**   |
| No `components/`, `hooks/`, or `utils/` sub-folders — sub-components with deps graduate to folders (see Folder Graduation)            | **MUST**   |

```tsx
// ✅ features/landing-page/hero/index.ts — only main component is public
export { HeroSection } from './index'

// ✅ Consumer imports the composition as a single unit
import { HeroSection } from '@/components/features/landing-page/hero'

// ❌ Never import sub-components directly
import { HeroBackground } from '@/components/features/landing-page/hero/HeroBackground'
```

This keeps each composition self-contained: easy to move, rename, or delete without affecting unrelated components.

---

## Primitives-First Rule

Feature and layout components **MUST** use existing UI primitives (`Section`, `Container`, `Stack`, `Typography`, etc.) instead of raw HTML elements with ad-hoc Tailwind classes, when a primitive covers the use case.

| Rule                                                                                         | Level      |
| -------------------------------------------------------------------------------------------- | ---------- |
| Use `Section` instead of `<section>` with manual padding/spacing                             | **MUST**   |
| Use `Container` instead of `<div className="mx-auto max-w-…">`                               | **MUST**   |
| Use `Stack` instead of `<div className="flex flex-col gap-…">`                               | **MUST**   |
| Use `Typography` instead of `<h1>`, `<h2>`, `<p>` with ad-hoc text classes                   | **MUST**   |
| Use `Separator` instead of `<hr>` or `<div className="border-b">`                            | **SHOULD** |
| Use `Badge` instead of `<span>` with ad-hoc tag/status styles                                | **SHOULD** |
| Raw HTML (`<div>`, `<span>`) is allowed for structural wrappers with no primitive equivalent | Allowed    |

```tsx
// ✅ Primitives-first — uses existing building blocks
import { Section, Container, Stack, Typography, Button } from '@/components/ui'

export const Hero = ({ title, subtitle }: HeroProps) => (
  <Section spacing='lg' background='default'>
    <Stack gap='md' align='center'>
      <Typography variant='h1'>{title}</Typography>
      <Typography variant='body-lg'>{subtitle}</Typography>
      <Button>Get Started</Button>
    </Stack>
  </Section>
)

// ❌ Raw HTML when primitives exist — inconsistent spacing, no token enforcement
export const Hero = ({ title, subtitle }: HeroProps) => (
  <section className='py-24'>
    <div className='mx-auto max-w-7xl px-6'>
      <div className='flex flex-col items-center gap-6'>
        <h1 className='text-5xl font-bold'>{title}</h1>
        <p className='text-xl text-gray-600'>{subtitle}</p>
        <button className='rounded-lg bg-blue-600 px-6 py-3 text-white'>Get Started</button>
      </div>
    </div>
  </section>
)
```

**Why**: Primitives encode the design token system (ADR-0002) and spacing scale. Using them ensures visual consistency, reduces ad-hoc Tailwind classes, and means design changes propagate automatically through the primitive rather than requiring find-and-replace across feature components.

---

## Props Patterns

### Basic Props Typing

```tsx
// ✅ Explicit type alias (not interface)
type CardProps = {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export const Card = ({ title, subtitle, children }: CardProps) => (
  <div className='rounded-lg border p-6'>
    <h2>{title}</h2>
    {subtitle && <p>{subtitle}</p>}
    {children}
  </div>
)
```

### Extending HTML Elements

```tsx
// ✅ Extend native element props — gives consumers all HTML attributes
type ButtonProps = React.ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = ({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) => (
  <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
)
```

### MUST NOT Use `React.FC`

```tsx
// ❌ React.FC — adds implicit children, breaks generic inference, hides return type
export const Card: React.FC<CardProps> = ({ title }) => { ... }

// ✅ Explicit props — clear, type-safe, works with generics
export const Card = ({ title }: CardProps) => { ... }
```

**Why**: `React.FC` silently adds `children?: ReactNode` (which may not be valid), breaks generic type parameter inference, and obscures the return type. The React team themselves recommend against it.

### Ref Forwarding (Required for UI Tier)

UI primitives MUST support `ref` forwarding so they work with form libraries, focus management, and composition:

```tsx
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

type InputProps = React.ComponentProps<'input'> & {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div>
      <label className='text-sm font-medium'>{label}</label>
      <input
        ref={ref}
        className={cn(
          'w-full rounded-md border px-3 py-2',
          error ? 'border-error-500' : 'border-primary-200',
          className,
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${props.id}-error`} className='text-error-500 text-sm' role='alert'>
          {error}
        </p>
      )}
    </div>
  ),
)

Input.displayName = 'Input'
```

### Generic Components

```tsx
// ✅ Generic list component — works with any item type
type ListProps<T> = {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  keyExtractor: (item: T) => string
}

export const List = <T,>({ items, renderItem, keyExtractor }: ListProps<T>) => (
  <ul className='space-y-2'>
    {items.map((item) => (
      <li key={keyExtractor(item)}>{renderItem(item)}</li>
    ))}
  </ul>
)
```

### Polymorphic `as` Prop

```tsx
// ✅ Component can render as different elements
type BoxProps<C extends React.ElementType = 'div'> = {
  as?: C
  children: React.ReactNode
  className?: string
} & Omit<React.ComponentProps<C>, 'as' | 'className' | 'children'>

export const Box = <C extends React.ElementType = 'div'>({
  as,
  children,
  className,
  ...props
}: BoxProps<C>) => {
  const Component = as || 'div'
  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  )
}

// Usage
<Box as="section" className="p-4">Content</Box>
<Box as="a" href="/about" className="text-primary-600">Link</Box>
```

---

## Composition Patterns

### Children (Default)

```tsx
// ✅ Most common — pass content via children
export const Card = ({ children, className }: CardProps) => (
  <div className={cn('rounded-lg border p-6', className)}>{children}</div>
)

<Card>
  <h2>Title</h2>
  <p>Description</p>
</Card>
```

### Compound Components

```tsx
// ✅ For related components that share context
export const Card = ({ children, className }: CardProps) => (
  <div className={cn('rounded-lg border', className)}>{children}</div>
)

export const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="border-b px-6 py-4">{children}</div>
)

export const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="px-6 py-4">{children}</div>
)

export const CardFooter = ({ children }: { children: React.ReactNode }) => (
  <div className="border-t px-6 py-4">{children}</div>
)

// Usage
<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Body</CardContent>
  <CardFooter>Actions</CardFooter>
</Card>
```

### Slot Pattern (Named Regions)

```tsx
// ✅ When you need named insertion points
type PageHeaderProps = {
  title: string
  description?: string
  actions?: React.ReactNode // ← slot
  breadcrumbs?: React.ReactNode // ← slot
}

export const PageHeader = ({ title, description, actions, breadcrumbs }: PageHeaderProps) => (
  <header className='space-y-4'>
    {breadcrumbs}
    <div className='flex items-center justify-between'>
      <div>
        <h1 className='text-2xl font-bold'>{title}</h1>
        {description && <p className='text-gray-600'>{description}</p>}
      </div>
      {actions && <div className='flex gap-2'>{actions}</div>}
    </div>
  </header>
)
```

### Server as Children of Client

```tsx
// ✅ Keep Server Components as children of Client Components
'use client'

export const ClientWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && children} {/* children can be Server Components */}
    </div>
  )
}

// Usage in a Server Component page:
;<ClientWrapper>
  <ServerComponent /> {/* ✅ This stays a Server Component */}
</ClientWrapper>
```

### Extract Only Interactive Parts

```tsx
// ✅ Minimize client boundary — only the interactive part is 'use client'
// Card.tsx (Server Component — no directive)
export const Card = ({ data }: Props) => (
  <div className='rounded-lg border p-6'>
    <h2>{data.title}</h2>
    <p>{data.description}</p>
    <LikeButton id={data.id} /> {/* Only this is Client */}
  </div>
)
```

---

## Export Rules

| Rule                                                                                                       | Level        |
| ---------------------------------------------------------------------------------------------------------- | ------------ |
| `export default function` for Next.js special files (`page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`) | **MUST**     |
| Named exports for all reusable components                                                                  | **MUST**     |
| Barrel `index.ts` at component folder root (exports public API only)                                       | **MUST**     |
| Import from barrel, not internal files                                                                     | **MUST**     |
| Do NOT re-export private sub-components                                                                    | **MUST NOT** |

```tsx
// ✅ src/components/ui/card/index.ts — public API
export { Card, CardHeader, CardContent, CardFooter } from './Card'

// ✅ Consumer imports from barrel
import { Card, CardHeader } from '@/components/ui/card'

// ❌ Never import internal files directly
import { Card } from '@/components/ui/card/Card'
```

---

## Server vs Client Components

### Default: Server Component

All components are Server Components unless they need interactivity.

### When to Use Client Component (`'use client'`)

- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `localStorage`, `IntersectionObserver`)
- React hooks (`useState`, `useEffect`, `useRef` with DOM manipulation)
- Context providers/consumers
- Animations (Framer Motion `m.*` components)

### Rules

| Rule                                                      | Level      |
| --------------------------------------------------------- | ---------- |
| Server Component by default                               | **MUST**   |
| `'use client'` only when interactivity is required        | **MUST**   |
| Minimize the client boundary (extract interactive parts)  | **SHOULD** |
| Pass Server Components as `children` of Client Components | **SHOULD** |

---

## Loading, Error, and Suspense Boundaries

Components relate to Next.js special files for loading and error states:

```
app/dashboard/
  page.tsx          # The page component
  loading.tsx       # Shows during page load (wraps page in Suspense)
  error.tsx         # Shows when page throws ('use client' required)
  not-found.tsx     # Shows for notFound() calls
```

### Special File Styling Requirements

`error.tsx`, `not-found.tsx`, `global-error.tsx`, and `loading.tsx` are often overlooked for styling. They MUST use the same project tokens as all other components — **no default Tailwind palette colors** (see ADR-0002).

```tsx
// ✅ error.tsx — uses project tokens
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
        <div className='bg-error-100 mx-auto flex size-16 items-center justify-center rounded-full p-3'>
          {/* error icon */}
        </div>
        <h1 className='text-foreground text-2xl font-bold'>Something went wrong</h1>
        <p className='text-foreground/70'>An unexpected error occurred. Please try again.</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}

// ❌ error.tsx — uses default Tailwind palette (un-branded)
export default function Error({ error, reset }) {
  return (
    <div>
      <h1 className='text-gray-900'>Something went wrong</h1> {/* gray-900 not a token */}
      <p className='text-gray-600'>An error occurred.</p> {/* gray-600 not a token */}
      <pre className='bg-gray-100 p-4'>{error.message}</pre> {/* gray-100 not a token */}
    </div>
  )
}
```

```tsx
// ✅ not-found.tsx — uses project tokens
import Link from 'next/link'
import { Button } from '@/components/ui'

export default function NotFound() {
  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center px-4'>
      <div className='space-y-6 text-center'>
        <h1 className='text-foreground text-6xl font-bold'>404</h1>
        <h2 className='text-foreground/80 text-2xl font-semibold'>Page Not Found</h2>
        <p className='text-foreground/70 max-w-md'>The page you are looking for does not exist.</p>
        <Link href='/'>
          <Button>Go home</Button>
        </Link>
      </div>
    </div>
  )
}
```

```tsx
// ✅ global-error.tsx — uses project tokens
// Note: global-error.tsx renders its own <html> and <body> — it MUST use the same
// lang attribute as the root layout (see ADR-0013 for language tag consistency).
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="lang-depends-on-project"ro'>
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
// ✅ loading.tsx — uses project tokens
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

### Responsive Navigation Requirement

Navigation MUST be accessible on all screen sizes. Hiding nav links on mobile (`hidden lg:flex`) without providing an alternative (hamburger menu, slide-out drawer, bottom nav) is **forbidden** — it makes the site unusable for mobile visitors and violates ADR-0019 accessibility requirements.

```tsx
// ❌ Forbidden — desktop-only navigation, mobile users have no nav
<div className="hidden lg:flex lg:items-center lg:gap-8">
  {NAV_LINKS.map(...)}
</div>

// ✅ Correct — mobile menu toggle + desktop nav
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

### Suspense for Granular Loading

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

### Skeleton Components

```tsx
// ✅ Co-locate skeletons with their data component
// features/dashboard-stats/
//   DashboardStats.tsx       # Data component
//   DashboardStatsSkeleton.tsx  # Loading skeleton
//   index.ts                 # Exports both

export const DashboardStatsSkeleton = () => (
  <div className='grid grid-cols-4 gap-4'>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className='bg-primary-100 h-24 animate-pulse rounded-lg' />
    ))}
  </div>
)
```

---

## Accessibility Requirements

### UI Tier (MUST)

UI primitives are the building blocks — they MUST be accessible:

| Requirement                                                                     | Level    |
| ------------------------------------------------------------------------------- | -------- |
| Keyboard navigable (Tab, Enter, Escape, Arrow keys where applicable)            | **MUST** |
| ARIA attributes on interactive elements (`aria-label`, `aria-expanded`, `role`) | **MUST** |
| Focus visible styles (`focus-visible:ring-2 focus-visible:ring-primary-500`)    | **MUST** |
| Color contrast ≥ 4.5:1 (text) / ≥ 3:1 (large text, UI components)               | **MUST** |
| Error states connected via `aria-describedby`                                   | **MUST** |
| Forward `ref` for form integration and focus management                         | **MUST** |

### Features Tier (SHOULD)

| Requirement                                                         | Level      |
| ------------------------------------------------------------------- | ---------- |
| Semantic HTML (`section`, `article`, `nav`, `main` — not all `div`) | **SHOULD** |
| Headings in correct order (h1 → h2 → h3, no skips)                  | **SHOULD** |
| Form labels connected to inputs (`htmlFor` or wrapping `<label>`)   | **MUST**   |

### General

```tsx
// ✅ Accessible interactive element
<button
  type="button"
  aria-label="Close dialog"
  aria-expanded={isOpen}
  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
  onClick={onClose}
>
  <XIcon className="h-5 w-5" aria-hidden="true" />
</button>

// ❌ Inaccessible — div as button, no keyboard support, no ARIA
<div onClick={onClose} className="cursor-pointer">
  <XIcon />
</div>
```

---

## Component Documentation Requirements

### UI Tier (MUST)

Every `ui/` component MUST have:

1. **Props type with JSDoc** on non-obvious props
2. **Storybook story** (when Storybook opted in — ADR-0002)
3. **All variants and states** covered (hover, focus, disabled, error, loading)

```tsx
type TooltipProps = {
  /** Content shown inside the tooltip */
  content: string
  /** Which side of the trigger to position the tooltip */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Delay before showing (ms) */
  delayMs?: number
  children: React.ReactNode
}
```

### Features/Layout Tier (SHOULD)

- JSDoc on the main exported component explaining its purpose
- Co-located test file (`*.test.tsx`) for complex logic

---

## Naming Conventions

| Type             | Convention               | Example                   |
| ---------------- | ------------------------ | ------------------------- |
| Component file   | PascalCase               | `UserProfile.tsx`         |
| Component folder | kebab-case               | `user-profile/`           |
| Hook file        | camelCase + `use` prefix | `useProfileEdit.ts`       |
| Utility file     | camelCase                | `formatUserData.ts`       |
| Test file        | Same + `.test`           | `UserProfile.test.tsx`    |
| Story file       | Same + `.stories`        | `UserProfile.stories.tsx` |
| Skeleton file    | Same + `Skeleton`        | `UserProfileSkeleton.tsx` |
| Barrel export    | Always `index.ts`        | `index.ts`                |

---

## Anti-Patterns

| ❌ Don't                                                     | ✅ Do                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| Multiple component functions in one file                     | One component per `.tsx` file — extract siblings                |
| `components/`, `hooks/`, or `utils/` sub-folders             | Co-locate deps inside the owning component's folder            |
| Hooks inside `.map()`                                        | Extract list item to component                                 |
| One file with data + layout + logic                          | Split by responsibility                                        |
| Split because a file is "too long"                           | Split by responsibility, not by line count                     |
| Heavy mobile/desktop branching                               | Separate `MobileView.tsx` / `DesktopView.tsx`                  |
| Re-export private sub-components                             | Only export public API from `index.ts`                         |
| `'use client'` on everything                                 | Only when needed                                               |
| Import `features/` from `ui/` or `shared/`                   | Lower tier must not import higher                              |
| Import one `features/` from another `features/`              | Promote shared component to `shared/` (ADR-0028)               |
| Put reusable composites in `ui/`                             | `ui/` is for primitives; composites go in `shared/` (ADR-0028) |
| Use `React.FC` for props                                     | Explicit props typing                                          |
| Use `<div>` for interactive elements                         | Use `<button>`, `<a>`, `<input>`                               |
| Skip `aria-label` on icon-only buttons                       | Always provide accessible name                                 |
| Import from internal file paths                              | Import from barrel `index.ts`                                  |
| Put skeleton in separate folder                              | Co-locate with data component                                  |
| Use raw `<section>`, `<div>`, `<h1>` when a primitive exists | Use `Section`, `Container`, `Stack`, `Typography`              |
| Scatter card sub-components across folders                   | Contain all parts in one folder with barrel export             |
| Export internal sub-components from `index.ts`               | Export only the main composed component                        |

---

## Rationale

A tiered system was chosen over flat, feature-based, or atomic design because:

1. **Import direction is enforceable** — a simple rule ("never import upward") prevents dependency spaghetti without complex tooling.
2. **AI agents need placement rules** — "put reusable primitives in `ui/`, feature-specific in `features/`" is unambiguous. Flat structures require judgment calls that AI agents handle poorly.
3. **Scales gradually** — the tier system works for 5 components and 500 components. Atomic design's atom/molecule/organism distinctions become subjective at scale.

### Key Factors

1. **Predictability** — given a component's purpose, its location is deterministic.
2. **Dependency hygiene** — one-directional imports prevent circular dependencies.
3. **Server/Client split** — tiers make it easy to keep `ui/` as Server Components while `features/` may contain Client Components.
4. **Accessibility at the foundation** — UI tier components are the building blocks; making them accessible by default means every feature built on top inherits accessibility.
5. **Composition over inheritance** — React's model is compositional; patterns like children, slots, and compound components let you build complex UIs from simple, tested primitives.

## Options Considered

| Option                                    | Description                      | Why Chosen / Why Not                              |
| ----------------------------------------- | -------------------------------- | ------------------------------------------------- |
| Tiered (ui → features → layout)           | Layered with import boundaries   | ✅ Chosen: enforceable, predictable, scales well  |
| Flat (all in components/)                 | No sub-folders                   | ❌ Doesn't scale, no import direction             |
| Feature-based (by domain)                 | Each feature owns all components | ❌ Leads to duplication of primitives             |
| Atomic design (atoms/molecules/organisms) | Brad Frost's model               | ❌ Molecule vs organism distinction is subjective |

---

## Consequences

**Positive:**

- Every component has one correct location — eliminates "where does this go?" debates.
- Import boundaries prevent circular dependencies naturally.
- One-component-per-file rule eliminates ambiguity about where a component is defined.
- Folder graduation keeps simple components as flat files and co-locates complex dependencies — no separate `components/`/`hooks/`/`utils/` directories.
- AI agents can auto-determine component placement based on purpose.
- UI tier accessibility requirements mean all features built on top are accessible by default.
- Composition patterns (children, slots, compound) reduce prop drilling and increase flexibility.
- Ref forwarding enables seamless integration with form libraries and focus management.

**Negative:**

- May feel over-structured for very small projects — mitigated by starting with just `ui/` and `features/`.
- Promoting a component from `_components/` to `features/` requires updating imports — mitigated by barrel exports.
- Three tiers may not cover every case (e.g., "shared" hooks) — mitigated by `hooks/` and `lib/` at `src/` root.
- `forwardRef` adds boilerplate to UI components — mitigated by it being required only for `ui/` tier, and it's necessary for component library compatibility.

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (project structure, function style, Next.js special files)
- [ADR-0002](./0002-styling.md) — Styling (Tailwind tokens, component library restyling, Storybook)
- [ADR-0005](./0005-data-fetching.md) — Data fetching (Server Components fetch data, Server Actions for mutations)
- [ADR-0009](./0009-testing.md) — Testing (co-located tests, component testing patterns)
- [ADR-0020](./0020-state-management.md) — State Management (where state hooks live within tiers, escalation path)
- [ADR-0021](./0021-performance-react.md) — React Runtime Performance (useMemo, useCallback, React.memo, composition patterns for Client Components)
- [ADR-0023](./0023-ui-foundation-primitives.md) — UI Foundation Primitives (minimum primitives that feature components must compose from)
