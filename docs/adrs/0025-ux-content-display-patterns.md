# ADR-0025: UX Content Display Patterns

**Status**: Accepted
**Date**: 2026-03-21
**Supersedes**: N/A

---

## Context

ADR-0024 establishes universal UX interaction patterns — navigation, CTAs, feedback, form UX, responsive adaptation, keyboard/focus. What it doesn't cover is the **content display layer** — the interactive components that present, organize, and navigate content collections and structured information.

Without this, agents make ad-hoc decisions about carousel libraries, tab vs. accordion, table responsiveness, and gallery behavior. This ADR provides pattern knowledge and decision trees for **content display patterns** — components that go beyond static text and images to involve user-controlled views, state changes, and content navigation.

This is **Part 2** of a UX knowledge series:

| ADR                 | Scope                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| ADR-0024            | Core interaction patterns — navigation, CTAs, feedback, form UX, responsive, keyboard/focus |
| **ADR-0025** (this) | Content display — carousels, tabs, accordions, galleries, data tables, timelines, trees     |
| ADR-0026 (future)   | Application-specific — CRUD, dashboards, search, drag-and-drop                              |
| ADR-0027 (future)   | Component APIs — implementation code and component interfaces                               |

## Decision

**Adopt standardized content display patterns with decision trees for carousels, scrollable content, tabs, accordions, lightboxes, toggles, pagination, data tables, masonry, steppers, timelines, tree views, comparisons, and expandable cards. Pattern selection is driven by structural triggers — what the content structure and user task suggest.**

---

## Rules

| Rule                                                                                                   | Level      |
| ------------------------------------------------------------------------------------------------------ | ---------- |
| Use the decision trees in this ADR to select content display patterns — don't invent ad-hoc patterns   | **MUST**   |
| Every content display pattern must be keyboard accessible (ADR-0019, ADR-0024 §6)                      | **MUST**   |
| Carousels must have visible controls — never auto-advance-only with no user control                    | **MUST**   |
| Auto-playing carousels must pause on hover, focus, and when `prefers-reduced-motion: reduce` is active | **MUST**   |
| Tabs use Radix Tabs (via shadcn/ui) — don't build custom tab keyboard management                       | **MUST**   |
| Accordions use Radix Accordion (via shadcn/ui) — don't build custom disclosure keyboard management     | **MUST**   |
| Data tables with >5 columns must have a responsive strategy (horizontal scroll or card stack)          | **MUST**   |
| Pagination state must be reflected in the URL (`?page=N` or cursor param) for shareability             | **MUST**   |
| Every carousel, tab panel, and accordion content region must be announced to screen readers on change  | **MUST**   |
| Use `prefers-reduced-motion` to disable slide/scroll animations in carousels                           | **MUST**   |
| Prefer tabs over separate pages when content shares context and switching is frequent                  | **SHOULD** |
| Prefer accordion over tabs when content items are long and viewing multiple simultaneously is useful   | **SHOULD** |
| Use skeleton loading for async content within display patterns (ADR-0024 §3.6)                         | **SHOULD** |
| Animation timing and easing follow project transition defaults                                         | **MUST**   |
| UI primitives from ADR-0023 are used where they cover the use case                                     | **MUST**   |

---

## 1. Carousel / Slider

### 1.1 Carousel Type Decision Tree

```
What content is being displayed?
  → Hero images/banners (1 visible, full-width):
    → Hero slider — single slide visible, crossfade or slide transition
  → Product images (main view + alternatives):
    → Product gallery — main image + thumbnail strip (§1.4)
  → Testimonials or quotes:
    → Testimonial rotator — single card visible, auto-advance optional
  → Cards or teasers (multiple visible):
    → Card carousel — multiple slides visible, partial next-slide peek
  → Logo/partner strip:
    → Don't use a carousel — use horizontal scrollable content (§2)
```

### 1.2 Hero Slider

**When to use:** Landing pages or marketing pages with 2-6 hero banners competing for the same viewport slot. Each slide has an image, headline, and CTA.

**When NOT to use:** Single hero with no alternatives — just use a static hero section. More than 6 slides — users don't engage past 3-4; use a different content strategy.

**Pattern:**

- One slide visible at a time, full-width
- Transition: crossfade (preferred for images) or horizontal slide
- Indicator dots below showing total slides and current position
- Previous/Next arrow buttons on left and right edges
- Optional auto-advance (5-7 second interval) — must pause on hover/focus/touch and on `prefers-reduced-motion`
- First slide loads eagerly; subsequent slides use lazy loading (`loading="lazy"` on images)

**Accessibility:**

- Carousel region: `role="region"` with `aria-roledescription="carousel"` and `aria-label="Hero banner"`
- Each slide: `role="group"` with `aria-roledescription="slide"` and `aria-label="Slide 1 of 4"`
- Previous/Next buttons: `aria-label="Previous slide"` / `aria-label="Next slide"`
- Indicator dots: `role="tablist"` with each dot as `role="tab"` and `aria-selected` on current
- Auto-play: provide a visible pause/play button with `aria-label="Pause auto-rotation"` / `aria-label="Start auto-rotation"`
- Live region: `aria-live="polite"` on the slide container — announces slide changes (set to `"off"` during auto-play to avoid spamming screen readers)

**Responsive:**

- Desktop: Full-width with padding, arrows visible on sides
- Mobile: Full-width, arrows smaller or replaced by swipe gesture + dots
- Touch: swipe left/right to navigate — threshold distance before committing (ADR-0024 §5.3)
- Images: use `<picture>` with responsive `srcSet` or Next.js `<Image>` `sizes` prop

**Anti-patterns:**

- ❌ Auto-advancing with no pause control — violates WCAG 2.2.2 (Pause, Stop, Hide)
- ❌ No visible navigation controls (swipe-only) — keyboard users and desktop users can't navigate
- ❌ More than 6 slides — engagement drops sharply after 3-4; rethink content strategy
- ❌ Using carousel to hide content that should be always-visible — if all items are equally important, show them in a grid

### 1.3 Card Carousel (Multiple Visible)

**When to use:** Displaying a collection of cards (features, products, team members) where showing 3-4 at a time with the ability to browse is the right density.

**When NOT to use:** Fewer than 5 items — just show them all in a grid. Content where comparing items side-by-side matters — use a grid or table instead.

**Pattern:**

- Multiple slides visible (2-4 depending on breakpoint)
- Partial peek of next slide to signal scrollability
- Scroll snap to align slides on navigation
- Previous/Next buttons (optional: disable at boundaries for non-looping, or use `loop: true`)

**Accessibility:**

- Same ARIA pattern as hero slider — `role="region"`, `aria-roledescription="carousel"`
- Each card is a slide group with `role="group"`
- Arrow buttons visible and labeled
- Cards within slides must be individually focusable (links, buttons within cards)

**Responsive:**

- Desktop (≥1024px): 3-4 visible slides
- Tablet (768-1023px): 2-3 visible slides
- Mobile (<768px): 1-2 visible slides with peek of next

### 1.4 Product Image Gallery

**When to use:** Product detail pages where users need to view multiple images of the same item, zoom in, and switch between views.

**When NOT to use:** Single-image content. Image collections where all images are equally important (use masonry grid, §9).

**Pattern:**

- Main image area (large, dominant)
- Thumbnail strip below or beside the main image
- Click/tap thumbnail to switch main image
- Click main image to open lightbox (§5) for zoom
- Optional: hover-to-zoom lens on desktop (show magnified area on hover position)

#### Decision Tree — Thumbnail Layout

```
How many product images?
  → 2-4: Horizontal thumbnail strip below main image
  → 5-8: Horizontal scrollable thumbnail strip with overflow indicators
  → 9+: Grid thumbnail strip with "Show all" expansion, or use lightbox gallery navigation
```

**Accessibility:**

- Thumbnail strip: `role="tablist"`, each thumbnail `role="tab"` with `aria-selected`
- Main image: `role="tabpanel"` linked via `aria-labelledby` to active thumbnail
- Thumbnails show visible selection state (border, ring)
- Main image alt text describes the current view ("Product front view", "Product side angle")
- Zoom: accessible via keyboard — Enter opens lightbox from main image

**Responsive:**

- Desktop: Main image left/top, thumbnails right/below, hover-to-zoom
- Mobile: Main image top, swipeable (carousel behavior), thumbnail strip below with horizontal scroll
- Touch: tap main image for lightbox zoom instead of hover lens

**Reference:** Shopify product pages use main image + horizontal thumbnail strip with lightbox. Stripe hardware pages use a static gallery grid. Apple product pages use scroll-driven product spin.

### 1.5 Auto-Play Rules

Auto-play is the most abused carousel feature. These rules apply to ALL carousel variants:

| Rule                                                                | Requirement                                                     |
| ------------------------------------------------------------------- | --------------------------------------------------------------- |
| Pause on hover (desktop)                                            | **MUST**                                                        |
| Pause on focus (keyboard user tabs into carousel)                   | **MUST**                                                        |
| Pause on touch interaction (mobile)                                 | **MUST**                                                        |
| Visible play/pause button                                           | **MUST**                                                        |
| Respect `prefers-reduced-motion: reduce` — disable auto-advance     | **MUST**                                                        |
| Interval ≥ 5 seconds                                                | **SHOULD** — faster intervals don't let users read content      |
| Don't auto-play on mobile by default                                | **SHOULD** — mobile users scroll past; auto-play wastes battery |
| `aria-live="off"` during auto-play, `"polite"` when user-controlled | **MUST**                                                        |

---

## 2. Horizontal Scrollable Content

### 2.1 When to Use

Horizontal scroll is for **content rows** where items have equal weight and browsing left-to-right is natural: logo strips, card rows, category pills, feature previews.

**When NOT to use:** Primary content that users must see — hide-by-scrolling is information hiding. Vertical lists that work fine stacked. Navigation items (use proper nav patterns from ADR-0024 §1).

### 2.2 Pattern

- Container with `overflow-x: auto` and `scroll-snap-type: x mandatory`
- Each item: `scroll-snap-align: start` (or `center` for centered snap)
- Partial overflow peek: show 10-20% of next item to signal scrollability
- Optional Previous/Next buttons for non-touch users

### 2.3 Overflow Indicators

Overflow indicators signal that content extends beyond the visible area.

#### Decision Tree — Overflow Signal

```
Is the scroll container obviously scrollable (e.g., partial item peek)?
  → YES: Partial peek is sufficient — no extra indicator needed
  → NO: Add scroll shadow/fade on the overflow edge
    → Is there a control for non-touch users?
      → YES: Arrow buttons on edges (fade in when scrollable in that direction)
      → NO: Add arrow buttons — desktop users can't swipe
```

**Scroll shadows:** CSS gradient masks on left/right edges that appear/disappear based on scroll position. Use `scroll` event listener (throttled) or `IntersectionObserver` on sentinel elements at each end.

**Accessibility:**

- Container: `role="region"` with `aria-label="Partner logos"` (or similar descriptive label)
- If using arrow buttons: `aria-label="Scroll left"` / `aria-label="Scroll right"`, disabled when at boundary
- `tabindex="0"` on the scroll container so keyboard users can scroll with arrow keys
- Items within the scroll container follow normal tab order

**Responsive:**

- Desktop: Arrow buttons visible on hover + scroll with trackpad/mousewheel
- Mobile: Swipe naturally — hide arrow buttons, rely on partial peek + momentum scroll
- Ensure `scroll-padding` accounts for any sticky headers or side navigation

**Anti-patterns:**

- ❌ Hiding scrollbar on a container with no other scroll affordance — users don't know they can scroll
- ❌ Custom scrollbar styling that removes native scroll behavior
- ❌ Logo strip in a full carousel with arrows for 8 logos — just use a scrollable row

**Reference:** Vercel uses horizontal scroll card rows for feature showcases. Stripe uses scrollable code example tabs. GitHub uses horizontal scroll for repository topic tags.

---

## 3. Tabs

### 3.1 When to Use Tabs

Tabs organize content into mutually exclusive panels under a shared context. The user sees one panel at a time and switches between them.

#### Decision Tree — Tabs vs Alternatives

```
Are the content sections mutually exclusive (user views one at a time)?
  → YES: Is each section short enough to fit without scrolling?
    → YES: Tabs — switching is instant, context is preserved
    → NO: Is the user likely to compare sections?
      → YES: Accordion (§4) — multiple can be open simultaneously
      → NO: Tabs — long content is fine if sections are logically distinct
  → NO: Can the user benefit from seeing multiple sections at once?
    → YES: Accordion or visible sections with scroll-to-section nav (ADR-0024 §1.2)
    → NO: Separate pages — each section is a distinct route
```

```
Are there more than 6 tabs?
  → YES: Consider sub-navigation or separate pages instead
    → If tabs are essential: use scrollable tab bar with overflow
  → NO: Standard horizontal tab bar
```

### 3.2 Horizontal Tabs (Default)

**Pattern:**

- Tab list: horizontal row of tab triggers
- Content panel: single panel visible below tab list, switches on tab selection
- Active tab: visually distinct (underline, background color, bold text)
- URL sync (optional but recommended): `?tab=pricing` — allows direct linking and back/forward navigation

**Implementation:** Radix Tabs via shadcn/ui — handles keyboard navigation (`role="tablist"`, roving tabindex, Arrow keys) automatically.

**Accessibility:**

- Tab list: `role="tablist"` (automatic via Radix)
- Each tab: `role="tab"` with `aria-selected`, `aria-controls` pointing to panel
- Panel: `role="tabpanel"` with `aria-labelledby` pointing to its tab
- Keyboard: Left/Right arrows move between tabs, Home/End jump to first/last, Enter/Space activates
- Focus: tab selection can be automatic (focus = select) or manual (focus then Enter to select) — prefer automatic for ≤5 tabs, manual for more

**Responsive:**

- Desktop: All tabs visible in a single row
- Mobile (≤5 tabs): All tabs visible, smaller text, horizontally centered
- Mobile (>5 tabs): Horizontally scrollable tab bar with overflow indicator

### 3.3 Vertical Tabs

**When to use:** Settings pages, admin panels, documentation sidebars — where tab labels are longer and vertical space is available.

**When NOT to use:** Mobile-first designs (vertical tabs consume too much horizontal space on small screens).

**Pattern:**

- Tab list on the left (200-280px wide), content panel on the right
- Same ARIA structure as horizontal tabs — only the visual layout changes
- Active tab: background highlight or left border accent

**Responsive:**

- Desktop (≥1024px): Side-by-side layout (tabs left, panel right)
- Mobile (<1024px): Switch to horizontal tabs or accordion — vertical tabs don't work on narrow screens

### 3.4 Responsive Tab-to-Accordion

**When to use:** Content organized in tabs on desktop that needs to be navigable on mobile where horizontal space is limited and tab labels are long.

#### Decision Tree — Responsive Switch

```
Is the screen width <768px?
  → YES: Are tab labels short (1-2 words each)?
    → YES: Keep horizontal tabs — they fit on mobile
    → NO: Switch to accordion — each "tab" becomes a collapsible section
  → NO: Use horizontal or vertical tabs as designed
```

**Pattern:**

- Render Tabs component on desktop, Accordion component on mobile
- Use `useMediaQuery` or CSS container queries to switch
- Both share the same content — only the wrapper component changes
- State sync: active tab index maps to open accordion item index

**Anti-patterns:**

- ❌ Showing tabs so small they're unreadable on mobile — switch to accordion
- ❌ Building a custom responsive tab system instead of using two Radix components with a media query switch
- ❌ Losing URL sync during the switch — both Tabs and Accordion should reflect the same `?tab=` parameter

---

## 4. Accordion / Collapsible

### 4.1 When to Use

Accordions progressively disclose content — ideal when showing all content at once would overwhelm the user, but the content belongs on the same page (not separate routes).

#### Decision Tree — Accordion Variant

```
Can the user benefit from seeing multiple sections simultaneously?
  → YES: Multi-open accordion (multiple items expanded at once)
  → NO: Is this an FAQ or settings panel where one section at a time is sufficient?
    → YES: Single-open accordion (opening one closes others)
    → NO: Consider tabs (§3) if sections are mutually exclusive
```

### 4.2 FAQ Pattern

**When to use:** Help pages, product pages, and landing pages with frequently asked questions.

**Pattern:**

- Single-open accordion (1 item expanded at a time) — users typically scan questions sequentially
- Question as the trigger, answer as the collapsible content
- Chevron icon rotates on open/close
- Consider grouping questions by category with headings above each group

**Implementation:** Radix Accordion via shadcn/ui with `type="single"` and `collapsible={true}`.

**Accessibility:**

- Trigger: `<button>` with `aria-expanded` (automatic via Radix)
- Content: `role="region"` with `aria-labelledby` pointing to trigger (automatic via Radix)
- Keyboard: Enter/Space toggles, no arrow key navigation between items (each trigger is a separate Tab stop per Disclosure pattern — different from Tabs)

**Responsive:**

- Same layout on all breakpoints — accordion is inherently responsive
- Ensure trigger text doesn't truncate on mobile — wrap to multiple lines if needed

### 4.3 Settings / Form Groups

**When to use:** Settings pages or complex forms where sections group related fields (Account, Notifications, Privacy) and users edit one section at a time.

**Pattern:**

- Multi-open accordion (`type="multiple"`) — users may need to reference one section while editing another
- Section header shows a summary of current settings (e.g., "Notifications: Email, Push")
- Open state persisted in `localStorage` or URL — user returns to the same expanded state

### 4.4 Nested Accordions

**When NOT to use:** Almost always. Nested accordions (accordion inside accordion) create confusing hierarchy and poor keyboard navigation.

**Exception:** Documentation or deeply hierarchical FAQ where a category contains sub-categories. Limit to 2 levels maximum. Prefer tree view (§12) for 3+ levels.

**Anti-patterns:**

- ❌ 3+ levels of nested accordions — use tree view (§12) or separate pages
- ❌ Single-item accordion (one collapsible section on its own) — use a simple `<details>/<summary>` or a Collapsible component instead
- ❌ Accordion where all items should be visible (no progressive disclosure benefit) — use headed sections with scroll-to-section nav
- ❌ Accordion for primary navigation — use sidebar nav (ADR-0024 §1.5) or breadcrumbs

---

## 5. Lightbox / Modal Gallery

### 5.1 When to Use Lightbox

#### Decision Tree — Lightbox vs Inline

```
Does the user need to see the image at full resolution or detail?
  → YES: Is the image part of a collection the user browses sequentially?
    → YES: Lightbox gallery — full-screen overlay with prev/next navigation
    → NO: Lightbox single — full-screen overlay, close to return
  → NO: Is the image supplementary (illustrating text)?
    → YES: Inline — no lightbox needed, image at natural size
    → NO: Expandable card (§14) — inline expand for more context
```

### 5.2 Image Lightbox

**When to use:** Galleries, portfolios, product images — anywhere users need to inspect images at full resolution.

**Pattern:**

- Click/tap image to open full-screen overlay (dark background, 90-95% opacity)
- Image scales to fit viewport with padding (not cropped)
- Close: X button (top-right), Escape key, click outside image, swipe down (mobile)
- Gallery navigation: Previous/Next arrows, swipe left/right, keyboard Left/Right arrows
- Counter: "3 / 12" position indicator
- Optional: zoom on double-tap/scroll, pinch-to-zoom on mobile

**Accessibility:**

- Lightbox container: `role="dialog"` with `aria-label="Image gallery"` and `aria-modal="true"`
- Focus trap: Tab cycles through Close, Previous, Next buttons (and image if zoomable)
- Image: `alt` text describing the image — same alt as the thumbnail
- Navigation: `aria-label="Previous image"` / `aria-label="Next image"`
- Counter: `aria-live="polite"` — announces "Image 3 of 12" on navigation
- Escape closes lightbox, focus returns to the thumbnail that opened it (ADR-0024 §6.6)

**Responsive:**

- Desktop: Centered image with visible arrows on sides, X button top-right
- Mobile: Full-screen image, swipe navigation, X button or swipe-down to close
- Touch: pinch-to-zoom if zoom is supported

**Anti-patterns:**

- ❌ Lightbox that takes >300ms to open (feels broken) — preload adjacent images
- ❌ No close button (only Escape or click-outside) — mobile users have no Escape key
- ❌ Lightbox for non-image content that should be a page (long text, forms)
- ❌ Auto-advancing gallery in lightbox — user controls navigation in lightbox, always

### 5.3 Video Lightbox

**When to use:** Video thumbnails that play full-screen when clicked — promotional videos, product demos, tutorials.

**Pattern:**

- Thumbnail with play button overlay (centered, semi-transparent)
- Click opens lightbox with video player filling the overlay
- Video auto-plays on open (muted if autoplay policies require it)
- Close button and Escape close the lightbox and pause/stop the video
- Don't load the video player until lightbox opens — use a static thumbnail + play button as the trigger

**Accessibility:**

- Play button on thumbnail: `aria-label="Play video: [video title]"`
- Lightbox: same dialog pattern as image lightbox
- Video player: native controls visible, keyboard accessible (Space to play/pause, arrow keys for seek)
- Captions/subtitles available if the video has spoken content (WCAG 1.2.2)

---

## 6. Toggle / Switch Content

### 6.1 Pricing Toggle (Monthly/Annual)

**When to use:** Pricing pages with two billing intervals where showing both simultaneously clutters the layout.

**Pattern:**

- Segmented control or toggle switch with two options: "Monthly" / "Annual"
- Switching updates all visible prices instantly (no page reload)
- Highlight the savings: "Save 20%" badge near the Annual option
- Default to Annual (higher conversion) or Monthly (transparent — user's choice; A/B test)

**Implementation:** Use a segmented control (`role="radiogroup"` with `role="radio"` items) — not a checkbox toggle, because it's choosing between two values, not on/off.

**Accessibility:**

- Segmented control: `role="radiogroup"` with `aria-label="Billing period"`
- Each option: `role="radio"` with `aria-checked`
- Price change: `aria-live="polite"` on the pricing container — announces new prices
- Keyboard: Arrow keys switch between options (roving tabindex)

**Responsive:**

- Toggle stays centered above pricing cards on all breakpoints
- Pricing cards stack vertically on mobile

### 6.2 List/Grid View Switcher

**When to use:** Content collections (products, files, projects) where users benefit from choosing information density.

**Pattern:**

- Two icon buttons: grid icon and list icon
- Persist preference in `localStorage` (per ADR-0020 escalation)
- Grid: card layout, emphasis on images/thumbnails
- List: row layout, emphasis on text details/metadata
- Transition: use `AnimatePresence` layout animation for smooth switch, or instant swap

**Accessibility:**

- Switcher: `role="radiogroup"` with `aria-label="View mode"`
- Each button: `role="radio"` with `aria-checked` and `aria-label="Grid view"` / `aria-label="List view"`
- Content region: `aria-live="polite"` — announces "Showing grid view" / "Showing list view" on switch

**Responsive:**

- Default to grid on mobile (space-efficient), list on desktop (detail-rich) — but allow override
- Persist user preference across sessions

### 6.3 Before/After Comparison Slider

**When to use:** Comparing two states of the same visual — photo editing before/after, redesign old/new, renovation progress.

**When NOT to use:** Comparing unrelated images. Content where side-by-side is better (different aspect ratios, different subjects).

**Pattern:**

- Two overlapping images at the same dimensions
- Draggable divider line (vertical or horizontal) controlled by mouse/touch
- Divider position reveals more of one image or the other
- Labels on each side: "Before" / "After"

**Accessibility:**

- Divider: `role="slider"` with `aria-label="Comparison slider"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow` reflecting percentage
- Keyboard: Left/Right arrows move the divider in increments (5-10%)
- Both images have descriptive `alt` text
- Fallback for no-JS: show both images stacked with labels

**Responsive:**

- Same interaction on all breakpoints
- Touch: drag the divider handle — ensure handle is ≥44px for tap target (ADR-0024 §5.1)
- Vertical divider for landscape images, horizontal divider for portrait images

### 6.4 Content Variant Selector

**When to use:** Showing the same content in different variants — code in multiple languages, a component in different themes, a recipe in metric/imperial.

**Pattern:**

- Tab-like selector above the content area (but content is the SAME structure with different values, not different content)
- Selection persisted across page — if user selects "TypeScript" once, all code blocks show TypeScript
- Use a global preference store (Zustand per ADR-0020) if preference is site-wide

**Accessibility:**

- Selector: `role="radiogroup"` or Tabs (`role="tablist"`) — tabs if the selector looks like tabs
- Content region updates: `aria-live="polite"`

---

## 7. Pagination

ADR-0024 §3.10 covers infinite scroll and load-more behavioral patterns. This section covers the **data-oriented pagination** decision tree — when to use numbered pagination, load-more, or infinite scroll based on the data and user task.

### 7.1 Pagination Strategy Decision Tree

```
What is the user's primary task?
  → Browsing/discovery (social feed, news, inspiration):
    → Infinite scroll — continuous flow matches browse behavior
  → Searching with intent (looking for a specific result):
    → Numbered pagination — user needs to revisit page 3, share "results page 5"
  → Catalog browsing (products, listings):
    → Load-more button — user controls pace, URL reflects results count
  → Admin/dashboard tables:
    → Numbered pagination — predictable, matches data table UX
```

### 7.2 Numbered Pagination

**When to use:** Search results, data tables, admin panels, any content where position in the dataset matters and direct page access is useful.

**Pattern:**

- Show: First, Previous, current-range (e.g., 3 4 **5** 6 7), Next, Last
- Ellipsis for gaps: 1 … 4 5 **6** 7 8 … 42
- Current page visually distinct (filled background, bold)
- URL: `?page=6` — critical for shareability and back/forward navigation
- Disable Previous on page 1, disable Next on last page (don't hide — disable with `aria-disabled`)

#### Decision Tree — Page Range Display

```
How many total pages?
  → ≤7: Show all page numbers — no ellipsis needed
  → 8-20: Show first, last, and 2 neighbors of current: 1 … 4 5 [6] 7 8 … 20
  → 20+: Same pattern, but add "Jump to page" input for direct access
```

**Accessibility:**

- Pagination wrapper: `<nav aria-label="Pagination">`
- Current page: `aria-current="page"` on the active link/button
- Previous/Next: `aria-label="Go to previous page"` / `aria-label="Go to next page"`
- Page links: `aria-label="Go to page 6"` (not just "6")
- Disabled buttons: `aria-disabled="true"` (not removed from DOM)

**Responsive:**

- Desktop: Full page range with ellipsis
- Mobile: Compact — Previous/Next buttons + current page indicator ("Page 6 of 42") + optional page jump

### 7.3 Cursor-Based Pagination

**When to use:** Real-time data where items are inserted/deleted frequently (chat, activity logs), or large datasets where offset pagination is expensive.

**When NOT to use:** When users need random access to any page. When total count is needed for UI display.

**Pattern:**

- API returns `nextCursor` (opaque string) instead of page numbers
- "Load more" or infinite scroll uses the cursor to fetch the next batch
- No total page count displayed (total is unknown or expensive to compute)
- URL: `?cursor=abc123` (optional — cursor URLs are not human-readable)
- Back navigation: store previous cursors in a stack for "Previous" support

**Anti-pattern:** Displaying page numbers with cursor-based pagination — the cursor is an opaque token, not a page number. Use load-more or infinite scroll instead.

### 7.4 Results Summary

Always show a results summary above paginated content:

| Context      | Summary Format                             |
| ------------ | ------------------------------------------ |
| Known total  | "Showing 41-60 of 156 results"             |
| Filtered     | "12 results for 'design'"                  |
| Load-more    | "Showing 60 of 156 results — Load more"    |
| Cursor-based | "Showing 60 results" (no total)            |
| Empty        | Empty state (ADR-0024 §3.5 search variant) |

---

## 8. Data Tables

### 8.1 When to Use Tables

**When to use:** Structured data with consistent columns where users compare rows, sort by attributes, or perform bulk actions.

**When NOT to use:** Unstructured content — use cards. Data with 1-2 attributes per item — use a list. Primarily visual content (images) — use a grid.

#### Decision Tree — Table Complexity

```
How many columns?
  → 1-3: Simple list layout — a table is overkill
  → 4-8: Standard table — sortable columns, optional filtering
  → 9+: Complex table — column visibility toggle, horizontal scroll, or split into tabs
```

```
Does the user need to act on rows?
  → YES: Bulk actions?
    → YES: Row selection (checkboxes) + bulk action bar
    → NO: Inline action buttons or row-click-to-detail
  → NO: Read-only table — simpler implementation
```

### 8.2 Sortable Columns

**Pattern:**

- Click column header to sort ascending → click again for descending → click again for unsorted (three-state cycle)
- Sort icon: ▲ ascending, ▼ descending, ⇅ unsortable (neutral)
- Only one column sorted at a time (unless advanced multi-sort is needed)
- Sort state in URL: `?sort=name&order=asc` for shareability

**Accessibility:**

- Column header: `<th>` with `<button>` inside (the sort trigger)
- `aria-sort="ascending"` / `aria-sort="descending"` / `aria-sort="none"` on the `<th>`
- Sort button: `aria-label="Sort by Name, currently ascending"`
- Announce sort change via `aria-live` region or rely on `aria-sort` attribute updates

### 8.3 Filterable Rows

**Pattern:**

- Filter bar above the table: dropdown selects, search input, or filter chips
- Active filters shown as removable chips: "Status: Active ✕"
- "Clear all filters" button when any filter is active
- Filter state in URL: `?status=active&role=admin`
- Results count updates live: "Showing 12 of 156 results"

**Accessibility:**

- Filter inputs: standard form controls with labels (ADR-0012)
- Filter chips: `<button>` with `aria-label="Remove filter: Status Active"`
- Table region: `aria-live="polite"` — announces filtered count change
- "Clear all filters": visible button, keyboard accessible

### 8.4 Row Selection & Bulk Actions

**Pattern:**

- Checkbox in first column of each row
- Header checkbox: select all / deselect all (with indeterminate state when some are selected)
- Bulk action bar: appears above the table when ≥1 row is selected — "3 selected: Delete | Export | Assign"
- Selection count: "3 of 156 selected" — or "All 156 selected" with "Select all results" link when full page is checked

**Accessibility:**

- Row checkbox: `aria-label="Select row: [primary identifier]"` (e.g., "Select row: John Doe")
- Header checkbox: `aria-label="Select all rows"` with `aria-checked="mixed"` for indeterminate
- Bulk action bar: `role="toolbar"` with `aria-label="Bulk actions"` — focus moves to toolbar when selection starts
- Announce: "3 rows selected" via live region when selection changes

### 8.5 Responsive Table Patterns

#### Decision Tree — Responsive Strategy

```
Is the table narrow enough for mobile (≤5 short columns)?
  → YES: Table renders normally — no special treatment
  → NO: Is the data structured for row-by-row reading?
    → YES: Card stack — each row becomes a card with label-value pairs
    → NO: Is column comparison (scanning vertically) important?
      → YES: Horizontal scroll with sticky first column
      → NO: Card stack with priority columns visible, secondary in expandable detail
```

**Horizontal scroll with sticky column:**

- Wrap `<table>` in `overflow-x: auto` container
- First column (identifier): `position: sticky; left: 0` with background color and shadow on scroll
- Scroll indicator: subtle shadow/fade on right edge when content overflows

**Card stack:**

- Each row becomes a card
- Column headers become labels in label-value pairs within the card
- Primary data (name, title) is prominent; secondary data is smaller
- Actions (edit, delete) become card footer actions or kebab menu (⋮)

**Accessibility (horizontal scroll):**

- Scroll container: `tabindex="0"` with `role="region"` and `aria-label="Scrollable table: [table title]"`
- Ensure keyboard users can scroll (arrow keys within the focused region)
- `<caption>` on the `<table>` element describing its purpose

**Reference:** GitHub uses horizontal scroll for large comparison tables. Stripe uses card stack for mobile transaction tables. Linear uses horizontal scroll with sticky columns for issue tables.

### 8.6 Inline Editing

**When to use:** Data the user frequently updates in place — status changes, quick notes, simple value edits. Saves navigating to a detail page for trivial changes.

**When NOT to use:** Complex edits requiring validation (use a modal or detail page). Edits that need confirmation (use confirmation dialog per ADR-0024 §3.4).

**Pattern:**

- Cell displays value; click/Enter activates edit mode (input replaces display text)
- Escape cancels edit, Enter/blur saves
- Optimistic update (ADR-0024 §3.7) — show new value immediately, revert on error

**Accessibility:**

- Edit trigger: `aria-label="Edit [column]: [current value]"` on the cell or edit button
- Edit mode: input auto-focused with current value selected
- Save/cancel: Enter saves, Escape cancels — announce result via toast (ADR-0024 §3.2) or inline status

### 8.7 Library Recommendation

**TanStack Table** — headless table library. Provides sorting, filtering, pagination, row selection, column resizing, and row grouping logic without any UI. You render the table with your own markup and Tailwind classes. Actively maintained, ~15kB gzipped.

- Compatible with ADR-0002 (headless, no CSS)
- Pairs with shadcn/ui's `<Table>` primitive for rendering
- Install when a table needs sorting, filtering, or selection — don't use for simple static tables

---

## 9. Masonry / Grid with Filtering

### 9.1 When to Use Masonry

**When to use:** Image galleries, portfolio items, blog cards with variable content heights — where a uniform grid wastes space with gaps.

**When NOT to use:** Content with equal height (use CSS Grid with fixed rows). Tabular data (use tables, §8). Fewer than 6 items (use a simple grid).

#### Decision Tree — Layout Strategy

```
Are all items the same height?
  → YES: CSS Grid with fixed rows — simpler, no JS needed
  → NO: Is the height variance significant (>30% difference)?
    → YES: Masonry layout — items fill vertical gaps
    → NO: CSS Grid with `auto-fill` and `minmax` — minor gaps are acceptable
```

### 9.2 CSS Grid Masonry (Preferred)

CSS `masonry` value for `grid-template-rows` is the native solution. As of 2026, browser support is growing but not universal.

**Progressive enhancement strategy:**

1. Default: CSS Grid with `auto-fill` and fixed rows (works everywhere)
2. Enhancement: `@supports (grid-template-rows: masonry)` — use native masonry
3. Fallback JS: If native masonry is unsupported and the layout impact is significant, use CSS multi-column or a lightweight JS solution

**Anti-pattern:** Don't reach for a JS masonry library (Masonry.js, Isotope) when CSS Grid with minor height variance is acceptable. JS masonry causes layout recalculation on resize and adds bundle weight.

### 9.3 Category Filter Bar

**When to use:** Content collections with taxonomy (categories, tags, types) where the user benefits from narrowing the visible set.

**Pattern:**

- Horizontal row of filter buttons/pills above the grid
- "All" is the default selected state
- Click a filter: fade out non-matching items, fade in matching items (AnimatePresence)
- Multiple selection (optional): toggle multiple categories on, show intersection or union
- URL state: `?category=design` (per ADR-0020, URL is the source of truth for filters)

**Accessibility:**

- Filter bar: `role="toolbar"` with `aria-label="Filter by category"`
- Each filter: `<button>` with `aria-pressed="true"` / `"false"` for toggle filters
- Grid region: `aria-live="polite"` — announces "Showing 8 items" on filter change
- If using checkboxes for multi-select: standard `<input type="checkbox">` with visible labels

**Responsive:**

- Desktop: Full horizontal row of filter pills
- Mobile: Horizontally scrollable pill row (§2 horizontal scroll pattern) or dropdown select

**Reference:** Dribbble uses category filters above a masonry grid. Notion gallery views use filter chips. Behance uses horizontal filter pills for category browsing.

---

## 10. Stepper / Wizard Indicators

ADR-0024 §4.5 covers the form UX of multi-step wizards (validation, back/next, draft saving). This section covers the **step indicator display pattern** — the visual progress component.

### 10.1 Step Indicator Variants

| Variant              | Visual                                  | When to Use                                                 |
| -------------------- | --------------------------------------- | ----------------------------------------------------------- |
| **Numbered steps**   | Circles with numbers + connecting lines | ≤6 steps with clear labels                                  |
| **Progress bar**     | Filled bar with percentage/step count   | Steps where individual step identity doesn't matter         |
| **Breadcrumb steps** | Clickable step labels in a row          | Non-linear flows where users can jump to any completed step |
| **Compact dots**     | Dots (like carousel indicators)         | Mobile, or when step count matters but labels don't         |

#### Decision Tree — Step Indicator Type

```
Can the user jump to any completed step?
  → YES: Breadcrumb-style clickable steps — each completed step is a link
  → NO: Is the flow strictly linear?
    → YES: Are there ≤6 steps with meaningful labels?
      → YES: Numbered steps with labels
      → NO: Progress bar with "Step 2 of 8" text
    → NO: Numbered steps — completed are checkmarked, future are disabled
```

### 10.2 Step States

| State         | Visual                                     | Behavior                                             |
| ------------- | ------------------------------------------ | ---------------------------------------------------- |
| **Completed** | Checkmark icon, filled/success color       | Clickable (if non-linear), or static                 |
| **Current**   | Highlighted ring/fill, step number or icon | Active — form fields visible                         |
| **Future**    | Muted/gray, number or empty circle         | Not clickable (linear) or disabled (non-linear)      |
| **Error**     | Error color ring, warning icon             | Step has validation errors — user must return to fix |

**Accessibility:**

- Step list: `role="list"` with `aria-label="Checkout progress"` (or use `<ol>`)
- Each step: `aria-current="step"` on the current step
- Completed steps (clickable): `<a>` or `<button>` with `aria-label="Step 1: Shipping — completed"`
- Future steps (non-clickable): `aria-disabled="true"` with `aria-label="Step 3: Review — not yet available"`
- Error steps: `aria-label="Step 2: Payment — has errors"`

**Responsive:**

- Desktop: Full horizontal stepper with labels
- Mobile: Compact — current step label + "Step 2 of 4" + progress dots/bar
- Don't try to fit long labels on mobile — abbreviate or use numbers only

**Reference:** Stripe Checkout uses a clean 3-step indicator (Shipping → Payment → Review). Shopify uses a numbered stepper in their checkout flow. Linear doesn't use steppers — their flows are mostly single-page.

---

## 11. Timeline / Chronological

### 11.1 When to Use

**When to use:** Activity history, changelog, project milestones, process documentation — any ordered sequence of events with dates/timestamps.

**When NOT to use:** Unordered content (use a list or grid). Steps in a process (use stepper, §10). Navigation (use sidebar or breadcrumbs, ADR-0024).

### 11.2 Vertical Timeline

**When to use:** Most timelines. Works on all screen sizes. Natural reading order (top = newest or oldest).

**Pattern:**

- Central line (or left-aligned line) connecting timeline nodes
- Each node: date/time label + event content (title, description, optional icon)
- Alternating sides (desktop, optional): odd items left, even items right of the center line
- Icons on nodes indicate event type (success, error, info, milestone)

**Accessibility:**

- Timeline: `<ol>` (ordered list) with `aria-label="Activity timeline"`
- Each event: `<li>` with date as `<time datetime="2026-03-21T14:30:00Z">`
- Visual line and icons are decorative: `aria-hidden="true"` — screen readers get the ordered list
- Don't use `role="tree"` for a timeline — it's a flat ordered sequence

**Responsive:**

- Desktop: Alternating or centered layout
- Mobile: Left-aligned single-column — all events on the right side of the line

### 11.3 Horizontal Timeline

**When to use:** Milestones with few items (3-8) where the horizontal flow matches a left-to-right progression (project phases, release timeline).

**When NOT to use:** Many items (>8) — horizontal scroll becomes tedious. Detailed event content — horizontal constraints prevent long text.

**Pattern:**

- Horizontal line with evenly spaced nodes
- Labels above or below the line
- Active/current milestone highlighted
- Horizontal scrollable if items overflow (§2 pattern)

**Responsive:**

- Desktop: Horizontal layout
- Mobile: Switch to vertical timeline — horizontal timelines don't fit on narrow screens

**Anti-patterns:**

- ❌ Horizontal timeline with >8 items — too much scrolling, use vertical
- ❌ Timeline without dates — timestamps give meaning to the sequence
- ❌ Using timeline for navigation — use breadcrumbs or stepper

---

## 12. Tree View / Hierarchical

### 12.1 When to Use

**When to use:** Hierarchical data with 3+ nesting levels — file browsers, category selectors, documentation navigation, organization charts.

**When NOT to use:** Flat lists (1 level) — use a simple list. Two levels — use grouped list or accordion. Navigation with ≤10 items — use sidebar nav (ADR-0024 §1.5).

### 12.2 Pattern

- Indented tree with expand/collapse triangles (▸/▾) on nodes with children
- Click triangle to expand/collapse; click node label to select
- Selected node: visually highlighted (background color)
- Optional: multi-select with checkboxes on each node

**Accessibility:**

- Tree container: `role="tree"` with `aria-label="File browser"`
- Each node: `role="treeitem"` with `aria-expanded="true"` / `"false"` (if has children)
- Nesting: `role="group"` wrapping child items
- Keyboard: Arrow Up/Down move between visible items, Arrow Right expands or moves to first child, Arrow Left collapses or moves to parent, Home/End jump to first/last visible item, Enter selects
- Type-ahead: typing characters jumps to the next matching item

**Responsive:**

- Same tree on all breakpoints — indentation may decrease slightly on mobile
- On mobile, ensure expand/collapse triggers meet touch target size (44px)
- Consider off-canvas tree (drawer) on mobile if the tree is wide

**Anti-patterns:**

- ❌ Deeply nested tree without search — users get lost after 4-5 levels; add search/filter
- ❌ Tree with hundreds of expanded nodes — lazy-load children on expand
- ❌ Custom tree keyboard navigation instead of following WAI-ARIA Tree pattern

**Reference:** GitHub uses tree view for repository file browsing. VS Code's explorer is a tree view. Notion uses a tree view for its page hierarchy sidebar.

---

## 13. Comparison Patterns

### 13.1 Feature Comparison Table

**When to use:** SaaS pricing pages, product comparisons — structured comparison of features across 2-4 options.

**Pattern:**

- Columns: one per plan/product (plus a left column for feature names)
- Rows: grouped by feature category with section headers
- Cell values: checkmark (included), dash (not included), or specific value ("10 GB", "Unlimited")
- Sticky header row: plan names stay visible while scrolling
- Highlighted column: recommended/popular plan gets a visual accent (border, background, "Most Popular" badge)

**Accessibility:**

- Use `<table>` with proper `<thead>`, `<tbody>`, `<th>` structure — not a grid of divs
- `<caption>` describing the table purpose
- Checkmarks: use visually hidden text "Included" / "Not included" alongside icons — icons alone aren't accessible
- `scope="col"` on column headers, `scope="row"` on row feature names
- Sticky header: ensure focus order isn't disrupted

**Responsive:**

- Desktop: Full table with all columns visible
- Mobile: Horizontal scroll with sticky first column (feature names) — same pattern as §8.5
- Alternative mobile: Tab per plan — switch between plans to see feature list for each

### 13.2 Plan Comparison Cards

**When to use:** Pricing pages where each plan is a distinct offering with name, price, feature list, and CTA.

**Pattern:**

- Card per plan, side-by-side on desktop
- Each card: plan name, price, feature bullet list, CTA button
- Popular/recommended card: elevated (shadow, border, "Recommended" badge)
- CTA hierarchy: primary on recommended plan, secondary on others (ADR-0024 §2.1)

**Responsive:**

- Desktop: 3-4 cards side-by-side
- Tablet: 2 cards per row, third card below
- Mobile: Stacked vertically, recommended plan first

### 13.3 Before/After Slider

Covered in §6.3 (Toggle / Switch Content).

---

## 14. Expandable Cards

### 14.1 When to Use

#### Decision Tree — Expand vs Navigate

```
Is the detail content short (1-2 paragraphs, a few fields)?
  → YES: Inline expand — card grows to show detail, then collapses
  → NO: Is the detail content a full entity view (profile, product detail)?
    → YES: Navigate to detail page — expand would create a page within a page
    → NO: Is the user browsing multiple cards and comparing?
      → YES: Inline expand — avoids losing grid context by navigating away
      → NO: Navigate to detail page
```

### 14.2 Inline Expand

**When to use:** Card grids where clicking a card reveals additional detail inline — project cards showing description, team cards showing bio, event cards showing schedule.

**Pattern:**

- Card shows preview state (image, title, short description)
- Click/Enter expands the card — additional content slides down or the card grows in place
- Other cards reflow around the expanded card (or the expanded card overlays on mobile)
- Close: click card again, close button, or Escape key
- Only one card expanded at a time (accordion-like behavior in a grid)

**Accessibility:**

- Card trigger: `<button>` or card wrapper with `role="button"` and `aria-expanded`
- Expanded content: `role="region"` with `aria-labelledby` pointing to card title
- Focus: move focus to the expanded content on open, return to card on close
- Keyboard: Enter to expand, Escape to collapse

**Responsive:**

- Desktop: Card expands in-place within the grid, pushing other cards down
- Mobile: Card expands to full-width or navigates to detail (if content is substantial)

### 14.3 Card Flip

**When to use:** Cards with two distinct faces — contact cards (photo front, details back), game tiles, flashcards for learning.

**When NOT to use:** Content where both sides should be simultaneously visible. Progressive disclosure where expand is more natural.

**Pattern:**

- Card has front and back face
- Click/hover triggers 3D flip animation (use `rotateY` on GPU-composited layer)
- Back face content is different from front (not just "more of the same")

**Accessibility:**

- Both faces must be accessible to screen readers — don't use `backface-visibility: hidden` on the content container (only on the visual flip wrapper)
- Alternative: `aria-describedby` on the front face linking to the back face content
- Or: present both faces as visible sections to screen readers, only using the flip for visual effect
- Ensure keyboard focus works: Enter/Space to flip, content on both sides is tab-accessible

**Anti-patterns:**

- ❌ Card flip that hides critical information on the back — users might not discover the flip interaction
- ❌ Auto-flipping cards — annoying and breaks screen reader focus
- ❌ Flip triggered only by hover — not available on touch devices (same issue as ADR-0024 §5.2)
- ❌ Using card flip for long content — the back face has the same size as the front; if content doesn't fit, use inline expand

---

## 15. Anti-Patterns

### Carousel / Slider

| ❌ Don't                                      | ✅ Do                                              | Why                                                                |
| --------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| Auto-advance without pause button             | Provide visible play/pause + pause on hover/focus  | WCAG 2.2.2 violation — users must control time-based content       |
| Carousel for ≤3 items                         | Show all items in a grid — no need to hide content | Carousel adds interaction cost for no benefit                      |
| Swipe-only navigation (no buttons)            | Provide Previous/Next buttons alongside swipe      | Keyboard and desktop users can't swipe                             |
| Ten-slide carousel no one clicks past slide 3 | Show top 3-4 in a visible grid, link to "View all" | Data consistently shows carousel engagement drops after 3-4 slides |

### Tabs & Accordions

| ❌ Don't                          | ✅ Do                                           | Why                                                                 |
| --------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| More than 7 tabs crammed in a row | Scrollable tab bar, or switch to separate pages | Tabs become unreadable and untappable                               |
| Accordion for primary navigation  | Use sidebar nav (ADR-0024 §1.5)                 | Accordion hides nav — users must open each to discover destinations |
| Nested accordion 3+ levels deep   | Use tree view (§12) for deep hierarchy          | Deep nesting creates confusing keyboard navigation                  |
| Tabs that look like buttons       | Use standard tab styling (underline active tab) | Users don't realize they're tabs and expect button behavior         |

### Data Tables

| ❌ Don't                                          | ✅ Do                                                         | Why                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Grid of `<div>` elements pretending to be a table | Use semantic `<table>` with `<th>`, `<tr>`, `<td>`            | Screen readers can't navigate div-tables; semantic HTML is required (ADR-0019)     |
| Hide table on mobile with no alternative          | Horizontal scroll with sticky column, or card stack           | Mobile users can't access the data                                                 |
| Sort icon that's just decorative                  | Make sort trigger a `<button>` inside `<th>` with `aria-sort` | Decorative sort icons suggest functionality that doesn't exist or isn't accessible |
| Load entire 10,000-row dataset client-side        | Use server-side pagination or virtual scrolling               | Browser freezes, memory exhaustion, long initial load                              |

### Gallery & Lightbox

| ❌ Don't                             | ✅ Do                                      | Why                                                                |
| ------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------ |
| Lightbox with no close button        | X button + Escape key + click outside      | Mobile users have no Escape key; click-outside is undiscoverable   |
| Auto-advancing slideshow in lightbox | User controls navigation speed in lightbox | User opened lightbox to inspect — auto-advance fights their intent |
| Thumbnail grid with no alt text      | Descriptive alt text on all images         | Screen readers see nothing without alt text (WCAG 1.1.1)           |

### Pagination

| ❌ Don't                                            | ✅ Do                                                | Why                                              |
| --------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| Page numbers as plain text instead of links/buttons | Each page number is a link or button                 | Keyboard users can't navigate to other pages     |
| Infinite scroll on pages with footer content        | Use load-more button, or place footer in the sidebar | Footer becomes unreachable (ADR-0024 §3.10)      |
| Pagination with no URL state                        | Reflect `?page=N` in URL                             | Users can't share, bookmark, or use back/forward |

### General

| ❌ Don't                                                                     | ✅ Do                                             | Why                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| JS masonry library for minor height variance                                 | CSS Grid with `auto-fill` and `minmax`            | JS masonry recalculates layout on resize; CSS Grid is faster and simpler |
| Deep nesting of interactive patterns (carousel inside accordion inside tabs) | Max 1 level of nesting for interactive containers | Keyboard navigation becomes impossible to predict                        |
| Content display patterns without `prefers-reduced-motion` support            | All animated transitions respect reduced motion   | Motion-sensitive users experience nausea from slide/scroll animations    |

---

## Library Compatibility

| Library                                                                     | Status        | Purpose                                                                                      | Notes                                                                                                                                     |
| --------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Radix Tabs (via shadcn/ui)                                                  | `recommended` | Tab list, tab panels, keyboard navigation (roving tabindex)                                  | Pre-approved in ADR-0002/ADR-0023. Handles all WAI-ARIA Tabs pattern requirements automatically                                           |
| Radix Accordion (via shadcn/ui)                                             | `recommended` | Single-open / multi-open accordion, disclosure pattern                                       | Pre-approved in ADR-0002/ADR-0023. Handles Disclosure WAI-ARIA pattern automatically                                                      |
| Radix Collapsible (via shadcn/ui)                                           | `recommended` | Single collapsible section (non-accordion)                                                   | Simpler than Accordion when you just need one collapse                                                                                    |
| Radix Dialog (via shadcn/ui)                                                | `recommended` | Lightbox overlay and focus trap                                                              | Pre-approved. Lightbox is a Dialog with image content                                                                                     |
| Embla Carousel (via shadcn/ui)                                              | `recommended` | Headless carousel engine — all carousel variants                                             | ~6kB, headless, Tailwind-native. shadcn/ui Carousel wraps Embla. Best when full design control is needed                                  |
| Swiper                                                                      | `compatible`  | Feature-rich slider with pre-built UI (navigation, pagination, thumbs, parallax, 3D effects) | ~40-50kB, ships own CSS (static files, not runtime). Use when built-in UI saves dev time and overrides stay shallow. A11y module included |
| TanStack Table                                                              | `compatible`  | Headless data table with sorting, filtering, pagination, selection                           | ~15kB, headless, no CSS. Install when tables need sorting/filtering — not for static tables                                               |
| Framer Motion (via `motion/react`)                                          | `recommended` | Filter transitions, expand animations, carousel enter/exit, card flip                        | Use AnimatePresence for filter transitions and layout animations                                                                          |
| Masonry.js / Isotope                                                        | `forbidden`   | JS masonry layout                                                                            | CSS Grid with `@supports (grid-template-rows: masonry)` preferred. JS masonry causes layout recalc and adds unnecessary bundle weight     |
| Any CSS-in-JS table library (MUI DataGrid, Mantine Table, AG Grid with MUI) | `forbidden`   | —                                                                                            | Violates ADR-0002 (no CSS-in-JS runtime). Use TanStack Table + own markup                                                                 |

### Carousel Library Decision Tree

```
Do you need full design control with project tokens driving every visual aspect?
  → YES: Embla Carousel (via shadcn/ui Carousel) — headless, you build all UI
  → NO: Do you need pre-built navigation, pagination, thumbs, effects out of the box?
    → YES: Is the built-in UI close enough that you only need shallow overrides (colors, spacing)?
      → YES: Swiper — saves significant dev time with batteries-included UI
      → NO: Embla — trying to deeply restyle Swiper's built-in CSS is more work than building from scratch
    → NO: Embla — simpler, lighter, more control
```

---

## Consequences

**Positive:**

- Agents and developers have decision trees for every content display pattern — no ad-hoc guessing about carousel type, tab vs accordion, or table responsiveness
- Two-tier carousel recommendation (Embla default, Swiper for advanced use) gives flexibility without violating styling constraints
- Every pattern includes accessibility requirements specific to the component (carousel ARIA, tree keyboard nav, table semantics)
- Pagination strategy is tied to user task — not applied arbitrarily
- Anti-patterns prevent the most common content display mistakes (too many carousel slides, div-tables, motion without reduced-motion)
- Cross-references to ADR-0024 prevent duplication (form wizard UX, infinite scroll behavior, focus management)

**Negative:**

- Swiper's CSS imports create a styling override tax — shallow overrides are fine, deep customization may fight the library
- CSS masonry (`grid-template-rows: masonry`) has inconsistent browser support as of 2026 — progressive enhancement is required
- TanStack Table and Swiper are new library recommendations — require addition to `docs/approved-libraries.md` when installed
- Some patterns (tree view, comparison tables) may not need a library but benefit from one at scale — the ADR recommends building custom for now, which is more upfront work
- Complex accessible patterns (tree keyboard navigation, carousel ARIA) require significant implementation effort even with guidance

## Related ADRs

- [ADR-0004](./0004-components.md) — Component Structure (where display components live in the tier system)
- [ADR-0019](./0019-accessibility.md) — Accessibility (WCAG rules, ARIA patterns for tabs, carousels, trees)
- [ADR-0020](./0020-state-management.md) — State Management (URL state for pagination/filters/tabs, localStorage for view preferences)
- [ADR-0023](./0023-ui-foundation-primitives.md) — UI Foundation Primitives (Tabs and Accordion as Optional-tier shadcn/ui components)
- [ADR-0024](./0024-ux-interaction-patterns.md) — UX Interaction Patterns (keyboard/focus management, infinite scroll/load-more behavior, form wizard UX, touch targets)
