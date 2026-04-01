---
name: styling-restyling
description: >-
  shadcn/ui restyling checklist, compatible vs forbidden libraries, className override
  depth rules, variant props over deep selectors. Use when adding a shadcn/ui component,
  restyling library output, choosing compatible UI libraries, or resolving className
  override issues.
---

# Styling — Component Restyling Patterns

**Compiled from**: ADR-0002 §Component Library Strategy, §Restyling Checklist, §className Override Depth
**Last synced**: 2026-03-11

---

> When adding components from shadcn/ui or any headless library, they MUST be restyled to use project tokens. This file covers the restyling workflow, compatible libraries, and className override patterns.

## Restyling Checklist

After adding any library component to `src/components/ui/`:

1. **Colors** — replace default palette with project tokens (`primary-*`, `secondary-*`, `error-*`).
2. **Border radius** — match project standard (check `tailwind.config.ts` for custom radii).
3. **Focus ring** — replace with `focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2`.
4. **Font sizes** — verify against project typography scale.
5. **Spacing** — verify against project spacing scale.
6. **States** — test hover, active, focus, disabled against design.
7. **Dark mode** — verify `dark:` prefixed classes if applicable.
8. **Barrel export** — re-export from `src/components/ui/index.ts`.

---

## Compatible Libraries

| Library             | Status         | Why                                                        |
| ------------------- | -------------- | ---------------------------------------------------------- |
| shadcn/ui           | ✅ Recommended | Copy-paste, Tailwind-native, Radix-based, you own the code |
| Radix UI Primitives | ✅ Compatible  | Unstyled headless — you add all Tailwind styles            |
| Headless UI         | ✅ Compatible  | Unstyled headless — you add all Tailwind styles            |
| Ark UI              | ✅ Compatible  | Unstyled headless — you add all Tailwind styles            |
| MUI (Material UI)   | ❌ Forbidden   | Own CSS-in-JS runtime, conflicts with RSC and Tailwind     |
| Chakra UI           | ❌ Forbidden   | Own CSS-in-JS runtime, same conflicts                      |
| Ant Design          | ❌ Forbidden   | Own styling system, massive bundle                         |
| Mantine             | ❌ Forbidden   | Own CSS-in-JS, same conflicts                              |

**Rule**: Only unstyled/headless or Tailwind-native libraries allowed. Any library with its own CSS runtime is forbidden.

---

## shadcn/ui Setup

```bash
pnpm dlx shadcn-ui@latest init
pnpm dlx shadcn-ui@latest add <component>  # e.g. dialog, dropdown-menu
```

After adding, immediately run through the restyling checklist above.

### Example: Restyling a cva Component

```tsx
// ❌ shadcn/ui defaults — generic look
const buttonVariants = cva('...', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90', // shadcn tokens
    },
  },
})

// ✅ Restyled to project tokens
const buttonVariants = cva('...', {
  variants: {
    variant: {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
      secondary: 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200',
      outline: 'border border-primary-300 text-primary-700 hover:bg-primary-50',
      ghost: 'text-primary-700 hover:bg-primary-50',
      danger: 'bg-error-600 text-white hover:bg-error-700',
    },
  },
})
```

---

## className Override Depth

When a component needs different styles in different contexts, prefer **variant props** over deep `className` selectors.

```tsx
// ❌ Fragile — targets internal DOM structure
<SectionLabel className="[&>span:first-child]:bg-white [&>span]:text-white">
  CONTACT
</SectionLabel>

// ✅ Robust — variant prop encapsulates the change
<SectionLabel variant="dark">
  CONTACT
</SectionLabel>
```

**Rules:**

- Add a variant prop when the same className override is needed 2+ times.
- Arbitrary selectors (`[&>span]`, `[&>div:first-child]`) SHOULD be avoided — use variant props.
- If a one-off override is truly needed, prefer shallow selectors over deep ones.

---

## Foundation Primitives Are Pre-Built

The primitives listed in `src/components/ui/catalog.json` are already pre-built. **Do not rebuild them.** Customize their visual values from the mockup.

shadcn/ui is for components **beyond** the foundation set: Card, Dialog, Dropdown, Tooltip, Tabs, Sheet, Toast, Accordion.
