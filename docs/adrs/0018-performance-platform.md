# ADR-0018: Performance — Platform, Infrastructure & Core Web Vitals

**Status**: Accepted
**Date**: 2026-02-27 (updated 2026-03-02)
**Supersedes**: N/A

---

## Context

Performance directly impacts SEO rankings, user experience, and conversion rates. Google uses Core Web Vitals as a ranking factor (ADR-0013). A 1-second delay in page load reduces conversions by 7% (Amazon study). Next.js provides powerful performance primitives — Server Components (zero client JS), streaming, image optimization, font optimization, code splitting — but they must be used correctly.

This ADR covers **platform and infrastructure performance**: images, fonts, code splitting, bundle budgets, streaming, CLS prevention, Lighthouse CI, and Core Web Vitals targets. It ties together caching (ADR-0017), component architecture (ADR-0004), styling (ADR-0002), and animation (ADR-0003) into a unified performance strategy.

For **React runtime and rendering performance** — `useMemo`, `useCallback`, `React.memo`, `useTransition`, `useDeferredValue`, `useLayoutEffect`, re-render prevention, and component composition patterns — see [ADR-0021](./0021-performance-react.md).

## Decision

**Performance budgets enforced via Lighthouse CI. Server Components by default (zero client JS). `next/image` for all images. `next/font` for all fonts. Bundle analysis on every build. Core Web Vitals monitored in production. React runtime performance governed by ADR-0021.**

---

## Core Web Vitals Targets

| Metric | Target | What It Measures | How To Fix |
|--------|--------|-----------------|------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Loading performance — when the biggest element renders | Optimize images, preload critical resources, cache (ADR-0017) |
| **INP** (Interaction to Next Paint) | < 200ms | Responsiveness — delay between user input and visual response | Reduce JS on main thread, defer heavy work, use `startTransition` |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Visual stability — elements moving after render | Set explicit image dimensions, reserve space for dynamic content |
| **TTFB** (Time to First Byte) | < 800ms | Server response time | Cache (ADR-0017), edge deployment, optimize DB queries |
| **FCP** (First Contentful Paint) | < 1.8s | When any content first appears | Reduce render-blocking resources, stream HTML |

### Lighthouse Score Targets

| Category | Target |
|----------|--------|
| Performance | ≥ 90 |
| Accessibility | ≥ 90 |
| Best Practices | ≥ 90 |
| SEO | ≥ 90 |

---

## Rules

| Rule | Level |
|------|-------|
| Server Components by default — only add `'use client'` when needed (ADR-0004) | **MUST** |
| All images use `next/image` (automatic WebP, resize, lazy loading) | **MUST** |
| All fonts use `next/font` (self-hosted, zero layout shift) | **MUST** |
| Every `<Image>` has explicit `width` and `height` (or `fill` + sized container) — prevents CLS | **MUST** |
| LCP image must have `priority` prop — preloads it, disables lazy loading | **MUST** |
| Don't import entire libraries — use tree-shakeable named imports | **MUST** |
| Don't load heavy libraries (charts, maps, editors) synchronously — use `next/dynamic` | **MUST** |
| Don't use `layout="fill"` without a sized parent container — causes CLS | **MUST NOT** |
| Don't ship `console.log` to production — ESLint catches this (ADR-0001) | **MUST NOT** |
| Use `<Suspense>` boundaries for independent async sections | **SHOULD** |
| Use `loading.tsx` for route-level loading states | **SHOULD** |
| Analyze bundle size after adding new dependencies | **SHOULD** |
| Run Lighthouse before major releases | **SHOULD** |
| Monitor Core Web Vitals in production (ADR-0014) | **SHOULD** |

---

## Image Optimization

### The `next/image` Component

`next/image` automatically:
- Converts to WebP/AVIF (30-50% smaller than JPEG/PNG)
- Resizes to the displayed size (don't load a 4000px image for a 200px avatar)
- Lazy loads by default (images below the fold load when scrolled to)
- Generates responsive `srcset` (different sizes for different screen widths)
- Serves from CDN with long cache headers

### Patterns

```tsx
// ✅ Static import — optimal for local images (build-time optimization)
import heroImage from '@/public/images/hero.webp'

<Image
  src={heroImage}
  alt="Hero banner showing our art gallery"
  priority  // ← LCP image — preloads, disables lazy load
  placeholder="blur"  // ← Shows blurred version while loading
/>

// ✅ Remote image — from uploads, CMS, or CDN
<Image
  src={post.coverImage}
  alt={post.title}
  width={1200}
  height={630}
  className="rounded-lg object-cover"
/>

// ✅ Fill mode — image fills parent container
<div className="relative h-64 w-full">
  <Image
    src={product.image}
    alt={product.name}
    fill
    className="object-cover"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  />
</div>

// ✅ Avatar — small, fixed size
<Image
  src={user.avatarUrl || '/images/default-avatar.png'}
  alt={`${user.name}'s avatar`}
  width={40}
  height={40}
  className="rounded-full"
/>
```

### The `sizes` Prop (Critical for Responsive Images)

Without `sizes`, Next.js generates images for the full viewport width — even if the image only takes 33% of the screen on desktop. This wastes bandwidth.

```tsx
// ❌ Missing sizes — Next.js assumes image is full viewport width
<Image src={img} alt="..." fill />

// ✅ With sizes — Next.js generates appropriate srcset
<Image
  src={img}
  alt="..."
  fill
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  // Mobile: full width, Tablet: half width, Desktop: third width
/>
```

### Image Format Guidelines

| Format | Use Case | Notes |
|--------|----------|-------|
| WebP | Photos, general images | Default — `next/image` converts automatically |
| AVIF | Photos (even smaller than WebP) | Supported by most browsers, Next.js converts automatically |
| SVG | Icons, logos, illustrations | Don't use `next/image` for SVGs — use `<svg>` inline or `<img>` |
| PNG | Images requiring transparency | Larger than WebP — use only when transparency is needed |

### LCP Optimization Checklist

The Largest Contentful Paint is usually a hero image, banner, or large heading. For images:

- [ ] LCP image has `priority` prop (preloads, disables lazy loading)
- [ ] LCP image is served from CDN (not origin server)
- [ ] LCP image is appropriately sized (not a 4000px image for a 600px display)
- [ ] LCP image has `sizes` prop (responsive srcset)
- [ ] No render-blocking CSS or JS before LCP element

---

## Font Optimization

### `next/font` (Zero Layout Shift)

```tsx
// src/app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',       // Show fallback font immediately, swap when loaded
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lang-depends-on-project"en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  )
}
```

```typescript
// tailwind.config.ts — reference the CSS variables
theme: {
  extend: {
    fontFamily: {
      sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      mono: ['var(--font-mono)', 'monospace'],
    },
  },
},
```

**Why `next/font`**: It self-hosts fonts (no external requests to Google Fonts), automatically applies `font-display: swap`, and generates optimal `@font-face` declarations. Zero CLS from font loading.

### Local Fonts (Custom Brand Fonts)

```tsx
import localFont from 'next/font/local'

const brandFont = localFont({
  src: [
    { path: './fonts/Brand-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Brand-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/Brand-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-brand',
  display: 'swap',
})
```

---

## Code Splitting & Dynamic Imports

### `next/dynamic` for Heavy Components

```tsx
// ✅ Heavy libraries loaded only when needed (not in initial bundle)
import dynamic from 'next/dynamic'

// Chart library (~200kB) — loaded only when dashboard is visible
const Chart = dynamic(() => import('@/components/features/chart/Chart'), {
  loading: () => <div className="h-64 animate-pulse rounded-lg bg-primary-100" />,
  ssr: false,  // Charts don't need SSR — skip server render
})

// Rich text editor (~300kB) — loaded when user opens editor
const RichTextEditor = dynamic(
  () => import('@/components/features/editor/RichTextEditor'),
  { loading: () => <div className="h-48 animate-pulse rounded-lg bg-primary-100" /> },
)

// Map component (~150kB) — loaded when visible
const Map = dynamic(() => import('@/components/features/map/Map'), {
  loading: () => <div className="h-96 animate-pulse rounded-lg bg-primary-100" />,
  ssr: false,
})
```

### Import Patterns

```typescript
// ❌ Importing entire library — entire lodash in the bundle
import _ from 'lodash'
_.debounce(fn, 300)

// ✅ Named import — only debounce is bundled
import { debounce } from 'lodash'  // ← still may import more than needed

// ✅✅ Subpath import — guaranteed minimal bundle
import debounce from 'lodash/debounce'

// ❌ Importing entire icon library
import * as Icons from 'lucide-react'
<Icons.Search />

// ✅ Named import — only Search icon is bundled
import { Search } from 'lucide-react'
```

---

## Streaming & Suspense

### Route-Level Loading (loading.tsx)

```tsx
// src/app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-primary-100" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-primary-100" />
        ))}
      </div>
    </div>
  )
}
```

### Component-Level Streaming (Suspense)

```tsx
// ✅ Stream independent sections — fast sections show immediately
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats load fast — show first */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      {/* Activity is slower — streams in when ready */}
      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivity />
      </Suspense>

      {/* Chart is heaviest — streams last */}
      <Suspense fallback={<ChartSkeleton />}>
        <AnalyticsChart />
      </Suspense>
    </div>
  )
}
```

**Key**: Each `<Suspense>` boundary streams independently. The user sees fast sections immediately while slow ones load. Without Suspense, the entire page waits for the slowest component.

---

## CLS Prevention

### Common CLS Causes and Fixes

| Cause | Fix |
|-------|-----|
| Images without dimensions | Always set `width`/`height` or use `fill` with sized container |
| Web fonts causing layout shift | Use `next/font` with `display: 'swap'` |
| Dynamic content above the fold | Reserve space with skeleton/placeholder |
| Ads or embeds loading late | Reserve space with fixed-height container |
| Toasts/banners pushing content | Use fixed/absolute positioning (Sonner does this correctly) |
| CSS animations on layout properties | Animate only `transform` and `opacity` (ADR-0003) |

```tsx
// ❌ Image without dimensions — causes CLS when image loads
<img src="/hero.jpg" alt="Hero" />

// ✅ Explicit dimensions — space reserved before image loads
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />

// ❌ Dynamic content that pushes layout
{isLoaded && <Banner />}  // Banner appears and pushes everything down

// ✅ Reserve space for dynamic content
<div className="min-h-[60px]">
  {isLoaded ? <Banner /> : null}  // Space already reserved
</div>
```

---

## Bundle Analysis

### Analyze Bundle Size

```bash
# Install analyzer (one-time)
pnpm add -D @next/bundle-analyzer

# Analyze
ANALYZE=true pnpm build
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // ... existing config
})
```

### Bundle Size Budget

| What | Budget | Action If Exceeded |
|------|--------|-------------------|
| First Load JS (shared) | < 90kB | Audit shared dependencies, check for accidental client components |
| Per-page JS | < 50kB | Dynamic import heavy sections, review client components |
| Total page weight (JS + CSS + images) | < 500kB | Optimize images, lazy load below-fold content |
| Individual dependency | < 50kB | Find lighter alternative or dynamic import |

### Checking Bundle Impact of New Dependencies

Before adding a dependency:

```bash
# Check bundle size at bundlephobia.com
# https://bundlephobia.com/package/package-name

# Or use import-cost VS Code extension (shows size inline)
```

---

## Server Component Performance

### Why Server Components Are Faster

```
Server Component:
  Server renders HTML → sends HTML → browser paints
  JS sent to client: 0kB

Client Component:
  Server renders HTML → sends HTML + JS bundle → browser paints → hydrates
  JS sent to client: component code + React runtime for that component

Server Component with async data:
  Server fetches data + renders HTML → streams to client → browser paints
  JS sent to client: 0kB. Database call happened on the server.
```

**Every `'use client'` directive adds JS to the client bundle.** The component code, its imports, and any hooks it uses are shipped to the browser.

### Minimizing Client Components

```tsx
// ❌ Entire feature is a Client Component (all JS shipped to browser)
'use client'
export const ProductPage = ({ id }: { id: string }) => {
  const [quantity, setQuantity] = useState(1)
  const product = useProduct(id)
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <img src={product.image} />
      <QuantitySelector value={quantity} onChange={setQuantity} />
      <AddToCartButton productId={id} quantity={quantity} />
    </div>
  )
}

// ✅ Only interactive parts are Client Components (minimal JS)
// ProductPage is a Server Component (fetches data on server, 0kB JS)
export default async function ProductPage({ params }: Props) {
  const { id } = await params
  const product = await getProduct(id)
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <Image src={product.image} alt={product.name} width={600} height={400} />
      <AddToCart productId={id} />  {/* Only this is 'use client' */}
    </div>
  )
}
```

---

## Performance Checklist (Per Project)

### Before Launch

- [ ] Lighthouse Performance score ≥ 90 on key pages
- [ ] LCP < 2.5s on mobile (test with Lighthouse or PageSpeed Insights)
- [ ] CLS < 0.1 (test with Lighthouse)
- [ ] INP < 200ms (test with Chrome DevTools → Performance panel)

> **Agent execution note**: Agents can run Lighthouse programmatically via `run_in_terminal`:
> ```bash
> npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless"
> ```
> For runtime metrics (JS heap, DOM nodes, layout count) and CPU profiling, use the Playwright MCP server's `browser_devtools_execute_cdp` capability with `Performance.getMetrics()`, `Profiler.start()`/`Profiler.stop()`, or `Tracing.start()`/`Tracing.end()`. See `docs/agent-tooling.md` for full MCP tool documentation.
- [ ] All images use `next/image` with explicit dimensions
- [ ] LCP image has `priority` prop
- [ ] Responsive images have `sizes` prop
- [ ] Fonts use `next/font` (no external font requests)
- [ ] Heavy libraries are dynamically imported
- [ ] Bundle analysis run — no unexpectedly large dependencies
- [ ] Server Components used by default — `'use client'` only where needed
- [ ] `<Suspense>` boundaries around independent async sections
- [ ] No layout shift from dynamic content (space reserved)
- [ ] Core Web Vitals monitoring set up (ADR-0014)
- [ ] Caching strategy applied to all fetches (ADR-0017)

### Ongoing

- [ ] Bundle size checked when adding new dependencies
- [ ] Lighthouse run on key pages after major changes
- [ ] Core Web Vitals dashboard reviewed weekly
- [ ] New client-side dependencies justified (size vs benefit)

---

## Anti-Patterns

```tsx
// ❌ Unoptimized image — no resize, no WebP, no lazy load
<img src="/hero.jpg" alt="Hero" style={{ width: '100%' }} />

// ✅ Optimized image
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />

// ❌ External font link — extra request, potential CLS
<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet" />

// ✅ next/font — self-hosted, zero CLS
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

// ❌ Loading heavy library at page level
import { Chart } from 'chart.js'

// ✅ Dynamic import — loaded only when needed
const Chart = dynamic(() => import('./Chart'), { ssr: false })

// ❌ Making everything a Client Component
'use client'  // On a component that has no interactivity

// ✅ Server Component by default — 0kB client JS
// No 'use client' needed — it's a Server Component

// ❌ No Suspense — entire page waits for slowest query
export default async function Page() {
  const fast = await getFast()      // 50ms
  const slow = await getSlow()      // 2000ms
  // User waits 2000ms to see anything!
}

// ✅ Suspense — fast content shows immediately
export default async function Page() {
  return (
    <>
      <Suspense fallback={<Skeleton />}>
        <FastSection />    {/* Shows in 50ms */}
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <SlowSection />    {/* Streams in after 2000ms */}
      </Suspense>
    </>
  )
}
```

---

## Rationale

### Why Performance Is a First-Class ADR

Performance is not an afterthought — it's a direct ranking factor (Google Core Web Vitals), a conversion driver (Amazon's 1-second study), and a user experience differentiator. Many of the rules in this ADR reference other ADRs (Server Components from ADR-0004, caching from ADR-0017, animation from ADR-0003) — this ADR ties them together into a unified performance strategy with measurable targets.

### Why Lighthouse Score Targets

Lighthouse provides a standardized, reproducible score. A ≥90 target is ambitious but achievable with the patterns in this ADR. Scores below 90 indicate real user-facing problems. The score is a proxy for user experience — not the goal itself.

### Key Factors
1. **Server Components** — zero client JS is the biggest performance win in Next.js.
2. **Image optimization** — `next/image` handles format, size, lazy loading, and CDN automatically.
3. **Font optimization** — `next/font` eliminates FOUT/FOIT and external requests.
4. **Streaming** — Suspense lets fast content render before slow content.
5. **Bundle awareness** — every dependency has a cost; dynamic imports defer it.
6. **Measurable targets** — Core Web Vitals give concrete, Google-backed thresholds.

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| `next/image` | Framework image optimization | ✅ Chosen: automatic WebP, resize, CDN, lazy load |
| `next/font` | Self-hosted fonts | ✅ Chosen: zero CLS, no external requests |
| `next/dynamic` | Component-level code splitting | ✅ Chosen: defers heavy libraries |
| Suspense streaming | Independent section loading | ✅ Chosen: fast content shows immediately |
| Lighthouse CI | Automated performance testing | ✅ Chosen: reproducible, actionable scores |
| `@next/bundle-analyzer` | Bundle visualization | ✅ Chosen: identifies bloated dependencies |

---

## Consequences

**Positive:**
- Server Components by default means most pages ship zero JS — fastest possible load.
- `next/image` automatically optimizes images (WebP, resize, lazy load) — no manual effort.
- `next/font` eliminates font-related CLS — better user experience and SEO.
- Suspense streaming improves perceived performance — users see content faster.
- Bundle budget prevents dependency creep — keeps the app lean.
- Measurable targets (Lighthouse ≥90, LCP <2.5s) make performance auditable.

**Negative:**
- Performance optimization takes development time — mitigated by building it into the development process (not as an afterthought).
- Dynamic imports add complexity (loading states, SSR considerations) — mitigated by providing clear patterns.
- `unstable_cache` may change API — mitigated by encapsulating in query functions (ADR-0017).
- Lighthouse scores vary between runs (±5 points) — mitigated by testing multiple times and focusing on trends.

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (Next.js, Server Components, deployment)
- [ADR-0002](./0002-styling.md) — Styling (Tailwind CSS is zero-runtime — no CSS-in-JS performance cost)
- [ADR-0003](./0003-animation.md) — Animation (only animate transform/opacity, LazyMotion for bundle size)
- [ADR-0004](./0004-components.md) — Components (Server Components by default, minimal client boundary)
- [ADR-0013](./0013-seo-metadata.md) — SEO (Core Web Vitals are a Google ranking factor)
- [ADR-0014](./0014-logging-observability.md) — Logging (Vercel Analytics / Sentry for Web Vitals monitoring)
- [ADR-0017](./0017-caching.md) — Caching (explicit cache on every fetch, ISR, revalidation)
- [ADR-0021](./0021-performance-react.md) — React Runtime & Rendering Performance (useMemo, useCallback, useTransition, re-render prevention)

