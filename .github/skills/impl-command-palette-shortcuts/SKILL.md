---
name: impl-command-palette-shortcuts
description: >-
  cmdk command palette implementation — Dialog integration, Command.Input /
  Command.List / Command.Group / Command.Item setup, shouldFilter=false for
  API search, platform-aware ⌘K / Ctrl+K trigger with useIsMac. Keyboard
  shortcut system — useKeyboardShortcut hook, global vs component scoping,
  reserved shortcuts table (never override ⌘C/V/T/W), discoverable help
  sheet with <kbd> elements. Reduced motion: command palette and toast use
  fade-only animations. E2E Playwright test pattern. Use when implementing
  a ⌘K command palette, registering keyboard shortcuts, building a shortcut
  help panel, or displaying platform-specific key labels.
---

# Command Palette & Keyboard Shortcuts — Implementation Patterns

**Compiled from**: ADR-0027 §11 (Command Palette), §13 (Keyboard Shortcuts), §14 (Reduced Motion — command palette/toast entries), §15.6 (E2E Testing)
**Last synced**: 2026-03-22

---

## 1. Command Palette Setup (cmdk + Radix Dialog)

cmdk provides the accessible combobox. Wrap it in a Radix Dialog for overlay behaviour (focus trap, Escape dismiss, backdrop):

```tsx
// src/components/features/command-palette/CommandPalette.tsx
'use client'
import { useCallback, useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export const CommandPalette = () => {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // ⌘K / Ctrl+K to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const runCommand = useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-xs">
          <Command.Input
            placeholder="Type a command or search..."
            className="h-12 w-full border-b border-border bg-transparent px-4 outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation">
              <CommandItem onSelect={() => runCommand(() => router.push('/dashboard'))}>
                Dashboard
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
                Settings
              </CommandItem>
            </Command.Group>

            <Command.Separator className="my-1 h-px bg-border" />

            <Command.Group heading="Recent">
              {recentItems.map((item) => (
                <CommandItem key={item.id} onSelect={() => runCommand(() => router.push(item.href))}>
                  {item.title}
                </CommandItem>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandItem = ({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) => (
  <Command.Item
    onSelect={onSelect}
    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-muted"
  >
    {children}
  </Command.Item>
)
```

**cmdk vs `Command.Dialog`:** cmdk ships its own `Command.Dialog` that wraps Radix Dialog internally. Use the manual composition above when you need custom animation, overlay styles, or keyboard shortcut triggering outside the component.

**Custom fuzzy search (API-driven):** Set `shouldFilter={false}` on `<Command>` and manage the item list yourself with debounced API queries. cmdk still handles keyboard navigation and selection.

---

## 2. Platform-Aware Shortcut Display

```tsx
'use client'
import { useEffect, useState } from 'react'

export const useIsMac = () => {
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    setIsMac(navigator.userAgent.includes('Mac'))
  }, [])
  return isMac
}

// In the trigger button or nav item:
const isMac = useIsMac()
<kbd className="text-xs text-muted-foreground">
  {isMac ? '⌘' : 'Ctrl+'}K
</kbd>
```

---

## 3. Keyboard Shortcut Registration Hook

```tsx
// src/hooks/useKeyboardShortcut.ts
'use client'
import { useEffect } from 'react'

type KeyCombo = {
  key: string
  meta?: boolean   // ⌘ on Mac, Ctrl on Windows/Linux
  shift?: boolean
  alt?: boolean
}

type ShortcutOptions = {
  preventDefault?: boolean
  /** Skip when an input/textarea/select/contenteditable is focused */
  ignoreInputs?: boolean
}

export const useKeyboardShortcut = (
  combo: KeyCombo,
  callback: () => void,
  options: ShortcutOptions = {}
) => {
  const { preventDefault = true, ignoreInputs = true } = options

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (ignoreInputs) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        if ((e.target as HTMLElement).isContentEditable) return
      }

      const metaMatch = combo.meta ? e.metaKey || e.ctrlKey : true
      const shiftMatch = combo.shift ? e.shiftKey : !e.shiftKey
      const altMatch = combo.alt ? e.altKey : !e.altKey

      if (
        e.key.toLowerCase() === combo.key.toLowerCase() &&
        metaMatch &&
        shiftMatch &&
        altMatch
      ) {
        if (preventDefault) e.preventDefault()
        callback()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [combo, callback, preventDefault, ignoreInputs])
}
```

---

## 4. Shortcut Scoping

| Scope | Where to Register | Example |
|-------|------------------|---------|
| Global | Layout-level client component, mounted once | ⌘K (command palette), ? (shortcut help) |
| Component | Inside the component that owns the action | Escape (close modal), Enter (confirm) |
| Conditional | Pass `enabled` or use a guard inside the hook | Shortcuts active only when a panel is open |

---

## 5. Reserved Shortcuts — Never Override

| Shortcut | Browser Function |
|----------|-----------------|
| ⌘C / Ctrl+C | Copy |
| ⌘V / Ctrl+V | Paste |
| ⌘Z / Ctrl+Z | Undo |
| ⌘T / Ctrl+T | New tab |
| ⌘W / Ctrl+W | Close tab |
| ⌘L / Ctrl+L | Address bar |
| F5 / ⌘R | Refresh |
| Tab | Tab navigation (never capture globally) |

---

## 6. Discoverable Shortcut Help Panel

Open with `?` key, display in a Sheet:

```tsx
// Register globally in a layout client component:
useKeyboardShortcut({ key: '?' }, () => setShortcutHelpOpen(true))

// Render key combos with <kbd>:
<div className="flex items-center justify-between py-1">
  <span className="text-sm text-foreground">Open command palette</span>
  <div className="flex gap-1">
    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono">
      {isMac ? '⌘' : 'Ctrl'}
    </kbd>
    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono">
      K
    </kbd>
  </div>
</div>
```

---

## 7. Reduced Motion

Under `prefers-reduced-motion: reduce`, overlay animations for the command palette must be **fade-only** (no scale or slide):

```tsx
import { useMotionEnabled } from '@/lib/motion/hooks/useMotionEnabled'

const motionEnabled = useMotionEnabled()

// In DialogContent className:
className={cn(
  motionEnabled
    ? 'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95'
    : 'data-[state=open]:animate-in data-[state=open]:fade-in-0'
  // Reduced: fade only — no zoom-in-95
)}
```

**CSS-first alternative** (applies to all `data-[state]` animations globally):

```css
/* globals.css */
@media (prefers-reduced-motion: reduce) {
  [data-state='open'],
  [data-state='closed'] {
    animation-duration: 0.01ms !important;
  }
}
```

Use the CSS approach when you control all Radix animations through Tailwind's `animate-in`/`animate-out` utilities — it applies automatically without per-component JS checks.

---

## 8. E2E Testing with Playwright

```ts
// tests/e2e/command-palette.spec.ts
import { expect, test } from '@playwright/test'

test('command palette opens with ⌘K and navigates', async ({ page }) => {
  await page.goto('/')

  await page.keyboard.press('Meta+k')
  await expect(page.getByPlaceholder('Type a command or search...')).toBeVisible()

  await page.keyboard.type('settings')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL('/settings')
})

test('command palette closes on Escape', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Meta+k')
  await expect(page.getByPlaceholder('Type a command or search...')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByPlaceholder('Type a command or search...')).not.toBeVisible()
})
```
