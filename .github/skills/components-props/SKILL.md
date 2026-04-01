---
name: components-props
description: >-
  Component props typing, composition patterns (children, compound, slot), polymorphic
  as prop, generic components, ref forwarding, barrel export rules. Use when writing
  component props types, choosing a composition pattern, or setting up exports.
---

# Components — Props & Composition Patterns

**Compiled from**: ADR-0004 §Props Patterns, §Composition Patterns, §Export Rules
**Last synced**: 2026-03-13

> This skill covers props and composition. Server/client boundary patterns are covered in a separate skill.

---

## Props Typing

### Basic Props — Type Alias (not interface)

```tsx
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

### Extending Native HTML Elements

```tsx
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

### Ref Forwarding (Required for UI Tier)

UI primitives MUST support `ref` so they integrate with form libraries and focus management:

```tsx
import { forwardRef } from 'react'

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

### Children (Default Pattern)

```tsx
export const Card = ({ children, className }: CardProps) => (
  <div className={cn('rounded-lg border p-6', className)}>{children}</div>
)

<Card>
  <h2>Title</h2>
  <p>Description</p>
</Card>
```

### Compound Components (For Related Components)

```tsx
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

### Slot Pattern (Named Insertion Points)

```tsx
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
        {description && <p>{description}</p>}
      </div>
      {actions && <div className='flex gap-2'>{actions}</div>}
    </div>
  </header>
)
```

---

## Export Rules

| Rule                                                                                                            | Level        |
| --------------------------------------------------------------------------------------------------------------- | ------------ |
| `export default function` for Next.js special files only (`page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`) | **MUST**     |
| Named exports for all reusable components                                                                       | **MUST**     |
| Barrel `index.ts` at component folder root (public API only)                                                    | **MUST**     |
| Import from barrel, not internal files                                                                          | **MUST**     |
| Do NOT re-export private sub-components                                                                         | **MUST NOT** |

```tsx
// ✅ components/ui/card/index.ts — public API
export { Card, CardHeader, CardContent, CardFooter } from './Card'

// ✅ Consumer imports from barrel
import { Card, CardHeader } from '@/components/ui/card'

// ❌ Never import internal files directly
import { Card } from '@/components/ui/card/Card'
```
