---
name: styling-tokens
description: >-
  Tailwind token customization — color scale generation, flat vs scaled decision tree,
  HSL conversion, tailwind.config.ts structure, globals.css custom properties, font
  registration, responsive breakpoints, no arbitrary values. Use when updating
  tailwind.config.ts, customizing design tokens, adding colors or fonts from a mockup,
  or generating color scales.
---

# Styling — Token Customization Patterns

**Compiled from**: ADR-0002 §App-Specific Setup, §Tailwind v3 vs v4, §Responsive Design
**Last synced**: 2026-03-11

---

> `tailwind.config.ts` is the single source of truth for design tokens. `globals.css` holds CSS custom properties for dynamic values (light/dark). This file covers **how to update both from a mockup**.

## Customization Workflow

### Step 1: Extract Design Values from Mockup

Before touching config, gather from the mockup CSS:

- **Primary color** — brand color with full 50–950 scale
- **Secondary color** — accent color with full 50–950 scale
- **Semantic colors** — success, warning, error, info (keep defaults if no design spec)
- **Typography** — font families, custom sizes/line heights
- **Spacing** — any values beyond Tailwind defaults
- **Border radius** — brand-specific rounding

### Flat vs Scaled Tokens — Decision Tree

Not every color needs a full 50–950 scale. Use this decision tree:

| Color Role                                                                 | Token Strategy                              | Example                                |
| -------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------- |
| **Action/state colors** (primary, secondary, success, error, warning)      | Full 50–950 scale                           | `primary-50` through `primary-950`     |
| **Surface/background colors** (cream, warm-gray, charcoal, background-alt) | Flat single-value token                     | `surface-cream: '#F5F0EB'`             |
| **Border/structure colors**                                                | Flat single-value token                     | `border: '#E5E5E5'`                    |
| **Foreground/text**                                                        | HSL CSS variable (for light/dark switching) | `foreground: 'hsl(var(--foreground))'` |

Action colors need shades for hover/active/focus states. Surface colors are used as-is — one value, one purpose.

### Hex → HSL Conversion

`globals.css` CSS custom properties use **HSL components without the `hsl()` wrapper**:

```css
:root {
  --background: 0 0% 100%; /* white — H:0 S:0% L:100% */
  --foreground: 222 47% 11%; /* near-black */
}
```

Tailwind references these via `hsl(var(--background))` in `tailwind.config.ts`. The separation allows Tailwind to inject opacity modifiers (e.g., `bg-background/50`).

To convert: take any hex value, convert to HSL, then write just the three components separated by spaces.

### Step 2: Update `tailwind.config.ts`

> **CRITICAL — tailwind-merge sync**: Every custom token key added to `fontSize`, `letterSpacing`, or any other `theme.extend` namespace **must** also be registered in `extendTailwindMerge` inside `src/lib/utils.ts`. Without this, `twMerge()` (used by the `cn()` utility) will misclassify custom utilities — e.g., `text-specimen` is treated as a text-color class instead of font-size, and gets silently stripped when merged with an actual color class like `text-white`. See the **tailwind-merge Custom Token Registration** section below for the full pattern.

Replace placeholder tokens in `theme.extend.colors`:

```ts
// tailwind.config.ts — structure to follow
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './.storybook/**/*.{ts,tsx}', // ← Keep this for Storybook class scanning
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '...',
          100: '...',
          200: '...',
          300: '...',
          400: '...',
          500: '...', // ← base
          600: '...', // ← buttons, links
          700: '...', // ← hover states
          800: '...',
          900: '...',
          950: '...',
        },
        secondary: {
          /* same 50–950 scale */
        },
        success: { 50: '...', 100: '...', 500: '...', 600: '...', 700: '...' },
        warning: { 50: '...', 100: '...', 500: '...', 600: '...', 700: '...' },
        error: { 50: '...', 100: '...', 500: '...', 600: '...', 700: '...' },
        info: { 50: '...', 100: '...', 500: '...', 600: '...', 700: '...' },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
      },
      fontFamily: {
        sans: ['var(--font-your-brand)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-your-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

**Rules:**

- Primary and secondary MUST have full 50–950 scale.
- Semantic colors need at minimum: 50, 100, 500, 600, 700 stops.
- `background` and `foreground` MUST use `hsl(var(--...))` for light/dark switching.
- `.storybook/**` MUST remain in the `content` array — Storybook uses Tailwind classes in decorators.
- **No arbitrary values in primitives** — if the mockup uses sizes/widths not in Tailwind defaults, add named tokens to the config instead of using arbitrary values like `text-[2.75rem]` in component code:

  ```ts
  // ✅ Named token in tailwind.config.ts
  fontSize: { display: ['2.75rem', { lineHeight: '1.1' }] },
  maxWidth: { content: '87.5rem' },

  // ❌ Arbitrary value in component
  className='text-[2.75rem] max-w-[87.5rem]'
  ```

### Step 3: Update CSS Custom Properties

> **Design Tokens Sync**: After updating `tailwind.config.ts` and/or `globals.css`, also update `src/components/ui/design-tokens.json` to reflect any added, changed, or removed tokens. This file is the structured, agent-readable source of truth for what tokens exist in the project.

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%; /* ← HSL values without hsl() wrapper */
    --foreground: 222 47% 11%;
  }
  .dark {
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Rules:**

- Values are HSL components only (no `hsl()` wrapper) — Tailwind adds the wrapper via `hsl(var(...))`.
- Dark mode values use `.dark` class selector (Tailwind `darkMode: 'class'` strategy).

---

## Color Scale Structure

Every project color follows the same shade convention:

| Shade | Purpose                           |
| ----- | --------------------------------- |
| 50    | Lightest background tint          |
| 100   | Light background, badge fills     |
| 200   | Borders, subtle backgrounds       |
| 300   | Borders, dividers                 |
| 400   | Placeholder text, disabled states |
| 500   | Base — icons, mid-tone elements   |
| 600   | Buttons, links, primary actions   |
| 700   | Hover states for 600              |
| 800   | Active/pressed states, dark text  |
| 900   | Heading text on light backgrounds |
| 950   | Darkest — near-black text         |

---

## Default Palette Replacement Map

When encountering default Tailwind palette in existing code, replace:

| Default palette   | Project token replacement             |
| ----------------- | ------------------------------------- |
| `text-gray-900`   | `text-foreground`                     |
| `text-gray-700`   | `text-foreground/80`                  |
| `text-gray-600`   | `text-foreground/70`                  |
| `text-gray-400`   | `text-foreground/50`                  |
| `bg-gray-50`      | `bg-secondary-100` or `bg-background` |
| `bg-gray-100`     | `bg-secondary-200`                    |
| `border-gray-300` | `border-secondary-300`                |

This applies to ALL files — `error.tsx`, `not-found.tsx`, `global-error.tsx`, `loading.tsx`, dashboard pages. No file is exempt.

---

## Responsive Design

### Mobile-First Is Mandatory

```tsx
// ✅ Mobile-first — mobile is default, desktop overrides added
<div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
  <div className="w-full lg:w-1/2">...</div>
</div>

// ❌ Desktop-first — hiding mobile content
<div className="hidden lg:flex">...</div>
```

### Breakpoint Reference

| Prefix | Min Width | Use                        |
| ------ | --------- | -------------------------- |
| (none) | 0px       | Mobile phones              |
| `sm:`  | 640px     | Large phones/small tablets |
| `md:`  | 768px     | Tablets                    |
| `lg:`  | 1024px    | Laptops/small desktops     |
| `xl:`  | 1280px    | Desktops                   |
| `2xl:` | 1536px    | Large desktops             |

**Rules:**

- All layouts usable at 320px minimum width.
- Use Tailwind responsive prefixes — not CSS media queries.
- Touch targets minimum 44×44px on mobile.

---

## Tailwind v3 — Do Not Upgrade

Stay on `^3.4.17`. Tailwind v4 has breaking config changes. A dedicated ADR is required before migration. Do not accept v4 suggestions from package managers or AI agents.

---

## Color Scale Generation

When the `@feo-ui-foundation` agent needs to generate a full color scale from a single base color, use this algorithm:

### HSL Lightness Ramp Method

1. Convert the user's base hex color to HSL. This becomes the **600 shade** (primary action color — buttons, links).
2. Generate the remaining shades by adjusting lightness while keeping hue constant and slightly reducing saturation at extremes:

| Shade | Lightness formula                    | Saturation adjustment |
| ----- | ------------------------------------ | --------------------- |
| 50    | 97%                                  | base × 0.3            |
| 100   | 93%                                  | base × 0.4            |
| 200   | 85%                                  | base × 0.6            |
| 300   | 74%                                  | base × 0.8            |
| 400   | 60%                                  | base × 0.9            |
| 500   | 48%                                  | base × 1.0            |
| 600   | base lightness (user's chosen color) | base × 1.0            |
| 700   | base lightness × 0.82                | base × 1.0            |
| 800   | base lightness × 0.64                | base × 0.95           |
| 900   | base lightness × 0.48                | base × 0.9            |
| 950   | base lightness × 0.35                | base × 0.85           |

3. Convert each HSL result back to hex for `tailwind.config.ts`.
4. Clamp all values: lightness 3–97%, saturation 5–100%.

### Quality Check

After generating the scale, verify:

- **50** is near-white (lightness > 95%)
- **950** is near-black (lightness < 15%)
- **500–700** range has sufficient contrast against white (WCAG AA for normal text: 4.5:1)
- Adjacent shades have visible distinction (minimum ~5% lightness difference)

### When User Says "Help Me Pick"

Present 5 curated base colors with their generated scales previewed as a table. Group by mood:

| Mood    | Suggested base hex | Description         |
| ------- | ------------------ | ------------------- |
| Warm    | `#D97706`          | Amber/gold          |
| Cool    | `#2563EB`          | Royal blue          |
| Earthy  | `#92400E`          | Burnt umber         |
| Vibrant | `#E11D48`          | Rose/crimson        |
| Neutral | `#475569`          | Slate (desaturated) |

These are starting points — the user can adjust. Generate the full scale from whichever they pick, show it, and let them confirm or tweak.

---

## Font Registration

When a mockup introduces custom fonts, register them in three places:

### 1. `src/app/layout.tsx` — Import and define CSS variables

```tsx
import { Playfair_Display, Source_Sans_3 } from 'next/font/google'

const display = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
})
const body = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body',
})

// Apply to <html> or <body>
<html className={`${display.variable} ${body.variable} antialiased`}>
```

> **CRITICAL — `antialiased` on `<html>`**: Always include `antialiased` in the `<html>` className. Tailwind's Preflight does **not** set `-webkit-font-smoothing: antialiased` — it must be applied explicitly. Without it, macOS browsers default to subpixel antialiasing, which renders text **visibly thicker and with RGB fringing**, causing fonts to appear a different weight/color than the mockup even when hex values match exactly. This is the single most common cause of "colors look different" when comparing a Next.js app to a static HTML mockup that sets `html { -webkit-font-smoothing: antialiased }` in its reset.

### 2. `tailwind.config.ts` — Reference CSS variables

```ts
fontFamily: {
  display: ['var(--font-display)', 'serif'],
  body: ['var(--font-body)', 'sans-serif'],
}
```

### 3. Typography variants — Use the named font tokens

```tsx
const variantStyles = {
  h1: 'font-display text-4xl font-bold tracking-tight lg:text-5xl',
  body: 'font-body text-base leading-relaxed',
  // ...
}
```

Font names in the mockup's CSS (e.g., `font-family: 'Playfair Display', serif`) map to `next/font/google` imports. The CSS variable wiring ensures fonts are self-hosted and optimized by Next.js.

---

## tailwind-merge Custom Token Registration

`tailwind-merge` (`twMerge`) resolves Tailwind class conflicts in the `cn()` utility (`src/lib/utils.ts`). It has built-in knowledge of Tailwind's default class groups but does **not** recognize custom token keys added via `theme.extend`.

### The Problem

When you add `fontSize: { specimen: ['0.5625rem', ...] }` to `tailwind.config.ts`, Tailwind generates `text-specimen` as a font-size utility. But `twMerge` doesn't know `specimen` is a font-size — it classifies any `text-*` class it doesn't recognize as a text-color. This causes silent stripping:

```tsx
// cn('text-specimen', 'text-white')  →  'text-white'
// ❌ text-specimen is silently removed — twMerge thinks it's a color conflict
```

### The Fix — `extendTailwindMerge`

Use `extendTailwindMerge` instead of `twMerge` and register all custom token keys in their correct class groups:

```ts
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            // Every custom fontSize key from tailwind.config.ts
            'display-sm',
            'display-md',
            'display-lg',
            'h1-sm',
            'h1-lg',
            'h2-sm',
            'h2-md',
            'h2-lg',
            'h3-sm',
            'h3-md',
            'h3-lg',
            'h4-sm',
            'h4-lg',
            'body-base',
            'body-sm',
            'caption',
            'specimen',
            'micro',
            'detail',
            'button',
          ],
        },
      ],
    },
  },
})

export const cn = (...inputs: ClassValue[]): string => {
  return customTwMerge(clsx(inputs))
}
```

### When to Update

**Every time** you add, rename, or remove a custom key in `tailwind.config.ts` under `theme.extend.fontSize`, you **must** update the `font-size` class group in `extendTailwindMerge` to match. The same applies to other namespaces that produce `text-*` or other ambiguous utility prefixes.

### Affected Namespaces

| `tailwind.config.ts` namespace | Utility prefix | tailwind-merge class group | Needs registration?                              |
| ------------------------------ | -------------- | -------------------------- | ------------------------------------------------ |
| `fontSize`                     | `text-*`       | `font-size`                | **Yes** — conflicts with `text-color`            |
| `letterSpacing`                | `tracking-*`   | `tracking`                 | Usually no — `tracking-*` is unambiguous         |
| `fontFamily`                   | `font-*`       | `font-family`              | Usually no — `font-display` etc. are unambiguous |
| `colors`                       | various        | various                    | Usually no — unless nested keys overlap          |

The critical namespace is `fontSize` because its `text-*` prefix collides with `text-color`. Always register custom fontSize keys.
