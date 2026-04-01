---
description: 'Storybook conventions — file location, meta config, title tiers, variant coverage, and story update triggers.'
applyTo: '**/*.stories.tsx'
---

# Storybook Conventions

> Source: ADR-0002 §Storybook. Storybook is included by default in this starter.

## File Location

- Co-locate stories next to the component: `Button.stories.tsx` beside `Button.tsx`.
- Use relative imports from the same directory — not `@/components/ui` barrel.

## Meta Configuration

```tsx
import { ComponentName } from './ComponentName'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof ComponentName> = {
  title: 'Tier/ComponentName', // See title convention below
  component: ComponentName,
  tags: ['autodocs'], // Always include — generates props docs
  argTypes: {
    /* ... */
  },
}
export default meta
type Story = StoryObj<typeof ComponentName>
```

## Title Convention

Title MUST match the component's tier:

- **UI primitives**: `UI/Button`, `UI/Typography`, `UI/Container`
- **Feature components**: `Features/<feature>/ComponentName` (e.g., `Features/Landing/Hero`)
- **Layout components**: `Layout/Header`, `Layout/Footer`

## Required Coverage

- **One story per variant** — named after the variant value (`Primary`, `Secondary`, `Outline`).
- **`AllVariants` story** — render story showing all variants side by side.
- **State stories** where applicable: `Loading`, `Disabled`, `Error`.
- **Size stories** if the component has a `size` prop: `AllSizes` render story.

## Rules

- Always add `tags: ['autodocs']`.
- Use `argTypes` with `control: 'select'` for variant/size props.
- Use `control: 'boolean'` for boolean props like `loading`, `disabled`, `wrap`.
- Keep story files focused — no business logic, mock data lives in the story file or a co-located fixture.

## When to Create or Update Stories

- **New primitive** → create `<Name>.stories.tsx` alongside the component (see skill `ui-primitives-authoring`).
- **New prop or variant on existing primitive** → update the existing story file: add individual story + update `AllVariants`/`AllSizes` render stories.
- **Bug fix or style change** → verify existing stories still render correctly.
