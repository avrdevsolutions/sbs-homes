---
name: impl-carousel-table
description: >-
  Embla Carousel full implementation — useEmblaCarousel setup, navigation
  arrows with disabled state, indicator dots as role=tablist, keyboard arrow
  handler (Embla does not provide this natively), autoplay with reduced motion
  gate via useMotionEnabled(), ARIA roles (region/roledescription/group/slide),
  three variant configs (hero/card/thumbnail). TanStack Table full headless
  setup — sorting with aria-sort, filtering, pagination, row selection with
  Checkbox, column definitions pattern including actions column. Server-side vs
  client-side decision tree (< 500 / 500-10k / 10k+ rows), responsive strategy
  decision tree (horizontal scroll vs card stack). Use when building a hero
  slider, card carousel, product gallery, sortable/filterable/paginated data
  table, or admin list with row selection and bulk actions.
---

# Carousel & Data Table — Implementation Patterns

**Compiled from**: ADR-0027 §8 (Embla Carousel), §9 (TanStack Table)
**Last synced**: 2026-03-22

---

## 1. Embla Carousel Setup

```tsx
// src/components/features/carousel/Carousel.tsx
'use client'
import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { useMotionEnabled } from '@/lib/motion/hooks/useMotionEnabled'

type CarouselProps = {
  children: React.ReactNode
  options?: { loop?: boolean; align?: 'start' | 'center' | 'end' }
  autoplay?: boolean
  autoplayInterval?: number
}

export const Carousel = ({
  children,
  options = {},
  autoplay = false,
  autoplayInterval = 5000,
}: CarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(options)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [slideCount, setSlideCount] = useState(0)
  const motionEnabled = useMotionEnabled()

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    setSlideCount(emblaApi.scrollSnapList().length)
    onSelect()
    emblaApi.on('select', onSelect)
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi, onSelect])

  // Autoplay — disabled entirely under reduced motion (a11y requirement)
  useEffect(() => {
    if (!autoplay || !emblaApi || !motionEnabled) return
    let timer: ReturnType<typeof setInterval>
    const start = () => { timer = setInterval(() => emblaApi.scrollNext(), autoplayInterval) }
    const stop = () => clearInterval(timer)
    start()
    emblaApi.on('pointerDown', stop)
    emblaApi.on('pointerUp', start)
    return () => { stop(); emblaApi.off('pointerDown', stop); emblaApi.off('pointerUp', start) }
  }, [emblaApi, autoplay, autoplayInterval, motionEnabled])

  // Embla does not provide keyboard handling natively — add it explicitly
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { emblaApi?.scrollPrev(); e.preventDefault() }
    else if (e.key === 'ArrowRight') { emblaApi?.scrollNext(); e.preventDefault() }
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Image carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">{children}</div>
      </div>

      <button
        onClick={() => emblaApi?.scrollPrev()}
        disabled={!canScrollPrev}
        aria-label="Previous slide"
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/80 p-2 disabled:opacity-30"
      >
        ←
      </button>
      <button
        onClick={() => emblaApi?.scrollNext()}
        disabled={!canScrollNext}
        aria-label="Next slide"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/80 p-2 disabled:opacity-30"
      >
        →
      </button>

      <div role="tablist" aria-label="Slide indicators" className="mt-4 flex justify-center gap-2">
        {Array.from({ length: slideCount }).map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === selectedIndex}
            aria-label={`Go to slide ${i + 1}`}
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              i === selectedIndex ? 'bg-primary' : 'bg-muted'
            )}
            onClick={() => emblaApi?.scrollTo(i)}
          />
        ))}
      </div>
    </div>
  )
}

export const CarouselSlide = ({ children }: { children: React.ReactNode }) => (
  <div className="min-w-0 flex-[0_0_100%] px-2" role="group" aria-roledescription="slide">
    {children}
  </div>
)
```

## 2. Carousel Variants

| Variant | Embla Options | Slide Sizing |
|---------|-------------|--------------|
| Hero (1 slide, full-width) | `{ loop: true }` | `flex-[0_0_100%]` |
| Card carousel (multiple visible) | `{ align: 'start' }` | `flex-[0_0_33.33%]` desktop, `flex-[0_0_80%]` mobile |
| Product gallery + thumbnails | Two instances; sync via `emblaApi.scrollTo()` on thumb click | Main: full-width; Thumbs: small fixed |

## 3. Carousel ARIA Checklist

| Requirement | Implementation |
|------------|----------------|
| `role="region"` + `aria-roledescription="carousel"` | On container |
| `aria-label` on container | Names the carousel for screen readers |
| `role="group"` + `aria-roledescription="slide"` | On each slide (CarouselSlide) |
| Prev/Next buttons with `aria-label` | Keyboard-accessible navigation |
| Indicator dots: `role="tab"` + `aria-selected` | Screen reader knows the active slide |
| Autoplay pauses on hover and focus | Users can read content before it advances |
| Autoplay disabled under reduced motion | Gate with `useMotionEnabled()` |

---

## 4. TanStack Table Setup

```tsx
// src/components/features/data-table/DataTable.tsx
'use client'
import { useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  pageSize?: number
}

export const DataTable = <TData,>({ columns, data, pageSize = 10 }: DataTableProps<TData>) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    initialState: { pagination: { pageSize } },
  })

  return (
    <div>
      <div className="rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-medium text-muted-foreground"
                    aria-sort={
                      header.column.getIsSorted() === 'asc' ? 'ascending'
                        : header.column.getIsSorted() === 'desc' ? 'descending'
                        : 'none'
                    }
                  >
                    {!header.isPlaceholder && header.column.getCanSort() ? (
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortIcon direction={header.column.getIsSorted()} />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-muted/30"
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-2 py-4">
        <span className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
```

## 5. Server-Side vs Client-Side Decision

```
Row count?
  → <500 rows (unlikely to grow past 1000):
    → Client-side — TanStack Table sorts/filters/paginates in-browser
    → Fetch once on server, pass as prop from Server Component
  → 500–10k rows:
    → Server-side pagination + client-side sort/filter
    → URL params for page number; server fetches slice
  → 10k+ rows or complex search:
    → Full server-side — sort, filter, page all via URL params + API
    → Consider TanStack Virtual for render performance
```

## 6. Column Definition Pattern

```tsx
import type { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'

export const columns: ColumnDef<User>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label={`Select row ${row.index + 1}`}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>,
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('role')}</Badge>,
    filterFn: 'equals',
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
  },
  {
    id: 'actions',
    cell: ({ row }) => <RowActions user={row.original} />,
    enableSorting: false,
  },
]
```

## 7. Responsive Strategy

```
Screen width?
  → ≥768px: Standard table layout
  → <768px:
    → ≤5 columns: Horizontal scroll with sticky first column
    → >5 columns: Card/list view (each row becomes a card)
```

**Horizontal scroll with sticky column:**

```tsx
<div className="overflow-x-auto">
  <table className="w-full min-w-[600px]">
    {/* First column: sticky left-0 bg-surface z-10 */}
  </table>
</div>
```
