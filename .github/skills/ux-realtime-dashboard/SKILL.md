---
name: ux-realtime-dashboard
description: >-
  Real-time update strategies and dashboard UX patterns — polling vs SSE vs
  WebSocket decision tree, TanStack Query refetchInterval, SSE with ReadableStream,
  WebSocket presence indicators, collaborative conflict resolution, widget grid layout,
  collapsible panels, date range selectors, chart accessibility. Use when implementing
  live data, polling dashboards, real-time notifications, collaborative presence,
  dashboard widget grids, or date-filtered analytics views.
---

# Real-Time Updates & Dashboard Patterns

**Compiled from**: ADR-0026 §4 (Real-Time Updates) + §5 (Dashboard Patterns)
**Last synced**: 2026-03-22

---

## Update Strategy Decision Tree

```
How fresh must the data be?
  → Seconds matter (chat, collaborative editing, live scores):
    → WebSocket — bidirectional, persistent connection
  → 5-30 second staleness acceptable (dashboards, notification counts, order status):
    → Is the server sending updates to the client (server-initiated)?
      → YES: Server-Sent Events (SSE) — simpler than WebSocket for one-way data
      → NO: Polling with TanStack Query refetchInterval
  → Minutes of staleness acceptable (analytics, reports, infrequent updates):
    → Polling with longer intervals (60-300s) or manual refresh button
```

---

## Polling

Use TanStack Query `refetchInterval`. Pause when the tab is hidden. Apply exponential backoff on errors.

```ts
useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: fetchStats,
  refetchInterval: isTabVisible ? 15_000 : false,
  retry: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
})
```

- Show a visual freshness indicator: "Updated 30s ago" with live-updating relative time
- Provide a manual "Refresh" button — users who don't want to wait
- `aria-live="polite"` on data regions that update via polling — screen readers announce changes
- Don't update `aria-live` regions more frequently than every 10 seconds (too frequent is spam)

---

## Server-Sent Events (SSE)

**Use when:** Server-to-client unidirectional updates — notification feeds, build/deployment progress, live activity logs.

**Server (Next.js Route Handler):**
```ts
// app/api/events/route.ts
export async function GET(): Promise<Response> {
  const stream = new ReadableStream({
    start(controller) {
      // Send event IDs for reconnect support
      const send = (id: string, event: string, data: unknown) => {
        controller.enqueue(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      }
      // Keep-alive every 30s to prevent proxy timeout
      const keepAlive = setInterval(() => controller.enqueue(': keep-alive\n\n'), 30_000)
      // Cleanup
      return () => clearInterval(keepAlive)
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
```

**Client:**
```ts
const es = new EventSource('/api/events')
es.addEventListener('notification', (e) => updateNotifications(JSON.parse(e.data)))
// EventSource auto-reconnects with Last-Event-ID header
```

**Anti-patterns:**
- ❌ Multiple SSE connections to the same server — browsers limit concurrent connections per domain (typically 6). Multiplex with event `type` fields over a single connection.
- ❌ Large payloads via SSE — send a notification trigger, then fetch the full resource separately.

---

## WebSocket

**Use when:** Bidirectional real-time — chat, collaborative editing, multiplayer, live cursors, presence.

**Connection lifecycle:**
```ts
// Connect on mount, exponential-backoff reconnect, disconnect on unmount
useEffect(() => {
  let ws: WebSocket
  let backoff = 1000
  const connect = () => {
    ws = new WebSocket(`wss://api.app.com/ws?token=${sessionToken}`)
    ws.onopen = () => { backoff = 1000 }
    ws.onmessage = (e) => dispatch(JSON.parse(e.data))
    ws.onclose = () => { setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 30_000) }
  }
  connect()
  return () => ws.close()
}, [])
```

- **Auth:** pass session token in the URL query param on initial connection — WebSocket API doesn't support arbitrary headers.
- **Message format:** `{ type: 'cursor_move', data: { ... } }` — `type` field routes to handlers.
- **On reconnect:** request full state snapshot to recover missed messages.

**Presence indicators:**
- Green dot = online (last active <5 min), yellow = idle (5-30 min), gray = offline (30+ min or explicit)
- Detect idle: no input/pointer events for >5 min → send idle status
- Don't rely on color alone — pair with tooltip text ("Online", "Away")
- Don't auto-scroll chat if the user has scrolled up — show "N new messages" button instead
- On mobile: cursor positions every 500ms instead of 100ms to save battery

---

## Collaborative Editing Conflict Resolution

```
What type of content is being edited?
  → Rich text / documents:
    → CRDT or Operational Transformation
    → Library: Yjs (CRDT), Liveblocks, or TipTap Collaboration
  → Structured data (forms, fields, settings):
    → Last-write-wins per field — merge at field level, not entity level
    → Show conflict notification: "This field was updated by [user] — accept theirs or keep yours"
  → Files / binary data:
    → Lock-based — user checks out file, others see "Editing by [user]"
```

**Field-level conflict UI:**
- Server detects version mismatch → reject save with conflict details
- Show diff: "Your value: X. Current value: Y (changed by [user] at [time])"
- Actions: "Keep mine" / "Accept theirs" / "Merge manually"

---

## Dashboard: Widget Grid Layout

**Pattern:**
- CSS Grid layout, typically 12-column grid
- Each widget: independent data fetching, owns its loading/error/empty state
- Widget card structure: header (title + actions/menu), body (chart/content), optional footer (link to detail)

**Widget size decision tree:**
```
What does the widget display?
  → Single KPI (number + trend): 3-4 columns (narrow card)
  → List/table (recent items, activity): 6 columns (half-width)
  → Chart (line, bar, pie): 6-8 columns
  → Complex visualization (map, multi-chart): 12 columns (full-width)
```

**Responsive breakpoints:**
- Desktop: 2-3 column grid
- Tablet: 2 columns — wide widgets go full-width
- Mobile: single column — all widgets stack vertically; KPI cards 2-per-row if small enough

**Accessibility:**
- Widget region: `role="region"` with `aria-label="Revenue this month"` (descriptive)
- Charts: data table alternative or `aria-label` on chart SVG summarizing the data
- Widget loading: `aria-busy="true"` + skeleton placeholder
- KPI values: associate text value with label — not just large font

---

## Dashboard: Collapsible Panels

**Pattern:**
- Panel with collapse toggle (icon button in header or at panel edge)
- Collapsed: hide completely or shrink to icon strip — content area expands to fill freed space
- Persist collapse state in `localStorage`
- Responsive: desktop → persistent with toggle; mobile → off-canvas drawer by default

**Accessibility:**
- Toggle: `aria-expanded="true"/"false"`, `aria-controls` pointing to panel, `aria-label="Collapse sidebar"`

---

## Dashboard: Date Range Selector

**Pattern:**
- Preset quick-picks: "Today", "Last 7 days", "Last 30 days", "This month", "This quarter", "Custom"
- Custom → date range picker (Radix Popover + calendar grid)
- Display: "Mar 1 – Mar 21, 2026" in the trigger
- URL state: `?from=2026-03-01&to=2026-03-21` — all widgets refetch on range change

**Accessibility:**
- Calendar grid: `role="grid"` with `aria-label="March 2026"`, day cells `role="gridcell"`
- Keyboard: Arrow keys navigate days, Enter selects, Page Up/Down switch months
- Selected range: `aria-label="Selected date range: March 1 to March 21, 2026"` on the trigger
- Presets: always accessible even on mobile — don't hide behind the custom picker

---

## Dashboard: Chart Interactions

**Pattern:**
- Tooltip on hover: exact value, date, and comparison
- Crosshair line tracks cursor across the chart
- Click to drill down to filtered detail view
- Zoom: click-drag brush selection for date range in time-series charts
- Legend: click to toggle series visibility

**Accessibility — critical:**
- Provide "View as table" toggle — charts are inaccessible to screen readers
- Root SVG: `role="img"`, `<title>` element for chart description
- `aria-label` on SVG: summarize the chart ("Revenue over past 30 days, trending up 12%")
- Hover-only tooltips are insufficient — "View as table" is the full data access path
- Mobile: tap to show tooltip (no hover), pinch-to-zoom if supported

---

## Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| All dashboard widgets showing spinners simultaneously | Skeleton per widget, streaming/Suspense for progressive render |
| Charts with no text alternative | "View as table" option for every chart |
| Date range with no presets (custom-only) | Preset quick-picks + custom range picker |
| Poll every 1-2s for non-critical data | 15-60s intervals; SSE/WebSocket for truly real-time needs |
| Multiple SSE/WebSocket connections to same server | Multiplex events on a single connection |
| Auto-scroll content when user is reading history | "New messages" button to jump to latest |
| Silently overwrite in-progress edits with server data | Notify of external changes, let user choose |
