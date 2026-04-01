---
name: impl-form-interaction
description: >-
  React Hook Form + Radix UI wiring — register for plain inputs, Controller for
  Radix Select / Checkbox / Switch and other custom components. ARIA validation
  attributes table (aria-invalid, aria-describedby, role=alert). Lazy-then-eager
  validation timing decision tree — onBlur first, onChange after first error.
  Submit button state with useTransition (works with server actions and fetch)
  vs useFormStatus (server action only). Multi-step wizard useWizard hook with
  single RHF form instance across steps. Use when connecting form fields to
  Radix UI primitives, implementing validation timing, managing submit loading
  states, building multi-step onboarding wizards, or adding ARIA to form errors.
---

# Form Interactivity — RHF, ARIA & Submit Patterns

**Compiled from**: ADR-0027 §6 (Form Interactivity)
**Last synced**: 2026-03-22

> This skill covers form interactivity implementation. Zod schema design,
> Server Actions, and form tier selection are covered in a separate skill.

---

## 1. React Hook Form + register (Plain Inputs)

Use `register` for native HTML inputs (`<input>`, `<textarea>`, `<select>`):

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const ProfileForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          {...register('name')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>
    </form>
  )
}
```

## 2. Controller (Radix Select and Custom Components)

Use `Controller` when the component is not a native HTML element — Radix Select, Checkbox, Switch, RadioGroup, or any component that doesn't accept a standard DOM `ref`:

```tsx
import { Controller } from 'react-hook-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

<Controller
  name="role"
  control={control}
  render={({ field, fieldState }) => (
    <div className="space-y-2">
      <Label htmlFor="role">Role</Label>
      <Select onValueChange={field.onChange} value={field.value}>
        <SelectTrigger
          id="role"
          aria-invalid={!!fieldState.error}
          aria-describedby={fieldState.error ? 'role-error' : undefined}
        >
          <SelectValue placeholder="Select a role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="editor">Editor</SelectItem>
          <SelectItem value="viewer">Viewer</SelectItem>
        </SelectContent>
      </Select>
      {fieldState.error && (
        <p id="role-error" className="text-sm text-destructive" role="alert">
          {fieldState.error.message}
        </p>
      )}
    </div>
  )}
/>
```

## 3. ARIA Attributes for Validation

| Attribute | When to Apply | Purpose |
|-----------|---------------|---------|
| `aria-invalid="true"` | Field has an active error | Marks field as invalid for screen readers |
| `aria-describedby="field-error"` | Error message is visible | Links field to its error text |
| `role="alert"` | On the error `<p>` element | Announces the error when it appears |
| `aria-live="polite"` | On a form-level error summary | For multi-error summary regions |

Always prefer `aria-describedby` over `aria-errormessage` — broader browser and ARIA support.

## 4. Validation Timing Decision Tree (Lazy-Then-Eager)

```
Form type?
  → Create form (empty fields):
    → mode: 'onBlur', reValidateMode: 'onChange'
    → No errors shown until user leaves a field
    → After first error: validates live on change (eager re-validate)
  → Edit form (pre-filled data):
    → mode: 'onBlur', reValidateMode: 'onChange'
    → Same — user is modifying known-good values
  → Search / filter input:
    → mode: 'onChange'
    → Immediate feedback expected for filtering UX
```

```tsx
// Standard config for create and edit forms
const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onBlur',
  reValidateMode: 'onChange',
})
```

## 5. Submit State with useTransition

```tsx
'use client'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

export const CreateItemForm = () => {
  const [isPending, startTransition] = useTransition()
  const form = useForm<CreateItemData>({ resolver: zodResolver(createItemSchema) })

  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      const result = await createItem(data)
      if (result.success) {
        toast.success('Item created')
        form.reset()
      } else {
        toast.error(result.message)
      }
    })
  })

  return (
    <form onSubmit={onSubmit}>
      {/* fields */}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Item'}
      </Button>
    </form>
  )
}
```

**`useTransition` vs `useFormStatus`:**
- `useTransition` works with both server actions and client-side `fetch` — use this universally
- `useFormStatus` only works with `<form action={serverAction}>` — avoid unless specifically needed

## 6. Multi-Step Wizard: useWizard Hook

```tsx
// src/hooks/useWizard.ts
'use client'
import { useCallback, useState } from 'react'

export const useWizard = ({
  totalSteps,
  initialStep = 0,
}: {
  totalSteps: number
  initialStep?: number
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep)

  const goNext = useCallback(
    () => setCurrentStep((s) => Math.min(s + 1, totalSteps - 1)),
    [totalSteps]
  )
  const goPrev = useCallback(() => setCurrentStep((s) => Math.max(s - 1, 0)), [])
  const goTo = useCallback(
    (step: number) => setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1))),
    [totalSteps]
  )

  return {
    currentStep,
    totalSteps,
    isFirst: currentStep === 0,
    isLast: currentStep === totalSteps - 1,
    goNext,
    goPrev,
    goTo,
  }
}
```

**Single RHF instance across all steps** — never multiple separate forms. This keeps validation state unified and allows a single server action to receive all data on final submit:

```tsx
export const OnboardingWizard = () => {
  const { currentStep, isLast, goNext, goPrev } = useWizard({ totalSteps: 3 })
  const form = useForm<OnboardingData>({ resolver: zodResolver(onboardingSchema) })

  const onSubmit = form.handleSubmit(async (data) => {
    if (!isLast) { goNext(); return }
    await completeOnboarding(data)  // final step: submit all data
  })

  return (
    <form onSubmit={onSubmit}>
      {currentStep === 0 && <StepPersonalInfo form={form} />}
      {currentStep === 1 && <StepPreferences form={form} />}
      {currentStep === 2 && <StepReview form={form} />}
      <div className="flex gap-2 mt-4">
        {!form.formState.disabled && currentStep > 0 && (
          <Button type="button" onClick={goPrev}>Back</Button>
        )}
        <Button type="submit">{isLast ? 'Complete' : 'Next'}</Button>
      </div>
    </form>
  )
}
```
