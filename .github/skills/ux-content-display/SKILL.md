---
name: ux-content-display
description: >-
  Content display patterns — image and video lightbox (single/gallery, ARIA dialog, focus trap),
  toggle patterns (pricing monthly/annual segmented control, list/grid view switcher, before/after
  comparison slider, content variant selector), masonry and grid with filter bar (CSS Grid masonry
  progressive enhancement, category filter pills with AnimatePresence), feature comparison tables
  and plan comparison cards (responsive sticky header, semantic table structure). Use when building
  image galleries, pricing toggles, view switchers, masonry portfolio grids, feature comparison
  tables, or plan pricing cards.
---

# Content Display — Lightbox, Toggles, Masonry & Comparison

**Compiled from**: ADR-0025 §5 (Lightbox), §6 (Toggle / Switch Content), §9 (Masonry / Grid with Filtering), §13 (Comparison Patterns), §15 Anti-Patterns
**Last synced**: 2026-03-22

---

## Lightbox / Modal Gallery

### Lightbox vs Inline — Decision Tree

```
Does the user need to see the image at full resolution or detail?
  → YES: Is the image part of a collection the user browses sequentially?
    → YES: Lightbox gallery — full-screen overlay with prev/next navigation
    → NO: Lightbox single — full-screen overlay, close to return
  → NO: Is the image supplementary (illustrating text)?
    → YES: Inline — no lightbox needed, image at natural size
    → NO: Expandable card (see ux-display-indicators skill for inline expand)
```

### Image Lightbox Pattern

**Implementation:** Use Radix Dialog (via shadcn/ui) as the overlay — handles focus trap, Escape key, and `aria-modal` automatically.

- Dark backdrop (90–95% opacity), image scales to fit viewport with padding (not cropped)
- Close: X button (top-right) + Escape key + click outside image + swipe down (mobile)
- Gallery navigation: Previous/Next arrows, keyboard Left/Right, swipe left/right
- Counter: "3 / 12" — `aria-live="polite"` announces on navigation
- Optional: zoom on double-tap/scroll, pinch-to-zoom mobile
- Preload adjacent images to avoid >300ms open latency

**ARIA:**
```html
<div role="dialog" aria-label="Image gallery" aria-modal="true">
  <button aria-label="Close gallery">✕</button>
  <img alt="Product front view" />
  <button aria-label="Previous image">‹</button>
  <button aria-label="Next image">›</button>
  <div aria-live="polite" aria-atomic="true">Image 3 of 12</div>
</div>
```

- Focus trap: Tab cycles through Close, Previous, Next (and image if zoomable)
- On close: focus returns to the thumbnail that opened the lightbox
- Escape closes lightbox

**Responsive:** Desktop: centered image, side arrows, X top-right. Mobile: full-screen, swipe navigation, X button or swipe-down to close.

### Video Lightbox Pattern

- Thumbnail + centered play button overlay (semi-transparent)
- Click opens lightbox — video auto-plays on open (muted if autoplay policies require)
- Don't load the video player until lightbox opens — use static thumbnail as trigger
- Close: Escape or X button — pauses/stops video
- Play button: `aria-label="Play video: [video title]"`
- Captions/subtitles required if video has spoken content (WCAG 1.2.2)
- Video player: native controls visible, keyboard accessible (Space = play/pause)

**Anti-patterns:**
- ❌ No close button (only Escape or click-outside) — mobile users have no Escape key
- ❌ Auto-advancing gallery in lightbox — user controls navigation in lightbox always
- ❌ Lightbox for content that should be a page (long text, forms)
- ❌ Lightbox that takes >300ms to open — preload adjacent images

---

## Toggle / Switch Content

### Pricing Toggle (Monthly/Annual)

**Implementation:** Segmented control with `role="radiogroup"` — not a checkbox (`<input type="checkbox">`) because it's choosing between two named values, not on/off.

```html
<div role="radiogroup" aria-label="Billing period">
  <button role="radio" aria-checked="false">Monthly</button>
  <button role="radio" aria-checked="true">Annual</button>
</div>
<div aria-live="polite"><!-- Price values update here --></div>
```

- Switching updates all prices instantly (no reload)
- Highlight savings: "Save 20%" badge near Annual option
- Keyboard: Arrow keys switch between options (roving tabindex)
- Pricing cards stack vertically on mobile; toggle stays centered above

### List/Grid View Switcher

```html
<div role="radiogroup" aria-label="View mode">
  <button role="radio" aria-checked="true" aria-label="Grid view">⊞</button>
  <button role="radio" aria-checked="false" aria-label="List view">☰</button>
</div>
<div aria-live="polite"><!-- "Showing grid view" / "Showing list view" --></div>
```

- Persist preference in `localStorage`
- Grid: card layout, emphasis on images. List: row layout, emphasis on text/metadata
- Transition: `AnimatePresence` layout animation for smooth switch, or instant swap
- Default to grid on mobile (space-efficient), list on desktop (detail-rich) — override allowed

### Before/After Comparison Slider

**Use when:** Same visual in two states — photo editing before/after, redesign old/new.
**Don't use:** Comparing unrelated images or content with different aspect ratios.

```html
<div
  role="slider"
  aria-label="Comparison slider"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow="50"
>
  <!-- Draggable divider handle (≥44px touch target) -->
</div>
```

- Two overlapping images at the same dimensions; draggable vertical (or horizontal) divider
- Labels on each side: "Before" / "After"
- Keyboard: Left/Right arrows move divider in 5–10% increments
- Both images have descriptive `alt` text
- Fallback (no JS): show both images stacked with labels

### Content Variant Selector (Code Language / Theme)

**Use when:** Same content structure in different variants — code in multiple languages, component in different themes, recipe in metric/imperial.

- Tab-like selector above content area
- Persist selection across the page or site
- Site-wide preference: use Zustand global store
- Selector: `role="radiogroup"` or `role="tablist"` — use tabs if it visually looks like tabs
- Content region: `aria-live="polite"` on update

---

## Masonry / Grid with Filtering

### Layout Strategy Decision Tree

```
Are all items the same height?
  → YES: CSS Grid with fixed rows — simpler, no JS needed
  → NO: Is the height variance significant (>30% difference)?
    → YES: Masonry layout — items fill vertical gaps
    → NO: CSS Grid with auto-fill and minmax — minor gaps acceptable
```

### CSS Grid Masonry — Progressive Enhancement

Native CSS masonry (`grid-template-rows: masonry`) has growing but not universal browser support in 2026.

```css
/* Step 1 — universal fallback */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

/* Step 2 — native masonry where supported */
@supports (grid-template-rows: masonry) {
  .grid {
    grid-template-rows: masonry;
  }
}
```

**Don't** reach for JS masonry libraries (Masonry.js, Isotope) when CSS Grid with minor height variance is acceptable — JS masonry causes layout recalculation on resize and adds bundle weight.

### Category Filter Bar

**Pattern:**
- Horizontal row of filter pills above the grid; "All" is default selected
- Click a filter: fade out non-matching, fade in matching — use `AnimatePresence` from Framer Motion
- URL state: `?category=design` — URL is source of truth for filters
- Multiple selection optional: toggle multiple categories, show intersection or union

**ARIA:**
```html
<div role="toolbar" aria-label="Filter by category">
  <button aria-pressed="true">All</button>
  <button aria-pressed="false">Design</button>
  <button aria-pressed="false">Engineering</button>
</div>
<div aria-live="polite">Showing 8 items</div>
```

**Responsive:** Desktop: full horizontal row. Mobile: horizontally scrollable pill row or dropdown `<select>`.

---

## Comparison Patterns

### Feature Comparison Table

**Use when:** SaaS pricing with 2–4 plans showing feature availability across a structured set of rows.

**Pattern:**
- `<table>` with proper `<thead>`, `<tbody>`, `<th scope="col">` / `<th scope="row">`
- `<caption>` describing the table purpose
- Sticky `<thead>`: plan names stay visible while scrolling
- Highlighted column for recommended plan (border, background, "Most Popular" badge)
- Checkmarks: visually hidden text "Included" / "Not included" alongside icons — icons alone are not accessible

**Responsive:**
- Desktop: all columns visible
- Mobile: horizontal scroll with sticky first column (feature names) — same pattern as data table horizontal scroll
- Alternative mobile: tabbed by plan — switch between plans to see full feature list for each

### Plan Comparison Cards

**Use when:** Pricing page where each plan is a distinct offering with name, price, feature list, and CTA.

- Card per plan, side-by-side on desktop
- Recommended card: elevated (shadow, border, "Recommended" badge)
- CTA hierarchy: primary button on recommended plan, secondary on others
- Desktop: 3–4 cards side-by-side. Tablet: 2 per row. Mobile: stacked vertically, recommended plan first

---

## Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Lightbox with no close button (only Escape or click-outside) | X button + Escape + click outside |
| Auto-advancing slideshow in lightbox | User controls navigation speed in lightbox |
| Thumbnail grid with no alt text | Descriptive alt text on all images (WCAG 1.1.1) |
| JS masonry library for minor height variance | CSS Grid with `auto-fill` and `minmax` |
| `<div>` grid tables for comparison | Semantic `<table>` with `<th>`, `scope`, `<caption>` |
| Filter state not reflected in URL | `?category=value` in URL — shareable and back/forward-safe |
| Pricing toggle implemented as a checkbox | Use `role="radiogroup"` + `role="radio"` — it's binary choice, not on/off |
