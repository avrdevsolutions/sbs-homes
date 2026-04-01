---
name: ux-data-file-management
description: >-
  Data management and file management UX patterns — bulk operations with scope
  decision tree, import/export format decision tree, saved views and column visibility,
  drag-to-upload drop zone, upload progress queue, file preview type decision tree,
  image cropping, quota indicators. Use when implementing bulk actions on tables,
  CSV/JSON import or export flows, draggable upload areas, file browsers, image upload
  with cropping, or storage quota displays.
---

# Data Management & File Management Patterns

**Compiled from**: ADR-0026 §6 (Data Management) + §7 (File Management)
**Last synced**: 2026-03-22

---

## Bulk Operations

### Bulk Action Scope Decision Tree

```
How many items can be affected?
  → Current page only (20-50 items):
    → Page-level select-all checkbox
  → Entire dataset (100+ items across pages):
    → Page-level select-all + "Select all N results" link
    → Warning: "This will affect all N items matching your current filters"
    → Execute as background job if N > 100 — show progress indicator
```

**Bulk action bar pattern:**
- Trigger: select ≥1 row → bulk action bar slides in above/below the table
- Bar floating variant (grids, lists, kanban): fixed at bottom of viewport, centered — "5 items selected" + action buttons + "Deselect all"
- Destructive bulk actions: confirmation dialog with count ("Delete 23 items?")
- Long-running (export, batch update): progress bar, allow navigation away → background job + notification on completion
- After completion: deselect all, refresh data, toast with result ("23 items deleted")
- Keyboard: Escape deselects all and dismisses bar

**Accessibility:**
- Bar: `role="toolbar"` with `aria-label="Bulk actions, 23 items selected"`
- Selection changes: `aria-live="polite"` — "23 items selected" / "All items deselected"
- Each action: clear label ("Delete selected items", "Export selected")

---

## Import / Export

### Export Format Decision Tree

```
What will the user do with the exported data?
  → Open in a spreadsheet (Excel, Google Sheets): CSV
  → Import into another system / API: JSON
  → Share as a report: PDF or CSV
  → Backup for re-import: JSON (preserves nested structure)
```

**Export pattern:**
- Export button in the toolbar (not buried in a menu for common actions)
- When filters are active: label reflects scope — "Export filtered results (23 items)"
- Format selection: dropdown or radio buttons
- Large exports (>1000 rows): server-side background job → notify when ready → download link
- Download: use `Content-Disposition: attachment` — never open in a new tab

**Import pattern:**
1. File upload area with accepted format labelled: "Upload CSV or JSON"
2. Preview: after upload, show first 5-10 rows with column mapping
3. Column mapping: dropdown per column when import headers don't match system fields
4. Validation: show errors per row — "Row 3: invalid email format" — don't reject entire file for one bad row
5. Partial import option: "Import valid rows (47 of 50), skip 3 errors"
6. Progress: determinate progress bar for large files

**Accessibility:**
- Export button: `aria-label="Export data as CSV"` or clear visible text
- Preview table: standard accessible table with `<th>` headers
- Error list: `role="alert"` for validation error summary

---

## Saved Views & Column Visibility

**Use when:** Data tables where users have different workflow needs.

**Pattern:**
- Column visibility toggle: dropdown with checkbox per column — "Show/Hide Columns"
- Persist visibility per user (Zustand persist or server-side)
- Saved views: combine column visibility + sort + filters + column order into a named view
- Default view: always available, never deletable
- Custom views: user-created, shareable via URL
- Show "Showing 5 of 8 columns" — users should know data is hidden

**Accessibility:**
- Column toggle: `role="menuitemcheckbox"` or standard checkboxes in a dropdown
- Announce hidden columns: "Showing 5 of 8 columns"

---

## File Upload: Pattern Decision Tree

```
How is the upload triggered?
  → User picks files explicitly:
    → File picker button — <input type="file"> with styled trigger
  → User drags files from desktop:
    → Drag-to-upload drop zone
  → User pastes from clipboard:
    → Paste handler on content area (chat input, comment box)
  → Multiple upload paths:
    → Combine: drop zone + "Browse files" button inside + paste support
```

---

## Drag-to-Upload Drop Zone

**Pattern:**
- Visual area: dashed border, icon + text ("Drag files here or click to browse")
- On `dragenter`: border highlights, background subtly changes, text updates to "Drop files here"
- On drop: files added to upload queue
- "Browse files" button inside as fallback
- Accepted types visible: "PNG, JPG, PDF up to 10MB"

**Drag-over detection:** Track a `dragEnter` counter — increment on `dragenter`, decrement on `dragleave`. Visual state is active when counter > 0 (handles nested child elements correctly). Reset to 0 on `drop`.

**Full-page drop zone (optional — for media libraries, file managers):**
```ts
useEffect(() => {
  const onDragEnter = () => setShowOverlay(true)
  document.body.addEventListener('dragenter', onDragEnter)
  return () => document.body.removeEventListener('dragenter', onDragEnter)
}, [])
```
- Show full-page overlay with drop zone when files are dragged onto the page
- On `dragleave` from the page or on drop: dismiss overlay

**Accessibility:**
- Drop zone: `role="button"` (clickable to open file picker), `aria-label="Upload files. Accepted: PNG, JPG, PDF. Max: 10MB"`
- Drag-and-drop is an enhancement — the "Browse files" button is the accessible primary action
- File type/size restrictions in visible text, not just in `accept` attribute

**Responsive:**
- Desktop: full drop zone with drag-and-drop
- Mobile: drop zone renders as styled button — drag-and-drop not available on mobile
- Camera capture: add `capture="environment"` option on mobile `<input type="file">` for photo upload

---

## Upload Progress & Queue

**Single file:**
- Show file name, size, preview thumbnail (if image) after file selection
- States: Queued → Uploading (% progress) → Processing → Complete (✓) → Error (✗ + retry)
- Cancel button (✕) aborts the upload

**Multi-file queue:**
- Each file has its own progress bar and status
- Upload 2-3 concurrent files max (avoid bandwidth saturation)
- Overall: "3 of 7 files uploaded" above the individual list
- "Cancel all" / "Pause all" buttons for the queue
- Failed files: show at end with retry; don't auto-retry to avoid infinite loops

**Accessibility:**
- Each file: `role="progressbar"` with `aria-valuenow`, `aria-label="Uploading [filename]: 65%"`
- Status changes: `aria-live="polite"` — "File uploaded successfully" or "Upload failed: [filename]"
- Cancel: `aria-label="Cancel upload: [filename]"`

---

## File Preview Decision Tree

```
What file type?
  → Image (JPEG, PNG, WebP, GIF):
    → Thumbnail in list + lightbox on click
  → PDF:
    → Thumbnail (first page rendered) + PDF viewer on click (new tab or embedded)
  → Video:
    → Thumbnail (poster frame) + video player on click (lightbox)
  → Audio:
    → Waveform or play button + inline audio player
  → Other (DOC, XLS, ZIP):
    → File type icon + metadata (name, size, date) — no preview
```

---

## Image Cropping

**Use when:** Profile avatars, cover images, thumbnails — image must conform to a specific aspect ratio.

**Pattern:**
1. After file selection: show cropping interface before upload
2. Draggable + resizable crop rectangle on the image
3. Aspect ratio locked to required ratio (1:1 for avatar, 16:9 for cover)
4. Zoom: slider or pinch-to-zoom
5. Preview: show cropped result alongside the crop interface
6. Confirm: "Apply" → upload only the cropped image

**Layout:**
- Desktop: cropper left, preview right
- Mobile: full-width cropper, preview below or behind "Preview" button

**Accessibility:**
- Zoom: `role="slider"` with keyboard arrow keys
- Provide x/y/width/height text inputs for precise positioning as an alternative
- Preview: `aria-label="Cropped image preview"`

---

## Quota Indicators

**Pattern:**
- Progress bar: "2.1 GB of 5 GB used"
- Color thresholds: green (<70%), amber (70–90%), red (>90%)
- Warning toast at threshold: "You're running low on storage" + upgrade CTA
- Block uploads when quota is full: clear message + upgrade CTA — never silently fail

**Accessibility:**
- `role="progressbar"` with `aria-valuenow="42"` (percentage), `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Storage: 2.1 GB of 5 GB used, 42%"`
- Don't rely on color alone — the text label provides the data

---

## Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Open exports in a new tab | Use `Content-Disposition: attachment` to force download |
| Reject entire import file for one bad row | Validate per row, show errors in-list, offer partial import |
| Silent quota failure when uploading | Block upload with clear message + upgrade CTA |
| Auto-retry failed file uploads | Show retry button — infinite auto-retry wastes bandwidth and confuses users |
| Context menu as only route to bulk delete | Always expose bulk actions in a visible toolbar after row selection |
