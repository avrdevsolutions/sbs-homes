# ADR-0023: UI Foundation Primitives

**Status**: Accepted
**Date**: 2026-03-11 (updated from 2026-03-10)
**Supersedes**: N/A

---

## Context

ADR-0002 (Styling) defines the design token system and component library strategy. ADR-0004 (Components) defines the tier system and folder structure. ADR-0012 (Forms) defines form field primitives. However, no ADR currently defines the **minimum set of UI foundation primitives** every project must build before feature development begins, nor the patterns for typography, containers, and layout building blocks that sit between raw Tailwind utilities and full feature components.

Without this, every project starts feature work immediately and accumulates ad-hoc heading styles, inconsistent container widths, one-off button variants, and duplicated spacing patterns. AI agents in particular will generate inconsistent UI unless they have a defined primitive inventory to build with.

This ADR defines **what** the foundation primitives are, **how** they must be built, and the **order** in which to implement them.

## Decision

**Every project must implement a defined set of UI foundation primitives in `src/components/ui/` before feature development begins. These primitives enforce the design token system from ADR-0002 and provide the building blocks that all feature and layout components compose from.**

---

## Rules

| Rule                                                                                                     | Level      |
| -------------------------------------------------------------------------------------------------------- | ---------- |
| Implement all Required primitives before starting feature components                                     | **MUST**   |
| All primitives live in `src/components/ui/` (Tier 1 per ADR-0004)                                        | **MUST**   |
| All primitives use project tokens from `tailwind.config.ts` — no default Tailwind palette                | **MUST**   |
| All primitives use `cn()` for class merging and accept a `className` escape hatch                        | **MUST**   |
| All interactive primitives forward `ref` (ADR-0004 UI tier requirement)                                  | **MUST**   |
| All primitives are Server Components by default — add `'use client'` only when interactivity requires it | **MUST**   |
| Style variants use `class-variance-authority` (`cva`)                                                    | **SHOULD** |
| Each primitive has a barrel export (`index.ts`)                                                          | **MUST**   |
| Feature components MUST use these primitives — not raw HTML with ad-hoc Tailwind                         | **MUST**   |
| Do not pre-build Optional primitives — add them when a feature requires them                             | **SHOULD** |

**Note on ref forwarding:** ADR-0004 states UI-tier primitives MUST support `forwardRef`. This ADR scopes that requirement to **interactive** primitives (Button, Input, Select, etc.) where refs are needed for focus management, form libraries, and composition. Non-interactive layout primitives (Typography, Container, Stack, Separator) are explicitly exempt — they rarely need refs, and adding `forwardRef` to them adds complexity without practical benefit. If a project later needs a ref on a layout primitive, add it then.

---

## Primitive Inventory

### Required (Build Before Feature Development)

These are the minimum primitives every project needs. Without them, feature components will invent their own inconsistent patterns.

| Primitive      | Purpose                                        | Source                                   |
| -------------- | ---------------------------------------------- | ---------------------------------------- |
| **Button**     | All interactive actions                        | Custom with `cva`, or shadcn/ui restyled |
| **Typography** | Headings, body text, labels, captions          | Custom (project-specific scale)          |
| **Container**  | Page-width constraint with consistent padding  | Custom                                   |
| **Stack**      | Vertical/horizontal spacing rhythm             | Custom                                   |
| **Section**    | Page section wrapper with spacing & background | Custom (composes Container)              |
| **Badge**      | Status labels, tags, categories                | Custom with `cva`, or shadcn/ui restyled |
| **Separator**  | Visual dividers between content regions        | Custom or shadcn/ui restyled             |

### Recommended (Build When First Needed)

| Primitive                                    | Purpose                          | Source                       |
| -------------------------------------------- | -------------------------------- | ---------------------------- |
| Card (+ CardHeader, CardContent, CardFooter) | Content grouping surfaces        | Custom or shadcn/ui restyled |
| Input, Textarea, Select, Checkbox            | Form fields (see ADR-0012)       | Custom with `forwardRef`     |
| Label                                        | Form field labels                | Custom                       |
| Skeleton                                     | Loading placeholders             | Custom                       |
| Avatar                                       | User/entity images               | Custom or shadcn/ui restyled |
| Icon wrapper                                 | Consistent icon sizing and color | Custom around `lucide-react` |

### Optional (Build Only When Explicitly Needed)

| Primitive     | Purpose                  | Source                  |
| ------------- | ------------------------ | ----------------------- |
| Dialog/Modal  | Overlay content          | shadcn/ui (Radix-based) |
| Dropdown Menu | Action menus             | shadcn/ui (Radix-based) |
| Tooltip       | Contextual hints         | shadcn/ui (Radix-based) |
| Tabs          | Tabbed content switching | shadcn/ui (Radix-based) |
| Sheet/Drawer  | Slide-out panels         | shadcn/ui (Radix-based) |
| Toast         | Notifications            | `sonner` (pre-approved) |
| Accordion     | Collapsible content      | shadcn/ui (Radix-based) |

---

## Implementation Order

The primitives build on each other. Follow this sequence:

```
1. Typography         ← defines the text scale everything else uses
2. Button             ← most common interactive element
3. Container          ← page-width wrapper for all sections
4. Stack              ← spacing rhythm for composing layouts
5. Section            ← page section wrapper (composes Container)
6. Badge              ← lightweight, unlocks status/tag patterns
7. Separator          ← visual divider between sections
```

After these seven, form primitives (Input, Textarea, Select, Label) come next if the project has forms — see ADR-0012 for their exact specifications.

---

## Mockup-Driven Customization — CRITICAL

This ADR defines the **architecture** of each primitive (component API, prop types, composition pattern, folder structure) and the **minimum inventory** that every project must build. The **visual values** (font sizes, weights, tracking, colors, spacing, border-radius) come from the chosen design mockup — not from the code examples in this ADR.

### What the Mockup Drives

The mockup determines _how things look_, not _what gets built_:

1. **Visual values** — Extract font sizes, weights, colors, spacing, and border-radius from the mockup's CSS. The code examples below show structure, not prescriptive styles.
2. **Variant discovery** — Identify recurring visual patterns in the mockup and map them to primitive variants. If a text style (e.g., an eyebrow/label pattern) appears 3+ times across different sections, it becomes a Typography variant — not ad-hoc styles repeated in feature components.
3. **Additional variants** — If the mockup reveals button styles, badge colors, or typography patterns beyond the defaults in this ADR, add them. The variant lists below are starting points.
4. **Additional primitives from Recommended/Optional tiers** — If the mockup uses form fields, cards, or dialogs, build those primitives even though they are not in the Required tier.
5. **CSS custom property mapping** — Map the mockup's `:root { --color-*, --font-* }` values to `tailwind.config.ts` tokens and `globals.css`. The mockup palette replaces the placeholder tokens — no default Tailwind palette values survive.
6. **Code examples as templates** — The code examples in this ADR show component structure and API, not prescriptive visual values. Replace Tailwind classes with values from the mockup.
7. **Variant ambiguity rule** — A new Typography variant must differ from existing variants in at least 2 CSS properties (font-family, font-size, font-weight, letter-spacing, text-transform, line-height). If it only differs in one property, use `className` instead of a new variant.
8. **No arbitrary Tailwind values in primitives** — Add named tokens to `tailwind.config.ts` (e.g., `fontSize: { display: '2.75rem' }`, `maxWidth: { content: '87.5rem' }`) instead of using arbitrary values like `text-[2.75rem]` in component code.
9. **Typography color separation** — `variantStyles` defines structure only (size, weight, tracking, line-height, text-transform). Color comes from parent section context via CSS inheritance, or from `className` for specific cases (muted, accent). Never put `text-foreground/*` or color classes into `variantStyles`.

### What the Mockup Does NOT Drive

The agent builds **all 7 Required primitives unconditionally**, even if the current mockup only shows a subset. A mockup is a snapshot of one or two pages — the project will grow beyond it. The Required inventory exists because these primitives are universally needed, and skipping any of them creates debt when the next feature requires them.

The agent should also include **standard variant coverage** beyond what the mockup explicitly shows. If the mockup shows one button style, still build primary, outline, ghost, and danger variants — an experienced developer knows delete confirmations, secondary actions, and navigation links are coming. Use professional judgment to anticipate what the project will need.

### How to Read the Specifications Below

- **Component API** (props, types, polymorphic `as`, `forwardRef`) → follow exactly
- **Folder structure** (`ui/typography/Typography.tsx`, barrel exports) → follow exactly
- **Variant names** (`h1`, `h2`, `overline`, `primary`, `outline`) → use as starting points, add/remove based on what the mockup uses and what the project will need
- **Tailwind classes in code examples** (`text-4xl`, `font-bold`, `bg-primary-600`) → replace with values extracted from the mockup

---

## Primitive Specifications

### 1. Typography

Typography is the most impactful primitive. It maps semantic heading levels to a consistent visual scale and prevents ad-hoc `text-*` / `font-*` classes scattered across the codebase.

#### Approach: Component-Based

Use a polymorphic `Typography` component rather than utility-only classes. This enforces semantic HTML (correct heading hierarchy per ADR-0019) and keeps the visual scale in one place.

```
ui/typography/
  Typography.tsx
  index.ts
```

#### Design

```tsx
import { cn } from '@/lib/utils'

type TypographyVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'body-sm' | 'caption' | 'overline'

type TypographyProps<C extends React.ElementType = 'p'> = {
  /** Visual style variant */
  variant?: TypographyVariant
  /** HTML element to render — defaults to semantic mapping */
  as?: C
  children: React.ReactNode
  className?: string
} & Omit<React.ComponentProps<C>, 'as' | 'className' | 'children'>

const variantStyles: Record<TypographyVariant, string> = {
  h1: 'text-4xl font-bold tracking-tight lg:text-5xl',
  h2: 'text-3xl font-semibold tracking-tight',
  h3: 'text-2xl font-semibold',
  h4: 'text-xl font-semibold',
  body: 'text-base leading-relaxed',
  'body-sm': 'text-sm leading-relaxed',
  caption: 'text-xs',
  overline: 'text-xs font-semibold uppercase tracking-wider',
}

const defaultElementMap: Record<TypographyVariant, React.ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body: 'p',
  'body-sm': 'p',
  caption: 'span',
  overline: 'span',
}

export const Typography = <C extends React.ElementType = 'p'>({
  variant = 'body',
  as,
  children,
  className,
  ...props
}: TypographyProps<C>) => {
  const Component = as || defaultElementMap[variant]

  return (
    <Component className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </Component>
  )
}
```

**Color inheritance**: Typography variants define structure only — no color classes. Text color comes from the parent section via CSS inheritance (`color` on a `<section>` or wrapper), or from `className` for muted/accent text (e.g., `<Typography variant="caption" className="text-foreground/60">`).

#### Usage

```tsx
// ✅ Semantic heading with visual scale
<Typography variant="h1">Welcome to our platform</Typography>

// ✅ Visual h2 but rendered as h3 (when heading hierarchy requires it)
<Typography variant="h2" as="h3">Section title</Typography>

// ✅ Body text
<Typography variant="body">Lorem ipsum dolor sit amet.</Typography>

// ✅ Section label / category tag
<Typography variant="overline">Featured Products</Typography>

// ✅ Additional styles via className
<Typography variant="h1" className="text-center">Centered Heading</Typography>
```

#### Project Customization

The `variantStyles` object is the single source of truth for the typography scale. When implementing, **derive every value from the chosen mockup's CSS** — not from the template defaults above.

**Variant discovery process:**

1. Scan the mockup for every distinct text style (unique combination of font-family, font-size, font-weight, letter-spacing, text-transform, line-height, color).
2. Group identical or near-identical styles across sections — if a style repeats 3+ times, it is a variant.
3. Map each group to a variant name: `h1`–`h4` for headings, `body`/`body-sm` for paragraphs, `caption` for small metadata, `overline` for uppercase labels/eyebrows. Add custom variant names (e.g., `eyebrow`, `display`, `lead`, `detail-label`) when the mockup has patterns that don't fit the defaults.
4. For each variant, translate the mockup's CSS values into Tailwind utility classes, including responsive breakpoints.

**Adding custom variants:** When the mockup requires variants beyond the defaults, extend the `TypographyVariant` type and add corresponding entries to both `variantStyles` and `defaultElementMap`:

```tsx
// ⚠️ Extend the type when adding project-specific variants
type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'overline'
  | 'display' // ← added for hero headlines
  | 'lead' // ← added for intro paragraphs
  | 'eyebrow' // ← added for section labels

// ⚠️ Template defaults — REPLACE with values extracted from the chosen mockup
const variantStyles: Record<TypographyVariant, string> = {
  h1: 'text-4xl font-bold tracking-tight lg:text-5xl', // ← from mockup CSS
  h2: 'text-3xl font-semibold tracking-tight', // ← from mockup CSS
  // ... add/remove variants based on mockup analysis
  display: 'text-5xl font-extrabold tracking-tighter lg:text-7xl', // ← from mockup
  lead: 'text-lg leading-relaxed', // ← from mockup (color via className or inheritance)
  eyebrow: 'text-xs font-semibold uppercase tracking-wider', // ← from mockup (color via section context, not variant)
}

const defaultElementMap: Record<TypographyVariant, React.ElementType> = {
  // ... existing mappings ...
  display: 'h1',
  lead: 'p',
  eyebrow: 'span',
}
```

#### Rules

| Rule                                                                                                        | Level          |
| ----------------------------------------------------------------------------------------------------------- | -------------- |
| All headings (H1–H4) MUST use `Typography` — not raw `<h1 className="...">`                                 | **MUST**       |
| Heading hierarchy must not skip levels (h1 → h2 → h3, no h1 → h3) per ADR-0019                              | **MUST**       |
| Use `as` prop when visual variant differs from semantic level                                               | **SHOULD**     |
| Any text pattern recurring 3+ times across mockup sections MUST become a Typography variant                 | **MUST**       |
| Variant values MUST be derived from the chosen mockup's CSS — not from ADR template defaults                | **MUST**       |
| Add project-specific variant names (e.g., `'eyebrow'`, `'display'`, `'lead'`) when the mockup requires them | **SHOULD**     |
| Do not add more than 12 variants — if exceeded, split into separate components                              | **SHOULD NOT** |

---

### 2. Button

Button must support multiple visual variants, sizes, loading state, and disabled state. ADR-0002 already specifies the `cva` pattern; ADR-0004 requires `forwardRef`. For link-styled navigation, use the `link` variant or compose with Next.js `Link` via `className={buttonVariants({ variant, size })}`.

```
ui/button/
  Button.tsx
  index.ts
```

#### Design

```tsx
import { forwardRef } from 'react'

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles — shared by ALL variants
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
        secondary:
          'bg-secondary-100 text-secondary-900 hover:bg-secondary-200 active:bg-secondary-300',
        outline:
          'border border-primary-300 text-primary-700 hover:bg-primary-50 active:bg-primary-100',
        ghost: 'text-primary-700 hover:bg-primary-50 active:bg-primary-100',
        danger: 'bg-error-600 text-white hover:bg-error-700 active:bg-error-800',
        link: 'text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'size-10',
        inline: 'text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Show loading spinner and disable interaction */
    loading?: boolean
  }

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          className='inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent'
          aria-hidden='true'
        />
      )}
      {children}
    </button>
  ),
)

Button.displayName = 'Button'

export { Button, buttonVariants }
export type { ButtonProps }
```

#### Variants and Sizes

The variant and size tables below are the **standard inventory**. When implementing, include all variants that appear in the chosen mockup plus standard ones the project will predictably need (e.g., `danger` for delete actions, `ghost` for navigation). Additional variants (e.g., `success`, `warning`) are added when the design requires them.

| Variant     | Purpose                                     |
| ----------- | ------------------------------------------- |
| `primary`   | Primary CTA. Brand-colored background.      |
| `secondary` | Secondary action. Muted background.         |
| `outline`   | Tertiary action. Border only.               |
| `ghost`     | Navigation-like. No background until hover. |
| `danger`    | Destructive actions (delete, remove).       |
| `link`      | Text-only, looks like a link.               |

| Size     | Height    | Purpose                                                         |
| -------- | --------- | --------------------------------------------------------------- |
| `sm`     | `h-8`     | Compact contexts (tables, inline actions).                      |
| `md`     | `h-10`    | Default. Most buttons.                                          |
| `lg`     | `h-12`    | Hero CTAs, prominent actions.                                   |
| `icon`   | `size-10` | Icon-only buttons (must have `aria-label`).                     |
| `inline` | (none)    | Text-only CTAs, navigation links — content-sized, no box model. |

#### Rules

| Rule                                                                                         | Level      |
| -------------------------------------------------------------------------------------------- | ---------- |
| Button heights MUST match Input heights at each size (sm=h-8, md=h-10, lg=h-12) per ADR-0012 | **MUST**   |
| Icon-only buttons MUST have `aria-label`                                                     | **MUST**   |
| Loading state MUST disable the button and show `aria-busy`                                   | **MUST**   |
| Export `buttonVariants` so other components can reuse the class generator                    | **SHOULD** |

---

### 3. Container

Container constrains page content to a maximum width with consistent horizontal padding. Every page section uses it — without it, agents produce inconsistent max-widths and padding.

```
ui/container/
  Container.tsx
  index.ts
```

#### Design

```tsx
import { cn } from '@/lib/utils'

type ContainerProps = {
  /** Maximum width constraint */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Horizontal padding preset */
  padding?: 'none' | 'tight' | 'default' | 'wide'
  /** HTML element to render */
  as?: React.ElementType
  children: React.ReactNode
  className?: string
}

const sizeStyles: Record<NonNullable<ContainerProps['size']>, string> = {
  sm: 'max-w-3xl', // 768px — blog posts, legal text
  md: 'max-w-5xl', // 1024px — standard content
  lg: 'max-w-7xl', // 1280px — wide content, dashboards
  xl: 'max-w-screen-2xl', // 1536px — full-width layouts
  full: 'max-w-none', // no constraint
}

const paddingStyles: Record<NonNullable<ContainerProps['padding']>, string> = {
  none: '',
  tight: 'px-3 sm:px-4 lg:px-6',
  default: 'px-4 sm:px-6 lg:px-8',
  wide: 'px-6 sm:px-10 lg:px-16',
}

export const Container = ({
  size = 'lg',
  padding = 'default',
  as: Component = 'div',
  children,
  className,
}: ContainerProps) => (
  <Component className={cn('mx-auto w-full', paddingStyles[padding], sizeStyles[size], className)}>
    {children}
  </Component>
)
```

#### Usage

```tsx
// ✅ Page sections — prefer Section (composes Container internally)
<Section spacing="standard">
  <Typography variant="h2">Features</Typography>
</Section>

// ✅ Narrow content (blog, legal) — direct Container is fine
<Container size="sm">
  <article>{/* long-form content */}</article>
</Container>

// ✅ Inside fullBleed Section — manual Container for content constraint
<Section spacing="hero" fullBleed>
  <div className="relative">
    <img className="absolute inset-0 h-full w-full object-cover" src="..." alt="..." />
    <Container className="relative z-10">
      <Typography variant="h1" className="text-white">Hero</Typography>
    </Container>
  </div>
</Section>
```

#### Rules

| Rule                                                                                         | Level      |
| -------------------------------------------------------------------------------------------- | ---------- |
| Every page section MUST use `Container` — not ad-hoc `max-w-*` and `px-*` classes            | **MUST**   |
| Default size is `lg` (max-w-7xl) unless the design specifies otherwise                       | **SHOULD** |
| Padding is mobile-first: `px-4` → `sm:px-6` → `lg:px-8`                                      | **MUST**   |
| The size scale may be customized per project — update `sizeStyles` to match the design       | **MAY**    |
| `padding` prop controls horizontal padding — `'none'` for sections with custom padding needs | **SHOULD** |

---

### 4. Stack

Stack provides consistent spacing rhythm for vertical and horizontal layouts. It replaces ad-hoc `space-y-*` / `flex gap-*` patterns with a composable primitive.

```
ui/stack/
  Stack.tsx
  index.ts
```

#### Design

```tsx
import { cn } from '@/lib/utils'

type StackProps = {
  /** Layout direction */
  direction?: 'vertical' | 'horizontal'
  /** Spacing between children — maps to Tailwind gap scale */
  gap?: '0' | '1' | '2' | '3' | '4' | '6' | '8' | '10' | '12' | '16' | '20' | '24' | '32'
  /** Alignment on the cross axis */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  /** Alignment on the main axis */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
  /** Allow children to wrap to the next line (horizontal stacks) */
  wrap?: boolean
  /** HTML element to render */
  as?: React.ElementType
  children: React.ReactNode
  className?: string
}

const gapMap: Record<NonNullable<StackProps['gap']>, string> = {
  '0': 'gap-0',
  '1': 'gap-1',
  '2': 'gap-2',
  '3': 'gap-3',
  '4': 'gap-4',
  '6': 'gap-6',
  '8': 'gap-8',
  '10': 'gap-10',
  '12': 'gap-12',
  '16': 'gap-16',
  '20': 'gap-20',
  '24': 'gap-24',
  '32': 'gap-32',
}

const alignMap: Record<NonNullable<StackProps['align']>, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
}

const justifyMap: Record<NonNullable<StackProps['justify']>, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
}

export const Stack = ({
  direction = 'vertical',
  gap = '4',
  align,
  justify,
  wrap,
  as: Component = 'div',
  children,
  className,
}: StackProps) => (
  <Component
    className={cn(
      'flex',
      direction === 'vertical' ? 'flex-col' : 'flex-row',
      gapMap[gap],
      align && alignMap[align],
      justify && justifyMap[justify],
      wrap && 'flex-wrap',
      className,
    )}
  >
    {children}
  </Component>
)
```

#### Usage

```tsx
// ✅ Vertical stack (most common — form fields, sections)
<Stack gap="6">
  <Typography variant="h2">Contact Us</Typography>
  <Typography variant="body">We would love to hear from you.</Typography>
  <ContactForm />
</Stack>

// ✅ Horizontal stack with alignment
<Stack direction="horizontal" gap="4" align="center" justify="between">
  <Logo />
  <Navigation />
</Stack>

// ✅ Section spacing rhythm
<Stack gap="16" as="main">
  <HeroSection />
  <FeaturesSection />
  <TestimonialsSection />
  <CTASection />
</Stack>
```

#### Responsive Direction

A common pattern is vertical on mobile, horizontal on desktop (e.g., feature cards, nav items). Stack's `direction` prop is not responsive. Use `className` for responsive direction changes:

```tsx
// ✅ Vertical on mobile, horizontal on desktop
<Stack direction='vertical' gap='4' className='md:flex-row'>
  <Card />
  <Card />
  <Card />
</Stack>
```

The `className` override takes precedence because it's applied after the direction class via `cn()`.

#### Why Static Gap Map

The `gapMap` static lookup in the Design above is intentional. Dynamic class construction (`` `gap-${gap}` ``) breaks Tailwind's JIT purge — the classes won't be included in the production CSS. A static map ensures every gap class is statically visible to Tailwind's scanner. Do not replace it with string interpolation.

---

### 5. Section

Section is the standard page section wrapper. It composes `Container` internally and owns vertical spacing (padding) and background color. Without it, every page section invents its own `<section className="py-16"><Container>` nesting with inconsistent spacing and background handling.

```
ui/section/
  Section.tsx
  index.ts
```

#### Design

```tsx
import { cn } from '@/lib/utils'
import { Container } from '@/components/ui/container'

type SectionProps = {
  /** Vertical spacing rhythm */
  spacing?: 'none' | 'compact' | 'standard' | 'hero'
  /** Background color context */
  background?: 'default' | 'alt' | 'primary' | 'inverse'
  /** Forward to Container size — ignored when fullBleed is true */
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Forward to Container padding — ignored when fullBleed is true */
  containerPadding?: 'none' | 'tight' | 'default' | 'wide'
  /** When true, children are rendered without a Container wrapper (edge-to-edge) */
  fullBleed?: boolean
  /** HTML element to render */
  as?: React.ElementType
  children: React.ReactNode
  className?: string
}

// ⚠️ Template defaults — REPLACE with values extracted from the chosen mockup
const spacingMap: Record<NonNullable<SectionProps['spacing']>, string> = {
  none: '',
  compact: 'py-8 lg:py-12',
  standard: 'py-16 lg:py-24',
  hero: 'py-20 lg:py-32',
}

// ⚠️ Template defaults — REPLACE with values extracted from the chosen mockup
const backgroundMap: Record<NonNullable<SectionProps['background']>, string> = {
  default: '',
  alt: 'bg-secondary-50',
  primary: 'bg-primary-600 text-white',
  inverse: 'bg-primary-900 text-white',
}

export const Section = ({
  spacing = 'standard',
  background = 'default',
  containerSize,
  containerPadding,
  fullBleed = false,
  as: Component = 'section',
  children,
  className,
}: SectionProps) => (
  <Component className={cn(spacingMap[spacing], backgroundMap[background], className)}>
    {fullBleed ? (
      children
    ) : (
      <Container size={containerSize} padding={containerPadding}>
        {children}
      </Container>
    )}
  </Component>
)
```

#### Usage

```tsx
// ✅ Standard page section (most common)
<Section spacing="standard">
  <Stack gap="6">
    <Typography variant="h2">Features</Typography>
    {/* section content */}
  </Stack>
</Section>

// ✅ Hero section with wide padding
<Section spacing="hero" containerPadding="wide">
  <Stack gap="6" align="center">
    <Typography variant="h1">Welcome</Typography>
  </Stack>
</Section>

// ✅ Dark section with inverse background
<Section spacing="standard" background="inverse">
  <Typography variant="h2">Newsletter</Typography>
</Section>

// ✅ Full-bleed section (image background, custom Container inside)
<Section spacing="hero" fullBleed>
  <div className="relative">
    <img className="absolute inset-0 h-full w-full object-cover" src="..." alt="..." />
    <Container className="relative z-10">
      <Typography variant="h1" className="text-white">Hero</Typography>
    </Container>
  </div>
</Section>

// ✅ Compact CTA banner
<Section spacing="compact" background="primary">
  <Stack direction="horizontal" gap="4" align="center" justify="between">
    <Typography variant="body">Ready to start?</Typography>
    <Button variant="outline" className="border-white text-white">Get Started</Button>
  </Stack>
</Section>
```

#### Spacing and Background Props

| `spacing`  | Effect              | Use case                       |
| ---------- | ------------------- | ------------------------------ |
| `none`     | No vertical padding | Custom padding via `className` |
| `compact`  | `py-8 lg:py-12`     | CTA banners, footers           |
| `standard` | `py-16 lg:py-24`    | Most content sections          |
| `hero`     | `py-20 lg:py-32`    | Hero, major call-to-action     |

| `background` | Effect                       | Use case                   |
| ------------ | ---------------------------- | -------------------------- |
| `default`    | No background                | Standard content sections  |
| `alt`        | Subtle secondary background  | Alternating section rhythm |
| `primary`    | Brand-colored + white text   | CTA banners, highlights    |
| `inverse`    | Dark background + white text | Newsletters, dark sections |

#### Rules

| Rule                                                                                                | Level      |
| --------------------------------------------------------------------------------------------------- | ---------- |
| Every page section MUST use `Section` — not raw `<section>` + `<Container>` nesting                 | **MUST**   |
| `Section` MUST compose `Container` internally — never duplicate Container logic                     | **MUST**   |
| `spacing` and `background` values MUST be derived from the mockup — not from template defaults      | **MUST**   |
| Use `fullBleed` for edge-to-edge content (images, backgrounds) that manages its own Container       | **SHOULD** |
| Default spacing is `standard` and default background is `default` — most sections need no overrides | **SHOULD** |

---

### 6. Badge

Badge displays status labels, tags, and categories. Small but used everywhere — feature cards, user roles, status indicators.

```
ui/badge/
  Badge.tsx
  index.ts
```

#### Design

```tsx
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary-100 text-primary-800',
        secondary: 'bg-secondary-100 text-secondary-800',
        success: 'bg-success-100 text-success-700',
        warning: 'bg-warning-100 text-warning-700',
        error: 'bg-error-100 text-error-700',
        outline: 'border border-primary-300 text-primary-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>

export const Badge = ({ variant, className, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
)

export { badgeVariants }
export type { BadgeProps }
```

---

### 7. Separator

Separator is a visual divider. Simple but prevents ad-hoc `<hr>` or `border-b` styles with inconsistent colors.

```
ui/separator/
  Separator.tsx
  index.ts
```

#### Design

```tsx
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const separatorVariants = cva('shrink-0 border-none', {
  variants: {
    orientation: {
      horizontal: 'w-full',
      vertical: 'h-full',
    },
    thickness: {
      thin: '',
      medium: '',
      thick: '',
    },
    variant: {
      default: 'bg-secondary-200',
      muted: 'bg-secondary-100',
      primary: 'bg-primary-500',
      inverse: 'bg-white/20',
    },
  },
  compoundVariants: [
    { orientation: 'horizontal', thickness: 'thin', class: 'h-px' },
    { orientation: 'horizontal', thickness: 'medium', class: 'h-0.5' },
    { orientation: 'horizontal', thickness: 'thick', class: 'h-1' },
    { orientation: 'vertical', thickness: 'thin', class: 'w-px' },
    { orientation: 'vertical', thickness: 'medium', class: 'w-0.5' },
    { orientation: 'vertical', thickness: 'thick', class: 'w-1' },
  ],
  defaultVariants: {
    orientation: 'horizontal',
    thickness: 'thin',
    variant: 'default',
  },
})

type SeparatorProps = React.ComponentProps<'hr'> &
  VariantProps<typeof separatorVariants> & {
    decorative?: boolean
  }

export const Separator = ({
  orientation = 'horizontal',
  thickness,
  variant,
  decorative = true,
  className,
  ...props
}: SeparatorProps) => (
  <hr
    role={decorative ? 'none' : 'separator'}
    aria-orientation={!decorative ? orientation : undefined}
    className={cn(separatorVariants({ orientation, thickness, variant }), className)}
    {...props}
  />
)

export { separatorVariants }
```

---

## Section Spacing Rhythm

The `Section` primitive (§5 above) codifies the standard spacing rhythm. This section documents the rationale and usage patterns.

### Pattern: Section Wrapper

Feature components that represent a page section SHOULD use the `Section` primitive:

```tsx
// ✅ Consistent section pattern using Section primitive
<Section spacing='standard'>
  <Stack gap='12'>
    <Stack gap='4' className='max-w-2xl'>
      <Typography variant='overline'>Features</Typography>
      <Typography variant='h2'>Everything you need</Typography>
      <Typography variant='body' className='text-foreground/70'>
        Description text here.
      </Typography>
    </Stack>
    {/* Section content */}
  </Stack>
</Section>
```

### Standard Section Spacing

| Section type     | `spacing` prop | Vertical padding | Notes                      |
| ---------------- | -------------- | ---------------- | -------------------------- |
| Hero             | `hero`         | `py-20 lg:py-32` | Largest — first impression |
| Standard section | `standard`     | `py-16 lg:py-24` | Most sections              |
| Compact section  | `compact`      | `py-8 lg:py-12`  | CTAs, banners              |
| Footer           | `compact`      | `py-8 lg:py-12`  | Consistent footer rhythm   |

These are **defaults**. Projects customize the `spacingMap` values based on their design.

---

## Extending an Existing Primitive

Primitives are meant to grow with the project. When a feature needs a new prop or variant on an existing primitive, follow this process:

### Adding a New Prop

1. **Add to the props type** — extend the component's TypeScript type. Keep it optional with a sensible default so existing consumers are unaffected.
2. **Implement** — wire the prop into JSX/logic. Ensure the `className` escape hatch still works (always the last merge in `cn()`).
3. **Update the story file** — add a story demonstrating the new prop. If it's a variant, add an individual story and update the `AllVariants` render story.
4. **Update barrel exports** — if you added a new named export (e.g., a `cardVariants` function), re-export it from the primitive's `index.ts` and `src/components/ui/index.ts`.

### Adding a New Variant (cva-based components)

For `cva`-based components (Button, Badge, and any future variant-driven primitive):

1. Add the variant value to the `variants` object inside the `cva()` call.
2. Extend the TypeScript union if variants are typed explicitly (otherwise `VariantProps` handles it).
3. Add a named story for the new variant.
4. Update the `AllVariants` render story to include it.

### Rules

- **Never remove** an existing prop or variant without checking all consumers across the codebase.
- **Never change** the default value of an existing prop — it silently breaks existing usages.
- A new prop MUST NOT require changes in existing call sites. Make it optional or provide a default.

---

## Creating a New Primitive

The Required tier (7 primitives) is pre-built. As the project grows, you will need to create new primitives from the Recommended or Optional tiers.

### When to Create a Primitive

| Trigger                                                                                               | Action                                                                 |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Same Tailwind pattern (3+ classes) repeats in 3+ files                                                | Extract into a primitive                                               |
| A feature needs a Recommended-tier component (Card, Input, Skeleton, Avatar, Icon wrapper)            | Build it                                                               |
| A feature needs an Optional-tier component (Dialog, Dropdown, Tooltip, Tabs, Sheet, Toast, Accordion) | Prefer shadcn/ui (Radix-based), restyle to project tokens per ADR-0002 |
| A one-off visual element that won't repeat                                                            | Do NOT make it a primitive — keep it in the feature component          |

### Checklist

1. **Create the folder**: `src/components/ui/<name>/`
2. **Create the component**: `<Name>.tsx` following the Architecture Rules:
   - Server Component by default (`'use client'` only for interactivity)
   - `cn()` for class merging
   - `className` escape hatch prop
   - `cva` for variant-driven APIs
   - `forwardRef` if interactive (Button, Input, Select, etc.)
   - Project tokens only — no default Tailwind palette
3. **Create the barrel**: `index.ts` with named exports
4. **Update the root barrel**: `src/components/ui/index.ts` — re-export the new primitive
5. **Create the story file**: `<Name>.stories.tsx` co-located with the component:
   - `title: 'UI/<Name>'`
   - `tags: ['autodocs']`
   - One story per variant + `AllVariants` render story
   - State stories where applicable (disabled, loading, error)
6. **Verify**: `pnpm build` (lint + types) and `pnpm build-storybook` (stories compile)

### Example: Creating a Card Primitive

```
src/components/ui/card/
  Card.tsx           ← component (Card, CardHeader, CardContent, CardFooter)
  Card.stories.tsx   ← stories
  index.ts           ← barrel export
```

```tsx
// src/components/ui/index.ts — add to root barrel
export { Card, CardHeader, CardContent, CardFooter } from './card'
```

---

## Folder Structure (Complete)

After implementing all Required primitives:

```
src/components/ui/
  typography/
    Typography.tsx
    Typography.stories.tsx
    index.ts
  button/
    Button.tsx
    Button.stories.tsx
    index.ts
  container/
    Container.tsx
    Container.stories.tsx
    index.ts
  stack/
    Stack.tsx
    Stack.stories.tsx
    index.ts
  section/
    Section.tsx
    Section.stories.tsx
    index.ts
  badge/
    Badge.tsx
    Badge.stories.tsx
    index.ts
  separator/
    Separator.tsx
    Separator.stories.tsx
    index.ts
  index.ts              ← barrel re-exports all primitives
```

### Root Barrel Export

```tsx
// src/components/ui/index.ts
export { Typography } from './typography'
export { Button, buttonVariants } from './button'
export type { ButtonProps } from './button'
export { Container } from './container'
export { Stack } from './stack'
export { Section } from './section'
export { Badge, badgeVariants } from './badge'
export type { BadgeProps } from './badge'
export { Separator, separatorVariants } from './separator'
```

---

## Relationship to shadcn/ui

shadcn/ui provides many of these primitives. The relationship is:

| Primitive                       | Build Custom or Use shadcn/ui? | Why                                                                                  |
| ------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| Typography                      | **Custom**                     | shadcn/ui doesn't provide a typography component — every project needs its own scale |
| Button                          | **Either**                     | shadcn/ui's Button is excellent; restyle to project tokens per ADR-0002              |
| Container                       | **Custom**                     | shadcn/ui doesn't provide this                                                       |
| Stack                           | **Custom**                     | shadcn/ui doesn't provide this                                                       |
| Badge                           | **Either**                     | shadcn/ui's Badge works; restyle to project tokens                                   |
| Separator                       | **Either**                     | shadcn/ui's Separator works; restyle colors                                          |
| Card                            | **shadcn/ui preferred**        | Good compound component pattern                                                      |
| Dialog, Dropdown, Tooltip, etc. | **shadcn/ui preferred**        | Radix-based, accessible out of the box                                               |

**When using shadcn/ui:** Always run through the restyling checklist from ADR-0002 after adding a component. The component must use project tokens, not shadcn/ui defaults.

---

## Rationale

### Why Define This Inventory

1. **Consistency** — Without a defined set, every feature invents its own heading sizes, container widths, and button styles. The foundation eliminates this class of inconsistency.
2. **AI agent guidance** — Agents presented with a blank `components/ui/` folder will generate ad-hoc components per feature. An inventory tells them "build these first, then compose features from them."
3. **Speed** — Once primitives exist, feature development is assembly, not creation. A new page section composes `Section` + `Typography` + `Stack` + feature-specific content.
4. **Design system enforcement** — The primitives are where design tokens become visible UI. If the tokens are defined but no components use them, the tokens are documentation fiction.

### Why These Seven

- **Typography** — every page has text. It's the most-used primitive.
- **Button** — every page has actions. It's the most-used interactive primitive.
- **Container** — every page needs width constraints. Without it, content bleeds to viewport edges or has inconsistent padding.
- **Stack** — flex layouts with gaps are the most common layout pattern in modern CSS. Codifying it prevents `space-y-*` vs `gap-*` inconsistencies.
- **Section** — every page has sections. Without it, every section invents its own `<section>` + `<Container>` nesting with inconsistent spacing and backgrounds.
- **Badge** — lightweight but universal. Status indicators, tags, and labels appear in almost every domain.
- **Separator** — small but frequently ad-hoc. One primitive prevents seven different divider implementations.

### Why Not More

The inventory is deliberately minimal. Form primitives are covered by ADR-0012. Section is included because raw `<section>` + `<Container>` nesting was the most common source of inconsistent spacing across pages — it earns its place. Complex interactive primitives (Dialog, Dropdown, Tabs) are covered by shadcn/ui and only added when needed (ADR-0002 opt-in philosophy). Adding primitives that aren't immediately needed creates dead code and slows initial setup.

## Options Considered

| Option                                                      | Description                                          | Why Chosen / Why Not                                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Defined inventory (7 Required, Recommended, Optional tiers) | Explicit minimum set with clear implementation order | ✅ Chosen: predictable, minimal, composable, AI-friendly                                              |
| No inventory (build as needed)                              | Let feature development drive primitive creation     | ❌ Produces inconsistent, duplicated primitives across features                                       |
| Full design system upfront (20+ primitives)                 | Build everything before any feature work             | ❌ Over-engineering for unknown requirements; many primitives become dead code                        |
| Utility-only (no components)                                | Use raw Tailwind classes everywhere                  | ❌ No enforcement of consistency; repeated class strings across files; heading hierarchy not enforced |

---

## Consequences

**Positive:**

- Every project starts with a consistent, tested UI foundation before feature development begins.
- Feature components compose from primitives rather than reinventing styles.
- Typography component enforces semantic heading hierarchy (ADR-0019 compliance).
- Container component enforces consistent page widths and responsive padding.
- AI agents have an explicit list of primitives to build and consume — no guesswork.
- Button/Input size parity (ADR-0012 alignment) is enforced at the primitive level.

**Negative:**

- Adds ~1 hour of setup before feature development — mitigated by the hours saved from not debugging inconsistent styles later.
- Typography scale may need revision as the design evolves — mitigated by the `variantStyles` single source of truth (one object to update).
- Stack’s gap classes use a static map to work around Tailwind’s JIT purge — this adds a small maintenance burden when gap values change, but ensures production CSS correctness.
- Projects that already use shadcn/ui may have overlapping Button/Badge primitives — mitigated by the "either" guidance that explicitly supports using shadcn/ui restyled versions.
- This ADR’s Button uses `forwardRef` which is correct for React 18. React 19 deprecates `forwardRef` in favor of `ref` as a regular prop — when the project upgrades React, refactor Button (and form primitives from ADR-0012) accordingly.

## Related ADRs

- [ADR-0002](./0002-styling.md) — Styling (design tokens, shadcn/ui strategy, restyling checklist)
- [ADR-0004](./0004-components.md) — Components (tier system, `ui/` folder, forwardRef, composition patterns)
- [ADR-0012](./0012-forms.md) — Forms (form field primitives, Input/Textarea/Select specifications)
- [ADR-0019](./0019-accessibility.md) — Accessibility (semantic HTML, heading hierarchy, WCAG 2.1 AA)
- [ADR-0022](./0022-typescript-javascript-patterns.md) — TypeScript patterns (type aliases, generics)
