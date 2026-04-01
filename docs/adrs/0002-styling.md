# ADR-0002: Styling (Tailwind CSS)

**Status**: Accepted
**Date**: 2026-02-27 (updated 2026-03-11)
**Supersedes**: Previous ADR-0002 (2026-02-26)

---

## Context

Every Next.js project must choose ONE primary styling approach. Mixing systems creates inconsistent DX, larger bundles, and hydration mismatches. Additionally, the styling system must support app-specific branding (every new project has its own design), component library integration (teams will use shadcn/ui or similar), and optional visual development tooling (Storybook).

This template is the **bible for building any project** — from a small marketing site to an enterprise SaaS platform. Every project that uses this template MUST have a design system. The design system is not optional — it is a first-class deliverable alongside the application code. Placeholder tokens exist so the template compiles; they must never ship to production.

## Decision

**Tailwind CSS v3 is the sole styling approach. Every new project MUST customize design tokens to match its brand. Component libraries MUST be restyled to the project's design system. Storybook is included by default — all foundation primitives ship with co-located stories.**

---

## Rules

| Rule                                                                                                                                                                                                                                                                                                     | Level        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Use Tailwind utility classes for all styling                                                                                                                                                                                                                                                             | **MUST**     |
| Define all brand values in `tailwind.config.ts` → `theme.extend`                                                                                                                                                                                                                                         | **MUST**     |
| Customize design tokens for every new project (no shipping with template defaults)                                                                                                                                                                                                                       | **MUST**     |
| Restyle all component library output to match project tokens                                                                                                                                                                                                                                             | **MUST**     |
| Use `cn()` helper for conditional classes                                                                                                                                                                                                                                                                | **SHOULD**   |
| No hardcoded colors, spacing, or font sizes                                                                                                                                                                                                                                                              | **MUST NOT** |
| No Tailwind default palette colors (`gray`, `slate`, `zinc`, `neutral`, `stone`, `red`, `blue`, `green`, `yellow`, `purple`, `pink`, `indigo`, `teal`, `cyan`, `orange`, `amber`, `lime`, `emerald`, `sky`, `violet`, `rose`, `fuchsia`) — use ONLY colors defined in the project's `tailwind.config.ts` | **MUST NOT** |
| No CSS-in-JS (`styled-components`, `emotion`)                                                                                                                                                                                                                                                            | **MUST NOT** |
| No CSS Modules (`*.module.css`)                                                                                                                                                                                                                                                                          | **MUST NOT** |
| No inline `style` for static values                                                                                                                                                                                                                                                                      | **MUST NOT** |
| `@apply` in CSS sparingly (repeated patterns only)                                                                                                                                                                                                                                                       | **MAY**      |

### Default Tailwind Palette Is Forbidden

Tailwind ships with a default color palette (`gray`, `slate`, `zinc`, `neutral`, `stone`, `red`, `blue`, etc.). These are NOT project tokens — they are Tailwind's generic defaults. **Using them produces inconsistent, un-branded UI.**

```tsx
// ❌ Forbidden — uses Tailwind default palette colors
<h1 className="text-gray-900">Title</h1>
<p className="text-gray-600">Description</p>
<div className="bg-gray-50 border-gray-300">...</div>

// ✅ Correct — uses project tokens from tailwind.config.ts
<h1 className="text-foreground">Title</h1>
<p className="text-foreground/70">Description</p>
<div className="bg-secondary-100 border-secondary-300">...</div>
```

**Why this matters**: Agents frequently reach for `gray-*` when styling neutral UI (error pages, loading states, 404 pages). This produces un-branded output that breaks visual consistency. The project's `secondary-*` scale and `foreground` token exist specifically for these use cases.

| Default palette color | Project token replacement             |
| --------------------- | ------------------------------------- |
| `text-gray-900`       | `text-foreground`                     |
| `text-gray-700`       | `text-foreground/80`                  |
| `text-gray-600`       | `text-foreground/70`                  |
| `text-gray-400`       | `text-foreground/50`                  |
| `bg-gray-50`          | `bg-secondary-100` or `bg-background` |
| `bg-gray-100`         | `bg-secondary-200`                    |
| `border-gray-300`     | `border-secondary-300`                |

This applies to ALL files — including `error.tsx`, `not-found.tsx`, `global-error.tsx`, `loading.tsx`, and `dashboard/` pages. No file gets a free pass.

### When Inline `style` Is Allowed

Only for:

1. Dynamic values computed at runtime (drag-and-drop positions, animation MotionValues)
2. Third-party library integration that requires inline styles

---

## App-Specific Setup

The template ships with **placeholder tokens** (blue primary, purple secondary). These are NOT a design — they exist so the template compiles and looks presentable. **Every new project MUST replace them.**

### Step 1: Get Design Values

Before writing any UI code, gather from the design:

- **Primary color** — brand color with full 50-950 scale
- **Secondary color** — accent color with full 50-950 scale
- **Semantic colors** — success, warning, error, info (can keep defaults if no design spec)
- **Typography** — font families, any custom sizes or line heights
- **Spacing** — any custom spacing beyond Tailwind defaults
- **Border radius** — brand-specific rounding (e.g., `rounded-2xl` vs `rounded-lg` as default)

### Step 2: Update `tailwind.config.ts`

```ts
// tailwind.config.ts — replace placeholder values with your brand
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ✅ Replace with your brand colors
        primary: {
          50: '#f0f9ff', // ← from your design system
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // ← base primary
          600: '#0284c7', // ← buttons, links
          700: '#0369a1', // ← hover states
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49', // ← text on light backgrounds
        },
        // ✅ Replace with your accent color
        secondary: {
          /* ... */
        },
        // ✅ Keep or customize semantic colors
        success: {
          /* ... */
        },
        warning: {
          /* ... */
        },
        error: {
          /* ... */
        },
        info: {
          /* ... */
        },
        // ✅ CSS custom properties for dynamic light/dark
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
      },
      fontFamily: {
        // ✅ Replace with your brand fonts
        sans: ['var(--font-your-brand)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-your-mono)', 'monospace'],
      },
      // ✅ Add any custom spacing, radii, shadows from your design
    },
  },
  plugins: [],
}
```

### Step 3: Update `docs/references/design-tokens.md`

Document the actual values you chose. This file is the human-readable reference for the config.

### Step 4: Update CSS Custom Properties

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%; /* ← light mode background */
    --foreground: 222 47% 11%; /* ← light mode text */
  }

  .dark {
    --background: 222 47% 11%; /* ← dark mode background */
    --foreground: 210 40% 98%; /* ← dark mode text */
  }
}
```

---

## Tailwind v3 vs v4

We stay on **Tailwind CSS v3** (currently `^3.4.17`). Tailwind v4 is now stable with a CSS-first config model and new engine, but migration involves breaking changes (config format, custom plugin API, class name changes). Migrating is a deliberate project decision — not an automatic upgrade. **A new ADR is required before any project migrates to v4.** The v4 ADR must evaluate: config migration effort, plugin ecosystem compatibility (especially `prettier-plugin-tailwindcss`, `eslint-plugin-tailwindcss`), shadcn/ui compatibility, and any CSS custom property changes.

**Do not upgrade to v4 without a dedicated ADR.**

---

## Component Library Strategy

### Pre-Built Foundation Primitives

The starter ships with 6 foundation UI primitives already implemented in `src/components/ui/` with co-located Storybook stories — see [ADR-0023](./0023-ui-foundation-primitives.md) for the full inventory and specifications. These primitives (Typography, Button, Container, Stack, Badge, Separator) use project tokens from `tailwind.config.ts` and are ready for mockup-driven customization. **Do not rebuild them from scratch — customize the existing implementations.**

For components beyond the foundation set (Card, Dialog, Dropdown, Tabs, etc.), use shadcn/ui or build custom per ADR-0023's Recommended/Optional tiers.

### Recommended: shadcn/ui

shadcn/ui is the recommended component library for components beyond the foundation set because:

1. **Copy-paste model** — components are copied into `src/components/ui/`, not installed as a dependency. You own the code.
2. **Tailwind-native** — styled with utility classes, uses the same design token system.
3. **Accessible** — built on Radix UI primitives, WCAG 2.1 AA by default.
4. **No lock-in** — no runtime dependency, no version conflicts.

### Setup

```bash
# Initialize shadcn/ui (follow prompts)
pnpm dlx shadcn-ui@latest init

# Add specific components as needed
pnpm dlx shadcn-ui@latest add button
pnpm dlx shadcn-ui@latest add dialog
pnpm dlx shadcn-ui@latest add dropdown-menu
```

### The Restyling Rule

**Every component from a library MUST be restyled to match the project's design tokens.** shadcn/ui ships with sensible defaults, but they are NOT your design.

```tsx
// ❌ Using shadcn/ui defaults as-is (generic look)
;<Button variant='default'>Submit</Button>

// ✅ Restyled to match project design tokens
// src/components/ui/button/Button.tsx — after customization
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // ✅ Uses YOUR project tokens, not shadcn defaults
        primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
        secondary: 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200',
        outline: 'border border-primary-300 text-primary-700 hover:bg-primary-50',
        ghost: 'text-primary-700 hover:bg-primary-50',
        danger: 'bg-error-600 text-white hover:bg-error-700',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)
```

### Restyling Checklist (After Adding a Component)

When you add a shadcn/ui component (or any library component):

- [ ] Replace default colors with project tokens (`primary-*`, `secondary-*`, `error-*`)
- [ ] Replace default border-radius with project standard
- [ ] Replace default focus ring with project pattern (`focus-visible:ring-2 focus-visible:ring-primary-500`)
- [ ] Verify font sizes match project typography scale
- [ ] Verify spacing matches project spacing scale
- [ ] Test all variants (hover, active, focus, disabled) against design
- [ ] Verify dark mode if applicable (`dark:` prefixed classes)
- [ ] Export from correct barrel (`src/components/ui/index.ts`)

### Compatible vs Incompatible Libraries

| Library             | Compatible     | Why                                                         |
| ------------------- | -------------- | ----------------------------------------------------------- |
| shadcn/ui           | ✅ Recommended | Copy-paste, Tailwind-native, Radix-based, you own the code  |
| Radix UI Primitives | ✅             | Unstyled headless — you add all Tailwind styles             |
| Headless UI         | ✅             | Unstyled headless — you add all Tailwind styles             |
| Ark UI              | ✅             | Unstyled headless — you add all Tailwind styles             |
| MUI (Material UI)   | ❌ Forbidden   | Own CSS-in-JS runtime, conflicts with RSC and Tailwind      |
| Chakra UI           | ❌ Forbidden   | Own CSS-in-JS runtime, same conflicts                       |
| Ant Design          | ❌ Forbidden   | Own styling system, massive bundle, not Tailwind-compatible |
| Mantine             | ❌ Forbidden   | Own CSS-in-JS, same conflicts                               |

**Rule**: Only **unstyled/headless** libraries or **Tailwind-native** libraries are allowed. Any library that brings its own CSS runtime is forbidden.

---

## Storybook (Default)

### Decision

Storybook is **included by default** in this starter. All 6 foundation UI primitives ship with co-located story files, providing isolated component development, living documentation via autodocs, and a visual contract for the design system.

### Framework Adapter: `@storybook/react-vite`

We use `@storybook/react-vite` instead of `@storybook/nextjs`. The Vite adapter is faster (instant HMR, no webpack overhead) and sufficient for our use case — foundation primitives are pure React components using Tailwind classes, `cn()`, and `cva`. They don't depend on Next.js-specific features (`next/image`, `next/router`, etc.) at the component level. If a future component needs `next/image` in stories, add a mock rather than switching adapters.

### When to Remove Storybook

Storybook should only be removed in rare cases where the project is a minimal single-page app with no reusable components:

```
Does the project have reusable components in src/components/ui/?
  YES → Keep Storybook (default)
  NO → You may remove it, but consider keeping it for future growth
```

### Setup

```bash
# Initialize Storybook with Vite builder
pnpm dlx storybook@latest init

# This adds:
# - .storybook/main.ts (config)
# - .storybook/preview.ts (global decorators)
# - package.json scripts: storybook, build-storybook
```

After init, configure for Tailwind and path aliases:

```ts
// .storybook/main.ts
import react from '@vitejs/plugin-react'

import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    config.plugins = config.plugins || []
    config.plugins.push(react())

    // Resolve @/ path alias so imports like @/lib/utils work in stories
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': new URL('../src', import.meta.url).pathname,
        '@contracts': new URL('../contracts', import.meta.url).pathname,
      }
    }
    return config
  },
}

export default config
```

```ts
// .storybook/preview.ts
import '../src/app/globals.css' // ← Import Tailwind styles + CSS custom properties

import type { Preview } from '@storybook/react'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
```

### Compatibility: What Works Out of the Box

| Tool                                         | Works in Storybook? | Notes                                                                                                          |
| -------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Tailwind CSS                                 | ✅ Yes              | Import `globals.css` in `preview.ts` — all utilities render                                                    |
| `cn()` (clsx + tailwind-merge)               | ✅ Yes              | Just a JS function, no special config                                                                          |
| `class-variance-authority` (cva)             | ✅ Yes              | Just a JS function, variant args map to Storybook controls                                                     |
| shadcn/ui components                         | ✅ Yes              | They're local files using Tailwind — render identically                                                        |
| Radix UI primitives                          | ✅ Yes              | Headless — Tailwind styling renders normally                                                                   |
| Headless UI                                  | ✅ Yes              | Same as Radix — headless + Tailwind                                                                            |
| CSS custom properties (`--background`, etc.) | ✅ Yes              | Loaded via `globals.css` import                                                                                |
| `next/image`                                 | ⚠️ Partial          | Use standard `<img>` in stories, or add a [Next.js image mock](https://storybook.js.org/recipes/nextjs#images) |
| `next/link`                                  | ⚠️ Partial          | Works for rendering; navigation won't route in Storybook                                                       |
| Framer Motion (`m.*`)                        | ✅ Yes              | Wrap story with `<MotionProvider>` decorator if needed                                                         |

> **Key point**: Because shadcn/ui components are just local `.tsx` files using Tailwind classes and `cva`, they work in Storybook without ANY extra configuration. This is one of the main advantages of the copy-paste model over runtime-dependent libraries.

### Story Pattern

```tsx
// src/components/ui/button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'

import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4'>
      <Button variant='primary'>Primary</Button>
      <Button variant='secondary'>Secondary</Button>
      <Button variant='outline'>Outline</Button>
      <Button variant='ghost'>Ghost</Button>
      <Button variant='danger'>Danger</Button>
    </div>
  ),
}

export const AllSizes: Story = {
  render: () => (
    <div className='flex items-center gap-4'>
      <Button size='sm'>Small</Button>
      <Button size='md'>Medium</Button>
      <Button size='lg'>Large</Button>
    </div>
  ),
}
```

### Story File Conventions

| Convention               | Rule                                                    |
| ------------------------ | ------------------------------------------------------- |
| Co-locate stories        | `Button.stories.tsx` next to `Button.tsx`               |
| Story title matches tier | `title: 'UI/Button'` or `title: 'Features/UserProfile'` |
| Use `tags: ['autodocs']` | Auto-generate props documentation                       |
| Cover all variants       | One story per variant + an "AllVariants" story          |
| Cover all states         | Hover, focus, disabled, loading, error                  |

### Storybook Packages (Pre-Approved)

| Package                       | Install                                | Purpose                               |
| ----------------------------- | -------------------------------------- | ------------------------------------- |
| `storybook`                   | `pnpm dlx storybook@latest init`       | Core Storybook                        |
| `@storybook/react`            | Auto-installed by init                 | React renderer                        |
| `@storybook/react-vite`       | Auto-installed by init                 | Vite-based framework adapter          |
| `@storybook/addon-essentials` | Auto-installed by init                 | Controls, docs, viewport, backgrounds |
| `@vitejs/plugin-react`        | Auto-installed by init                 | React support for Vite                |
| `vite`                        | Auto-installed by init                 | Build tool                            |
| `@chromatic-com/storybook`    | `pnpm add -D @chromatic-com/storybook` | Visual regression testing (optional)  |

---

## Responsive Design Strategy

### Mobile-First Is Mandatory

All layouts MUST be built mobile-first. Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) are additive — they apply styles at that breakpoint and above. Write the mobile layout as the default, then add breakpoints for wider screens.

```tsx
// ✅ Mobile-first — mobile layout is default, desktop overrides added
<div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
  <div className="w-full lg:w-1/2">...</div>
  <div className="w-full lg:w-1/2">...</div>
</div>

// ❌ Desktop-first — hiding mobile content is not a strategy
<div className="hidden lg:flex">
  {/* Desktop users see this, mobile users see nothing */}
</div>
```

### Breakpoint Reference

| Breakpoint | Min Width | Typical Use                  |
| ---------- | --------- | ---------------------------- |
| (default)  | 0px       | Mobile phones                |
| `sm:`      | 640px     | Large phones / small tablets |
| `md:`      | 768px     | Tablets                      |
| `lg:`      | 1024px    | Laptops / small desktops     |
| `xl:`      | 1280px    | Desktops                     |
| `2xl:`     | 1536px    | Large desktops               |

### Rules

| Rule                                                                                                                                        | Level      |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Build mobile-first — default styles target the smallest supported viewport                                                                  | **MUST**   |
| All layouts MUST be usable at 320px minimum width                                                                                           | **MUST**   |
| Navigation MUST be accessible on all screen sizes — hiding nav links on mobile without an alternative (hamburger menu, drawer) is forbidden | **MUST**   |
| Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) — not CSS media queries                                                              | **MUST**   |
| Test at all breakpoints before shipping                                                                                                     | **SHOULD** |
| Consider touch targets on mobile (minimum 44×44px for interactive elements)                                                                 | **SHOULD** |

### className Override Depth

When restyling a component for a specific context (e.g., a `SectionLabel` on a dark background), prefer **variant props** over deep `className` overrides.

```tsx
// ❌ Fragile — depends on SectionLabel's internal DOM structure
<SectionLabel className="[&>span:first-child]:bg-white [&>span]:text-white">
  CONTACT
</SectionLabel>

// ✅ Robust — variant prop encapsulates the style change
<SectionLabel variant="dark">
  CONTACT
</SectionLabel>

// Inside SectionLabel implementation:
const SectionLabel = ({ variant = 'default', ... }) => (
  <div ...>
    <span className={cn(
      'inline-block h-px w-6',
      variant === 'default' ? 'bg-primary-600' : 'bg-white',
    )} />
    <span className={cn(
      'text-xs font-semibold uppercase tracking-wider',
      variant === 'default' ? 'text-primary-600' : 'text-white',
    )}>
      {children}
    </span>
  </div>
)
```

| Rule                                                                                                                                 | Level      |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Add a variant prop when the same className override is needed 2+ times                                                               | **SHOULD** |
| Arbitrary selectors targeting internal DOM structure (`[&>span]`, `[&>div:first-child]`) SHOULD be avoided in favor of variant props | **SHOULD** |
| If a one-off override is truly needed, prefer shallow selectors over deep ones                                                       | **SHOULD** |

---

## Rationale

Tailwind CSS was chosen because this is a **Server Component-first** project. CSS-in-JS libraries (styled-components, Emotion) inject styles at runtime, which conflicts with Server Components and causes hydration mismatches. CSS Modules work but require context-switching between files and don't provide a design token system. Tailwind compiles to static CSS, has zero runtime cost, and its utility-first model maps directly to design tokens — making it the only approach that checks every box for a Next.js App Router template.

### Key Factors

1. **Server Component compatibility** — CSS-in-JS requires client-side runtime; Tailwind doesn't.
2. **Token-based design** — `tailwind.config.ts` is the single source of truth for brand values.
3. **AI agent friendly** — utility classes are self-documenting; agents don't need to navigate separate style files.
4. **Component library ecosystem** — shadcn/ui, Radix, Headless UI all work natively with Tailwind.

## Options Considered

| Option            | Description                 | Why Chosen / Why Not                                           |
| ----------------- | --------------------------- | -------------------------------------------------------------- |
| Tailwind CSS v3   | Utility-first CSS framework | ✅ Chosen: zero runtime, RSC-compatible, tokens built in       |
| CSS Modules       | Scoped CSS files            | ❌ No design token system, file-switching overhead             |
| styled-components | CSS-in-JS runtime           | ❌ Runtime cost, hydration issues with RSC                     |
| Emotion           | CSS-in-JS runtime           | ❌ Same RSC issues as styled-components                        |
| Vanilla Extract   | Zero-runtime CSS-in-TS      | ❌ Smaller ecosystem, no utility-first model                   |
| Tailwind CSS v4   | Next-gen Tailwind           | ❌ Deferred: breaking config changes, ecosystem not stable yet |

---

## Implementation Guidelines

### File Locations

```
tailwind.config.ts                — Design tokens (source of truth)
src/app/globals.css               — Tailwind directives + CSS custom properties
src/lib/utils.ts                  — cn() helper
src/components/ui/                — Pre-built foundation primitives (ADR-0023)
src/components/ui/button/
  Button.tsx                      — Component
  Button.stories.tsx              — Storybook story (co-located)
  index.ts                        — Barrel export
```

### Code Patterns

```tsx
// ✅ Correct — using tokens, cn(), conditional classes
import { cn } from '@/lib/utils'

type CardProps = {
  variant?: 'default' | 'elevated'
  children: React.ReactNode
  className?: string
}

export const Card = ({ variant = 'default', children, className }: CardProps) => (
  <div
    className={cn(
      'rounded-lg border p-6',
      variant === 'default' && 'border-primary-200 bg-white',
      variant === 'elevated' && 'border-transparent bg-white shadow-lg',
      className,
    )}
  >
    {children}
  </div>
)

// ❌ Avoid — hardcoded values, no tokens
export const Card = ({ children }) => (
  <div style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
    {children}
  </div>
)
```

---

## Consequences

**Positive:**

- Zero-runtime styling works perfectly with Server Components.
- `tailwind.config.ts` acts as a living design token contract.
- `cn()` utility resolves class conflicts predictably.
- Large ecosystem of compatible libraries (shadcn/ui, Headless UI, Radix).
- App-specific setup process ensures every project has its own identity.
- Storybook ships with stories for all 6 foundation primitives — living documentation from day one.

**Negative:**

- Long class strings can reduce JSX readability — mitigated by `cn()` and extracting repeated patterns.
- Tailwind v3 → v4 migration will require a dedicated effort — mitigated by pinning `^3.4` and deferring via ADR.
- Custom designs outside the token system require config changes — mitigated by clear token extension process.
- Restyling library components takes effort — mitigated by shadcn/ui's copy-paste model (you already own the code).
- Storybook adds dev dependencies (~50MB node_modules) — mitigated by providing immediate value through pre-built primitive stories.

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (framework context, shadcn/ui reference)
- [ADR-0003](./0003-animation.md) — Animation (uses Tailwind for simple transitions)
- [ADR-0004](./0004-components.md) — Components (styling within tiers)
- [ADR-0009](./0009-testing.md) — Testing (Storybook for visual regression)
- [ADR-0023](./0023-ui-foundation-primitives.md) — UI Foundation Primitives (pre-built inventory, implementation order)
