# ADR-0012: Forms

**Status**: Accepted
**Date**: 2026-02-27
**Supersedes**: N/A

---

## Context

Forms are the primary user interaction pattern in web applications. Every project — marketing sites (contact forms, newsletter signups), SaaS platforms (settings, profile editors, data entry), CMS panels (content creation, media uploads) — has forms. The form strategy must cover validation (client + server), submission (Server Actions), error display (field-level + form-level), loading states, accessibility, and visual styling. It must also account for different complexity levels — a 2-field contact form and a 20-field multi-step onboarding wizard need different tools.

This ADR defines a **tiered approach**: simple forms use native HTML + Server Actions (zero dependencies), complex forms add React Hook Form (best-in-class DX). The constant across all tiers: **Server Actions validate with Zod and return `Result<T>`. Always.**

## Decision

**Tiered form strategy. Native `<form>` + `useActionState` for simple forms. React Hook Form + Zod resolver for medium/complex forms. Server Actions handle all mutations. Form UI primitives are standardized in `src/components/ui/` with consistent styling for all states.**

---

## When to Use Which Tier

| Complexity | Fields | Features Needed | Approach | Dependencies |
|-----------|--------|----------------|----------|-------------|
| **Simple** | 1-5 | Submit, basic validation, server errors | Native `<form>` + Server Action + `useActionState` | None |
| **Medium** | 5-15 | Field-level validation, as-you-type feedback, multiple field types | React Hook Form + Zod resolver + Server Action | `react-hook-form`, `@hookform/resolvers` |
| **Complex** | 15+ or dynamic | Multi-step, dynamic fields, field arrays, conditional logic, drafts | React Hook Form + Zod resolver + Server Action | Same as medium |

### Decision Flowchart

```
Is it a simple form (≤5 fields, no dynamic content, no as-you-type validation)?
  → YES: Use native <form> + useActionState + Server Action
  → NO ↓

Does it need field-level validation, as-you-type feedback, or dynamic fields?
  → YES: Use React Hook Form + Zod resolver + Server Action
  → NO: Use native <form> + useActionState + Server Action
```

---

## Rules

### General

| Rule | Level |
|------|-------|
| All form submissions go through Server Actions — never call APIs directly from forms | **MUST** |
| Server Actions validate with Zod and return `Result<T>` — never throw | **MUST** |
| Display field-level errors next to the field, connected via `aria-describedby` | **MUST** |
| Display form-level errors (server errors, network failures) above the form or in a toast | **MUST** |
| Show loading/submitting state on the submit button — disable to prevent double-submit | **MUST** |
| Use native HTML validation attributes (`required`, `type="email"`, `min`, `max`) as first line | **SHOULD** |
| Use form UI primitives from `src/components/ui/` — don't create one-off field styles | **MUST** |
| Define Zod schemas in `contracts/` or co-located `_validation/` — share between client and server | **MUST** |
| Reset form on success OR redirect — don't leave stale data | **SHOULD** |
| Disable autocomplete only when security requires it (password managers need `autocomplete`) | **MUST NOT** disable by default |

### Styling

| Rule | Level |
|------|-------|
| Use design tokens from `tailwind.config.ts` — no hardcoded colors (ADR-0002) | **MUST** |
| Error state: `border-error-500` + `text-error-600` error message below field | **MUST** |
| Focus state: `focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2` | **MUST** |
| Disabled state: `opacity-50 cursor-not-allowed` | **MUST** |
| Labels above fields, connected via `htmlFor` or wrapping `<label>` | **MUST** |
| Use `cn()` for conditional error/focus classes | **SHOULD** |
| Consistent field height: `h-10` (md) / `h-8` (sm) / `h-12` (lg) — matching Button sizes | **SHOULD** |
| Consistent spacing: `space-y-4` for field groups, `space-y-1.5` for label-to-input | **SHOULD** |

### Accessibility

| Rule | Level |
|------|-------|
| Every input has a visible `<label>` (not placeholder-only) | **MUST** |
| Error messages connected via `aria-describedby` | **MUST** |
| Invalid fields have `aria-invalid="true"` | **MUST** |
| Required fields have `aria-required="true"` or HTML `required` | **MUST** |
| Form-level errors use `role="alert"` for screen reader announcement | **MUST** |
| Submit button shows loading state to screen readers (`aria-busy` or text change) | **SHOULD** |
| Tab order follows visual order (no `tabIndex` hacks) | **MUST** |
| Error summary links to the first error field on complex forms | **SHOULD** |

---

## Installation (When React Hook Form Is Needed)

```bash
pnpm add react-hook-form @hookform/resolvers
```

---

## Form UI Primitives

Every form field in the project uses these standardized primitives. They enforce consistent styling, error display, focus rings, and accessibility across all forms.

### Input

```tsx
// src/components/ui/input/Input.tsx
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

type InputProps = React.ComponentProps<'input'> & {
  label: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const fieldId = id || props.name
    const errorId = error ? `${fieldId}-error` : undefined
    const hintId = hint ? `${fieldId}-hint` : undefined
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

    return (
      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="ml-0.5 text-error-500" aria-hidden="true">*</span>}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={cn(
            'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors',
            'placeholder:text-foreground/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-error-500 focus-visible:ring-error-500'
              : 'border-primary-200 hover:border-primary-300',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          aria-required={props.required}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-foreground/60">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-sm text-error-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
```

### Textarea

```tsx
// src/components/ui/textarea/Textarea.tsx
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

type TextareaProps = React.ComponentProps<'textarea'> & {
  label: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const fieldId = id || props.name
    const errorId = error ? `${fieldId}-error` : undefined
    const hintId = hint ? `${fieldId}-hint` : undefined
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

    return (
      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="ml-0.5 text-error-500" aria-hidden="true">*</span>}
        </label>
        <textarea
          ref={ref}
          id={fieldId}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors',
            'placeholder:text-foreground/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-error-500 focus-visible:ring-error-500'
              : 'border-primary-200 hover:border-primary-300',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          aria-required={props.required}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-foreground/60">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-sm text-error-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
```

### Select

```tsx
// src/components/ui/select/Select.tsx
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

type SelectOption = {
  value: string
  label: string
}

type SelectProps = Omit<React.ComponentProps<'select'>, 'children'> & {
  label: string
  options: SelectOption[]
  placeholder?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, error, className, id, ...props }, ref) => {
    const fieldId = id || props.name
    const errorId = error ? `${fieldId}-error` : undefined

    return (
      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="ml-0.5 text-error-500" aria-hidden="true">*</span>}
        </label>
        <select
          ref={ref}
          id={fieldId}
          className={cn(
            'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-error-500 focus-visible:ring-error-500'
              : 'border-primary-200 hover:border-primary-300',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={errorId}
          aria-required={props.required}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="text-sm text-error-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Select.displayName = 'Select'
```

### Checkbox

```tsx
// src/components/ui/checkbox/Checkbox.tsx
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

type CheckboxProps = Omit<React.ComponentProps<'input'>, 'type'> & {
  label: string
  error?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const fieldId = id || props.name
    const errorId = error ? `${fieldId}-error` : undefined

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            type="checkbox"
            id={fieldId}
            className={cn(
              'h-4 w-4 rounded border-primary-300 text-primary-600',
              'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={errorId}
            {...props}
          />
          <label htmlFor={fieldId} className="text-sm text-foreground">
            {label}
          </label>
        </div>
        {error && (
          <p id={errorId} className="text-sm text-error-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Checkbox.displayName = 'Checkbox'
```

### FormMessage (Form-Level Errors and Success)

```tsx
// src/components/ui/form-message/FormMessage.tsx
import { cn } from '@/lib/utils'

type FormMessageProps = {
  type: 'error' | 'success'
  message: string
  className?: string
}

export const FormMessage = ({ type, message, className }: FormMessageProps) => (
  <div
    role="alert"
    className={cn(
      'rounded-md px-4 py-3 text-sm',
      type === 'error' && 'bg-error-50 text-error-700 border border-error-200',
      type === 'success' && 'bg-success-50 text-success-700 border border-success-200',
      className,
    )}
  >
    {message}
  </div>
)
```

---

## Shared Validation Schemas

Zod schemas are defined once and shared between client validation (React Hook Form) and server validation (Server Actions). This guarantees the same rules apply in both places.

```typescript
// contracts/contact.ts
import { z } from 'zod'

export const ContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message is too long'),
})

export type ContactInput = z.infer<typeof ContactSchema>
```

```typescript
// contracts/post.ts
import { z } from 'zod'

export const PostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  content: z.string().min(1, 'Content is required'),
  published: z.boolean().default(false),
  categoryId: z.string().optional(),
})

export type PostInput = z.infer<typeof PostSchema>
```

---

## Tier 1: Simple Forms (Native + Server Action)

For forms with ≤5 fields that don't need as-you-type validation. Zero dependencies.

### Server Action

```typescript
// src/app/(marketing)/contact/_actions/submitContact.ts
'use server'

import { ContactSchema } from '@contracts/contact'
import type { ServerActionResult } from '@contracts/common'

type ContactResult = { id: string }

export const submitContact = async (
  _prevState: Awaited<ServerActionResult<ContactResult>> | null,
  formData: FormData,
): ServerActionResult<ContactResult> => {
  // 1. Parse and validate
  const parsed = ContactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please fix the errors below.',
        details: parsed.error.errors.map((e) => ({
          path: e.path,
          message: e.message,
        })),
      },
    }
  }

  // 2. Process (send email, save to DB, etc.)
  try {
    // await sendEmail(parsed.data)
    // or: await db.contact.create({ data: parsed.data })
    return { ok: true, value: { id: 'new-1' } }
  } catch {
    return {
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send message. Please try again.' },
    }
  }
}
```

### Form Component

```tsx
// src/app/(marketing)/contact/_components/ContactForm.tsx
'use client'

import { useActionState } from 'react'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormMessage } from '@/components/ui/form-message'
import { Button } from '@/components/ui/button'

import { submitContact } from '../_actions/submitContact'

/** Extract field error from Result's details array */
const fieldError = (
  state: Awaited<ReturnType<typeof submitContact>> | null,
  field: string,
): string | undefined =>
  state && !state.ok
    ? state.error.details?.find((d) => d.path[0] === field)?.message
    : undefined

export const ContactForm = () => {
  const [state, formAction, isPending] = useActionState(submitContact, null)

  // Show success message after submission
  if (state?.ok) {
    return <FormMessage type="success" message="Thank you! We'll be in touch." />
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Form-level error */}
      {state && !state.ok && state.error.code !== 'VALIDATION_ERROR' && (
        <FormMessage type="error" message={state.error.message} />
      )}

      <Input
        name="name"
        label="Name"
        required
        error={fieldError(state, 'name')}
      />

      <Input
        name="email"
        label="Email"
        type="email"
        required
        error={fieldError(state, 'email')}
      />

      <Textarea
        name="message"
        label="Message"
        required
        rows={5}
        error={fieldError(state, 'message')}
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  )
}
```

### Page

```tsx
// src/app/(marketing)/contact/page.tsx
import { ContactForm } from './_components/ContactForm'

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-lg py-12">
      <h1 className="mb-8 text-3xl font-bold">Contact Us</h1>
      <ContactForm />
    </div>
  )
}
```

### What Progressive Enhancement Gives You

With the native `<form action={...}>` pattern, the form **works even if JavaScript fails to load**:
- Browser submits the form as a POST request
- Server Action processes it
- Page re-renders with the result

This matters for marketing sites, SEO landing pages, and accessibility. It doesn't matter for SaaS dashboards where JS is guaranteed.

---

## Tier 2: Medium/Complex Forms (React Hook Form)

For forms with >5 fields, as-you-type validation, or dynamic content.

### Server Action (Same Pattern)

```typescript
// src/app/(admin)/cms/posts/_actions/createPost.ts
'use server'

import { revalidatePath } from 'next/cache'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { PostSchema } from '@contracts/post'
import type { ServerActionResult } from '@contracts/common'

export const createPost = async (input: unknown): ServerActionResult<{ id: string }> => {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return { ok: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } }
  }

  const parsed = PostSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please fix the errors below.',
        details: parsed.error.errors.map((e) => ({
          path: e.path,
          message: e.message,
        })),
      },
    }
  }

  try {
    const post = await db.post.create({ data: { ...parsed.data, authorId: session.user.id } })
    revalidatePath('/cms/posts')
    return { ok: true, value: { id: post.id } }
  } catch {
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create post.' } }
  }
}
```

### Form Component

```tsx
// src/app/(admin)/cms/posts/new/_components/PostForm.tsx
'use client'

import { useState } from 'react'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { FormMessage } from '@/components/ui/form-message'
import { Button } from '@/components/ui/button'
import { PostSchema, type PostInput } from '@contracts/post'

import { createPost } from '../../_actions/createPost'

type PostFormProps = {
  categories: Array<{ value: string; label: string }>
}

export const PostForm = ({ categories }: PostFormProps) => {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<PostInput>({
    resolver: zodResolver(PostSchema),
    defaultValues: {
      title: '',
      slug: '',
      content: '',
      published: false,
    },
  })

  const onSubmit = async (data: PostInput) => {
    setServerError(null)
    const result = await createPost(data)

    if (result.ok) {
      router.push('/cms/posts')
      return
    }

    // Map server validation errors to form fields
    if (result.error.code === 'VALIDATION_ERROR' && result.error.details) {
      for (const detail of result.error.details) {
        const field = detail.path[0] as keyof PostInput
        setError(field, { message: detail.message })
      }
      return
    }

    // Form-level error
    setServerError(result.error.message)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <FormMessage type="error" message={serverError} />}

      <Input
        label="Title"
        {...register('title')}
        error={errors.title?.message}
      />

      <Input
        label="Slug"
        {...register('slug')}
        hint="URL-friendly identifier (e.g., my-first-post)"
        error={errors.slug?.message}
      />

      <Textarea
        label="Content"
        rows={12}
        {...register('content')}
        error={errors.content?.message}
      />

      <Select
        label="Category"
        options={categories}
        placeholder="Select a category"
        {...register('categoryId')}
        error={errors.categoryId?.message}
      />

      <Checkbox
        label="Publish immediately"
        {...register('published')}
        error={errors.published?.message}
      />

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Post'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
```

### Key Pattern: Mapping Server Errors to Fields

When the Server Action returns `VALIDATION_ERROR` with `details`, the client maps them back to form fields using `setError()`:

```typescript
// This bridges server validation → client field errors
if (result.error.code === 'VALIDATION_ERROR' && result.error.details) {
  for (const detail of result.error.details) {
    const field = detail.path[0] as keyof PostInput
    setError(field, { message: detail.message })
  }
}
```

This means even if client validation passes (edge case: schema mismatch, race condition), the server's errors still appear on the correct fields.

---

## Edit Forms (Pre-Populated Data)

Edit forms follow the same patterns but receive initial data:

### Tier 1 (Native) — Edit with Hidden Fields

```tsx
// Simple edit — hidden field for ID, pre-populated values
export const EditContactForm = ({ contact }: { contact: Contact }) => {
  const [state, formAction, isPending] = useActionState(updateContact, null)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={contact.id} />
      <Input name="name" label="Name" defaultValue={contact.name} error={fieldError(state, 'name')} />
      <Input name="email" label="Email" defaultValue={contact.email} error={fieldError(state, 'email')} />
      <Button type="submit" disabled={isPending}>Save</Button>
    </form>
  )
}
```

### Tier 2 (RHF) — Edit with `defaultValues`

```tsx
// Complex edit — pre-populated via defaultValues
const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<PostInput>({
  resolver: zodResolver(PostSchema),
  defaultValues: {
    title: post.title,
    slug: post.slug,
    content: post.content,
    published: post.published,
    categoryId: post.categoryId ?? '',
  },
})

// Disable submit if nothing changed
<Button type="submit" disabled={isSubmitting || !isDirty}>
  {isSubmitting ? 'Saving...' : 'Save Changes'}
</Button>
```

---

## Multi-Step Forms

For complex flows like onboarding, checkout, or wizards:

```tsx
// src/app/(protected)/onboarding/_components/OnboardingForm.tsx
'use client'

import { useState } from 'react'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Step1Schema, Step2Schema, FullOnboardingSchema, type OnboardingInput } from '@contracts/onboarding'

const STEPS = ['Profile', 'Preferences', 'Review'] as const

export const OnboardingForm = () => {
  const [step, setStep] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(FullOnboardingSchema),
    mode: 'onTouched',   // Validate on blur, not on every keystroke
    defaultValues: {
      name: '',
      email: '',
      role: '',
      notifications: true,
    },
  })

  // Step-specific validation before advancing
  const stepSchemas = [Step1Schema, Step2Schema]

  const nextStep = async () => {
    const currentSchema = stepSchemas[step]
    if (!currentSchema) return

    const values = form.getValues()
    const result = currentSchema.safeParse(values)
    if (!result.success) {
      // Trigger validation errors for current step's fields
      result.error.errors.forEach((e) => {
        form.setError(e.path[0] as keyof OnboardingInput, { message: e.message })
      })
      return
    }
    setStep((s) => s + 1)
  }

  const prevStep = () => setStep((s) => Math.max(0, s - 1))

  const onSubmit = async (data: OnboardingInput) => {
    setServerError(null)
    const result = await completeOnboarding(data)
    if (!result.ok) {
      setServerError(result.error.message)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Progress indicator */}
      <nav aria-label="Progress" className="flex gap-2">
        {STEPS.map((name, i) => (
          <span
            key={name}
            className={cn(
              'h-2 flex-1 rounded-full',
              i <= step ? 'bg-primary-600' : 'bg-primary-100',
            )}
            aria-current={i === step ? 'step' : undefined}
          />
        ))}
      </nav>

      {/* Step content */}
      {step === 0 && <Step1Fields register={form.register} errors={form.formState.errors} />}
      {step === 1 && <Step2Fields register={form.register} errors={form.formState.errors} />}
      {step === 2 && <ReviewStep values={form.getValues()} />}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <Button type="button" variant="outline" onClick={prevStep}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={nextStep}>
            Next
          </Button>
        ) : (
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Completing...' : 'Complete'}
          </Button>
        )}
      </div>
    </form>
  )
}
```

**Key pattern**: Each step has its own Zod schema for partial validation. The full schema validates on final submit. `form.getValues()` persists data across steps without losing state.

---

## Form State Visual Summary

Every form field has exactly these visual states:

| State | Border | Ring | Text | Background |
|-------|--------|------|------|------------|
| **Default** | `border-primary-200` | — | `text-foreground` | `bg-background` |
| **Hover** | `border-primary-300` | — | — | — |
| **Focus** | — | `ring-2 ring-primary-500 ring-offset-2` | — | — |
| **Error** | `border-error-500` | `ring-error-500` (on focus) | — | — |
| **Error message** | — | — | `text-error-600` | — |
| **Disabled** | `opacity-50` | — | — | `cursor-not-allowed` |
| **Hint text** | — | — | `text-foreground/60 text-xs` | — |

---

## Anti-Patterns

```tsx
// ❌ Calling API directly from form — bypasses Server Action pattern
const onSubmit = async (data) => {
  await fetch('/api/contact', { method: 'POST', body: JSON.stringify(data) })
}

// ✅ Call Server Action — validates, returns Result<T>
const onSubmit = async (data) => {
  const result = await submitContact(data)
}

// ❌ Client-only validation — server trusts unvalidated data
const onSubmit = async (data) => {
  await createPost(data)  // Server Action doesn't validate!
}

// ✅ Server Action ALWAYS validates with Zod — client validation is UX, not security
export const createPost = async (input: unknown): ServerActionResult<...> => {
  const parsed = PostSchema.safeParse(input)  // Server-side validation
  if (!parsed.success) return { ok: false, error: ... }
}

// ❌ Throwing from Server Action — breaks the Result<T> contract
export const createPost = async (input: unknown) => {
  const parsed = PostSchema.parse(input)  // .parse() throws!
}

// ✅ Using .safeParse() — returns Result, never throws
export const createPost = async (input: unknown): ServerActionResult<...> => {
  const parsed = PostSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: ... }
}

// ❌ Placeholder-only labels — invisible to screen readers when field has value
<input placeholder="Enter your name" />

// ✅ Visible label + optional placeholder
<Input label="Name" placeholder="John Doe" />

// ❌ Disabling autocomplete globally — breaks password managers
<input autoComplete="off" />

// ✅ Let the browser help — only disable when security requires it (e.g., OTP fields)
<input autoComplete="email" />

// ❌ Using React Hook Form for a 2-field newsletter signup
const { register, handleSubmit } = useForm(...)  // Overkill!

// ✅ Native form + useActionState — zero dependencies
<form action={formAction}>
  <Input name="email" label="Email" type="email" required />
  <Button type="submit">Subscribe</Button>
</form>
```

---

## File Structure

```
src/
  components/ui/
    input/
      Input.tsx
      index.ts
    textarea/
      Textarea.tsx
      index.ts
    select/
      Select.tsx
      index.ts
    checkbox/
      Checkbox.tsx
      index.ts
    form-message/
      FormMessage.tsx
      index.ts
contracts/
  contact.ts              # ContactSchema + ContactInput
  post.ts                 # PostSchema + PostInput
  onboarding.ts           # Step schemas + FullOnboardingSchema
src/app/
  (marketing)/contact/
    page.tsx
    _actions/
      submitContact.ts    # Server Action
    _components/
      ContactForm.tsx     # Tier 1 (native + useActionState)
  (admin)/cms/posts/
    new/
      page.tsx
      _components/
        PostForm.tsx      # Tier 2 (React Hook Form)
    [id]/edit/
      page.tsx
      _components/
        EditPostForm.tsx  # Tier 2 (RHF with defaultValues)
```

---

## Rationale

### Why a Tiered Approach

A single approach doesn't fit all forms. React Hook Form for a 2-field newsletter signup is over-engineering — it adds ~12kB of client JS, requires `'use client'`, and breaks progressive enhancement for no benefit. Conversely, native `<form>` for a 15-field CMS editor with as-you-type validation creates terrible UX — every validation requires a server round-trip. The tiered approach matches the tool to the complexity.

### Why React Hook Form Over Formik / Final Form

React Hook Form uses uncontrolled inputs by default — the DOM owns form state, not React. This means zero re-renders on every keystroke (Formik re-renders the entire form). For a 20-field form, this performance difference is significant. RHF also has the best TypeScript support (generic `useForm<T>`), the largest ecosystem, and native Zod integration via `@hookform/resolvers`.

### Why Shared Zod Schemas

Defining the schema once (in `contracts/`) and using it on both client (React Hook Form resolver) and server (Server Action `.safeParse()`) guarantees validation rules are identical. Without sharing, client and server rules drift apart — the client allows data the server rejects, creating confusing user experiences.

### Why Server Actions Always Validate

Client-side validation is a UX feature, not a security feature. A malicious user can disable JavaScript, modify the DOM, or call the Server Action directly with curl. **The server MUST always validate** — the client validation exists only to give faster feedback.

### Key Factors
1. **Tiered complexity** — simple forms need zero dependencies; complex forms need RHF.
2. **Server-first validation** — Zod on the server is the security boundary; client validation is UX.
3. **Shared schemas** — one source of truth prevents client/server validation drift.
4. **Progressive enhancement** — native forms work without JavaScript (marketing sites, accessibility).
5. **Consistent styling** — form primitives enforce the same visual states across all forms.
6. **Accessibility built-in** — labels, `aria-describedby`, `aria-invalid`, `role="alert"` in every primitive.

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| Tiered (native + RHF) | Match tool to complexity | ✅ Chosen: right tool for each form size |
| React Hook Form only | Use RHF for all forms | ❌ Overkill for simple forms, breaks progressive enhancement |
| Native forms only | No form library | ❌ Terrible DX for complex forms (no field validation, no dynamic fields) |
| Formik | Popular form library | ❌ Re-renders on every keystroke, weaker TS support |
| Conform | Server Action-native forms | ❌ Promising but small community, less AI training data, newer |
| React Hook Form | Uncontrolled, performant forms | ✅ Chosen for medium/complex: best DX, zero re-renders, Zod integration |
| `useActionState` | React 19 native form hook | ✅ Chosen for simple: zero dependencies, progressive enhancement |

---

## Consequences

**Positive:**
- Simple forms ship zero form library JS — only native HTML + Server Actions.
- Complex forms get best-in-class DX with React Hook Form (as-you-type validation, field arrays, etc.).
- Shared Zod schemas guarantee client/server validation parity.
- Form UI primitives enforce consistent styling, accessibility, and error display across every form.
- Progressive enhancement works for marketing/SEO pages where JavaScript may be delayed.
- Server Actions always validate — client validation is UX, not the security boundary.
- `fieldError()` helper and `setError()` bridge cleanly connect server errors to client fields.

**Negative:**
- Two form patterns (native + RHF) — agents must choose the right tier. Mitigated by the decision flowchart.
- React Hook Form adds ~12kB to routes that use it — mitigated by only using it when needed.
- `useActionState` signature (`_prevState, formData`) is slightly awkward — mitigated by clear examples.
- Multi-step forms are complex regardless of approach — mitigated by providing a complete pattern.
- Form UI primitives need to be created per project — mitigated by providing copy-paste code for each.

## Related ADRs

- [ADR-0002](./0002-styling.md) — Styling (form field colors, focus rings, error states use design tokens)
- [ADR-0004](./0004-components.md) — Components (form primitives in `ui/` tier, ref forwarding)
- [ADR-0005](./0005-data-fetching.md) — Data fetching (Server Actions return `Result<T>`)
- [ADR-0007](./0007-error-handling.md) — Error handling (VALIDATION_ERROR with field-level details)
- [ADR-0009](./0009-testing.md) — Testing (form component testing with RTL + userEvent)
- [ADR-0010](./0010-authentication.md) — Authentication (auth check in form Server Actions)
- [ADR-0020](./0020-state-management.md) — State Management (form state stays in forms, not Zustand)

