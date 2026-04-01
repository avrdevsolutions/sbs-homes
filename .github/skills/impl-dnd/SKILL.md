---
name: impl-dnd
description: >-
  dnd-kit full implementation — DndContext + sensor setup (pointer + keyboard,
  activation distance), SortableContext with useSortable, arrayMove reorder
  handler, Kanban cross-column drag (DragOverlay, onDragOver + onDragEnd split),
  file drop zone with client-side validation, accessibility announcements
  customisation. Reduced motion: snap-to-position under prefers-reduced-motion.
  RTL + userEvent keyboard testing (Space/ArrowDown/Space). Use when
  implementing sortable lists, reorderable kanban boards, drag-between-columns
  UX, file upload drop zones, or writing tests for drag-and-drop interactions.
---

# Drag and Drop — dnd-kit Implementation Patterns

**Compiled from**: ADR-0027 §10 (Drag and Drop), §14 (Reduced Motion — DnD entry), §15.5 (Testing DnD)
**Last synced**: 2026-03-22

---

## 1. Architecture

dnd-kit uses a sensor-based model: sensors detect user intent (pointer, keyboard), collision algorithms pick the drop target, sortable presets handle list reordering.

```
DndContext (provider — sensors, collision, modifiers, accessibility)
  ├── SortableContext (list reordering)
  │     └── SortableItem (each draggable — useSortable hook)
  └── DragOverlay (optional — renders dragged ghost above all content)
```

Always enable both `PointerSensor` and `KeyboardSensor` — DnD without a keyboard alternative is an accessibility violation.

---

## 2. Sortable List

```tsx
// src/components/features/sortable-list/SortableList.tsx
'use client'
import { useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers'

type SortableListProps<T extends { id: string }> = {
  items: T[]
  onReorder: (items: T[]) => void
  renderItem: (item: T) => React.ReactNode
}

export const SortableList = <T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: SortableListProps<T>) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // Prevent accidental drags on click
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul role="listbox" aria-label="Reorderable list">
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id}>
              {renderItem(item)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

const SortableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform), // GPU-composited — no layout thrash
    transition,                                    // dnd-kit manages this — null during drag
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-border bg-surface p-3"
      role="option"
      aria-selected={isDragging}
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="text-muted-foreground" aria-hidden="true" />
      {children}
    </li>
  )
}
```

---

## 3. Kanban Board (Cross-Column Drag)

Key differences from a sortable list:
- Multiple `SortableContext` instances (one per column)
- `onDragOver` updates state in real-time as the card crosses column boundaries
- `onDragEnd` finalises the position
- `closestCorners` (2D) instead of `closestCenter` (1D)
- `DragOverlay` renders the ghost above all content

```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCorners}
  onDragStart={(event) => setActiveItem(findItem(event.active.id))}
  onDragOver={handleDragOver}   // Update column assignment in real-time
  onDragEnd={handleDragEnd}     // Finalise; clear activeItem
>
  {columns.map((column) => (
    <SortableContext
      key={column.id}
      items={column.items.map((i) => i.id)}
      strategy={verticalListSortingStrategy}
    >
      <KanbanColumn column={column} />
    </SortableContext>
  ))}

  {/* Renders the dragged card above all DOM layers */}
  <DragOverlay>
    {activeItem ? <KanbanCard item={activeItem} /> : null}
  </DragOverlay>
</DndContext>
```

`handleDragOver` mutates column membership (move card to the hovered column). `handleDragEnd` reorders within the final column and clears `activeItem`.

---

## 4. File Drop Zone

```tsx
'use client'
import { useCallback, useState } from 'react'

type DropZoneProps = {
  onFiles: (files: File[]) => void
  accept?: string[]
  maxSizeMB?: number
}

export const DropZone = ({
  onFiles,
  accept = ['image/*', 'application/pdf'],
  maxSizeMB = 10,
}: DropZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files).filter((file) => {
        if (file.size > maxSizeMB * 1024 * 1024) return false
        if (accept.length === 0) return true
        return accept.some((type) =>
          type.endsWith('/*')
            ? file.type.startsWith(type.replace('/*', '/'))
            : file.type === type
        )
      })

      if (files.length > 0) onFiles(files)
    },
    [onFiles, accept, maxSizeMB]
  )

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        'flex items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
        isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
      )}
      role="button"
      tabIndex={0}
      aria-label="Drop files here or click to browse"
    >
      <div className="text-center">
        <UploadIcon className="mx-auto mb-2 text-muted-foreground" />
        <Typography variant="body">Drag and drop files here, or click to browse</Typography>
        <Typography variant="small" className="text-muted-foreground">
          Max {maxSizeMB}MB per file
        </Typography>
      </div>
    </div>
  )
}
```

> Note: client-side file validation here is UX only. Server-side validation (ADR-0016) is the authoritative check.

---

## 5. Accessibility Announcements

dnd-kit provides built-in screen reader announcements. Customise them for meaningful text:

```tsx
const announcements = {
  onDragStart: ({ active }) =>
    `Picked up item ${active.id}. Use arrow keys to move, Space to drop, Escape to cancel.`,
  onDragOver: ({ active, over }) =>
    over
      ? `Item ${active.id} is over ${over.id}`
      : `Item ${active.id} is no longer over a drop target`,
  onDragEnd: ({ active, over }) =>
    over ? `Item ${active.id} was dropped on ${over.id}` : `Item ${active.id} was dropped`,
  onDragCancel: () => 'Drag cancelled',
}

<DndContext accessibility={{ announcements }} />
```

---

## 6. Reduced Motion

Under `prefers-reduced-motion: reduce`, disable the spring/ease settle animation:

```tsx
import { useMotionEnabled } from '@/lib/motion/hooks/useMotionEnabled'

const motionEnabled = useMotionEnabled()

// In SortableItem style:
const style = {
  transform: CSS.Transform.toString(transform),
  // Snap to position instantly — no animation under reduced motion
  transition: motionEnabled ? transition : 'none',
  opacity: isDragging ? 0.5 : 1,
}
```

The ghost (`DragOverlay`) should also skip entrance animations when reduced motion is active. Use `motionEnabled` to gate any Framer Motion variant transitions on `DragOverlay` content.

---

## 7. Testing Drag and Drop

dnd-kit's keyboard sensor makes testing possible with `@testing-library/user-event`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('reorders items via keyboard (Space → ArrowDown → Space)', async () => {
  const user = userEvent.setup()
  const onReorder = vi.fn()

  render(
    <SortableList
      items={[{ id: '1', name: 'A' }, { id: '2', name: 'B' }]}
      onReorder={onReorder}
      renderItem={(item) => <span>{item.name}</span>}
    />
  )

  // Focus the first item's grab handle area (or the li itself)
  const firstItem = screen.getByText('A').closest('[role="option"]')!
  firstItem.focus()

  // Space = pick up; ArrowDown = move; Space = drop
  await user.keyboard(' ')
  await user.keyboard('{ArrowDown}')
  await user.keyboard(' ')

  expect(onReorder).toHaveBeenCalledWith([
    { id: '2', name: 'B' },
    { id: '1', name: 'A' },
  ])
})

it('cancels drag on Escape', async () => {
  const user = userEvent.setup()
  const onReorder = vi.fn()

  render(
    <SortableList
      items={[{ id: '1', name: 'A' }, { id: '2', name: 'B' }]}
      onReorder={onReorder}
      renderItem={(item) => <span>{item.name}</span>}
    />
  )

  const firstItem = screen.getByText('A').closest('[role="option"]')!
  firstItem.focus()
  await user.keyboard(' ')
  await user.keyboard('{Escape}')

  expect(onReorder).not.toHaveBeenCalled()
})
```

---

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Pattern |
|-------------|----------------|-----------------|
| Only `PointerSensor`, no `KeyboardSensor` | Keyboard-only users cannot reorder | Always add `KeyboardSensor` with `sortableKeyboardCoordinates` |
| Using CSS `top`/`left` for drag transform | Causes layout recalculation every frame | Use `CSS.Transform.toString(transform)` — GPU-composited |
| Skipping `activationConstraint: { distance }` | Accidental drags on click/tap | Set `distance: 8` on PointerSensor |
| No reduced motion gate on settle animation | WCAG 2.3.3 violation (animation) | Gate `transition` with `useMotionEnabled()` |
| No accessibility announcements | Screen readers can't communicate drag state | Provide `announcements` to `DndContext` |
