---
description: 'Single source of truth for all ESLint-enforced rules. Covers auto-fix, function style, import ordering, type imports, duplicate/circular imports, unused imports, named exports, console/debugger, explicit any, variables, JSX, and Tailwind class constraints.'
applyTo: '**/*.ts, **/*.tsx'
---

# TypeScript Conventions

> Every rule below corresponds to an ESLint rule in `.eslintrc.json`. This file is the only place ESLint rules are documented — no other instruction file duplicates them.

## ESLint Auto-Fix — CRITICAL

After writing or editing any `.ts` or `.tsx` file, IMMEDIATELY run:

```bash
pnpm eslint --fix <file-path>
```

This auto-fixes: import order, type import syntax, unused imports, self-closing components, Tailwind class order, curly brace cleanup, and const enforcement. Do NOT manually fix these — the linter handles them. Run after EVERY file write, not at the end of a phase.

If the file has errors that survive auto-fix (e.g., circular imports, contradicting Tailwind classes, explicit `any`), fix those manually before proceeding.

## Function Style

Always use **arrow function expressions** — never function declarations.

```ts
// ✅ Correct
const handleClick = () => { ... }
export const MyComponent = ({ title }: Props) => ( ... )

// ❌ Wrong — function declaration
function handleClick() { ... }
export default function MyComponent({ title }: Props) { ... }
```

**Generic components in `.tsx`**: bare `<T>` parses as JSX. Use `extends` constraint:

```tsx
export const Stack = <T extends React.ElementType = 'div'>({
  as,
  ...props
}: StackProps<T>) => { ... }
```

## Import Order

Groups must appear in this order with a **blank line between each group**. Alphabetize within each group.

```tsx
// 1. react
import { useRef, useState } from 'react'

// 2. next/*
import Image from 'next/image'
import Link from 'next/link'

// 3. external packages (alphabetized)
import { clsx } from 'clsx'
import useEmblaCarousel from 'embla-carousel-react'

// 4. @/* and @contracts/* internal aliases (same group)
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { type HeroContent } from '@/dictionaries/landing-page'

// 5. parent paths (../)
import { helperFn } from '../utils'

// 6. sibling paths (./)
import { SiblingComponent } from './Sibling'

// 7. type-only imports (last group)
import { type MyProps } from './types'
```

Group order:

1. **react** — always first
2. **next/\*** — Next.js imports, directly after react
3. **External packages** — anything from `node_modules` not covered above
4. **Internal aliases** — `@/*` and `@contracts/*` paths (same blank-line group)
5. **Parent** — relative `../` paths
6. **Sibling** — relative `./` paths
7. **Type-only** — pure type imports as the final group

**Common mistakes** (every one of these causes a lint error):

- Mixing `@/*` imports with external packages in the same group (missing blank line between groups 3 and 4)
- Putting `next/*` after other external packages (must be group 2, before other externals)
- Missing blank line between ANY two adjacent groups
- Non-alphabetical order within a group (e.g., `cn` import before `Button` import)

The linter auto-fixes order and blank lines via `eslint --fix`, but generating correct order first avoids churn.

## Type Imports

Use **inline** `type` keyword — not top-level `import type`.

```ts
// ✅ Correct
import { type FC, useState } from 'react'
import { type VariantProps } from 'class-variance-authority'

// ❌ Wrong
import type { FC } from 'react'
```

## Type Import Side Effects

Never use a bare `import type` that could trigger side effects. The inline `type` keyword rule above already prevents this — following it means this rule is satisfied automatically.

## No Duplicate Imports

Never import from the same module twice. Combine into a single import statement.

```ts
// ✅ Correct
import { useState, type FC } from 'react'

// ❌ Wrong — duplicate import source
import { useState } from 'react'
import { type FC } from 'react'
```

## Circular Imports

No circular import chains. If module A imports from B, B must NOT import from A. The linter catches direct A↔B cycles. Deeper chains are also bad practice — restructure shared logic into a third module if needed.

## Unused Imports & Variables

Never import something unused. Prefix intentionally unused variables with `_` (e.g., `_event`).

## Named Exports

All reusable components and modules MUST use **named exports**. `export default` only for Next.js special files (e.g., `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`).

## Console

Only `console.warn` and `console.error` are allowed. Never use `console.log`.

## Debugger

Never use `debugger` statements.

## Explicit Any

Avoid `any` — use proper types. If truly unavoidable, add a justifying comment.

## Variables

Always `const`. Use `let` only when reassignment is required. Never `var`.

## React JSX

- No unnecessary curly braces: `prop="value"` not `prop={"value"}`, `>text<` not `>{"text"}<`.
- Self-close empty elements: `<Component />` not `<Component></Component>`, `<img />` not `<img></img>`.

## Tailwind Classes

- Never combine contradicting utilities (e.g., `flex block`, `hidden visible`, and similar patterns).
- Use `cn()` for conditional class merging.

## Tailwind Class Order

Tailwind classes should follow the canonical order (layout → sizing → spacing → typography → visual → state). The linter auto-fixes this — run lint fix after writing.

## Tailwind Custom Classnames

Avoid custom classnames not recognized by Tailwind. Use project tokens and utility classes only. If a custom class is genuinely needed (e.g., from a third-party library), the warning can be suppressed per-line.
