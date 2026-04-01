---
name: ux-carousels
description: >-
  Carousel and horizontal scroll patterns — hero slider, card carousel, product image gallery,
  auto-play rules, horizontal scroll with snap + overflow indicators, carousel library decision
  tree (Embla vs Swiper). Includes ARIA patterns, responsive breakpoints, and anti-patterns.
  Use when building carousels, sliders, scrollable card rows, logo strips, or product galleries.
---

# Carousels & Horizontal Scroll Patterns

**Compiled from**: ADR-0025 §1 (Carousel / Slider), §2 (Horizontal Scrollable Content), Library Compatibility §Carousel  
**Last synced**: 2026-03-22

---

## Carousel Type — Decision Tree

```
What content is being displayed?
  → Hero images/banners (1 visible, full-width):
    → Hero slider — single slide visible, crossfade or slide transition
  → Product images (main view + alternatives):
    → Product gallery — main image + thumbnail strip (see §1.4 below)
  → Testimonials or quotes:
    → Testimonial rotator — single card visible, auto-advance optional
  → Cards or teasers (multiple visible):
    → Card carousel — multiple slides visible, partial next-slide peek
  → Logo/partner strip:
    → Don't use a carousel — use horizontal scrollable content (see §2 below)
```

---

## Hero Slider

**Use when:** Landing pages with 2–6 hero banners competing for the same viewport slot (image + headline + CTA per slide).  
**Don't use when:** Single hero (just use a static section) or more than 6 slides (engagement drops after 3–4).

**Pattern:**
- One slide visible at a time, full-width
- Transition: crossfade (preferred for images) or horizontal slide
- Indicator dots below — total slides + current position
- Previous/Next arrow buttons on left and right edges
- Optional auto-advance (5–7 sec interval) — must pause on hover/focus/touch and on `prefers-reduced-motion`
- First slide loads eagerly; subsequent slides use `loading="lazy"` on images

**ARIA:**
- Carousel region: `role="region"` `aria-roledescription="carousel"` `aria-label="Hero banner"`
- Each slide: `role="group"` `aria-roledescription="slide"` `aria-label="Slide 1 of 4"`
- Previous/Next buttons: `aria-label="Previous slide"` / `aria-label="Next slide"`
- Indicator dots: `role="tablist"` with each dot as `role="tab"` and `aria-selected` on current
- Auto-play toggle: `aria-label="Pause auto-rotation"` / `aria-label="Start auto-rotation"`
- Slide container: `aria-live="polite"` when user-controlled, `aria-live="off"` during auto-play

**Responsive:**
- Desktop: Full-width with padding, arrows visible on sides
- Mobile: Full-width, arrows smaller or replaced by swipe gesture + dots
- Images: `<picture>` with `srcSet` or Next.js `<Image>` `sizes` prop

**Anti-patterns:**
- ❌ Auto-advancing with no pause control — violates WCAG 2.2.2
- ❌ No visible navigation controls (swipe-only) — keyboard and desktop users can't navigate
- ❌ More than 6 slides — rethink content strategy
- ❌ Carousel to hide content that should be always-visible — use a grid instead

---

## Card Carousel (Multiple Visible)

**Use when:** 5+ cards (features, products, team members) where showing 3–4 at a time with browse is the right density.  
**Don't use when:** Fewer than 5 items (show all in a grid) or when comparing items matters (use a grid or table).

**Pattern:**
- Multiple slides visible (2–4 depending on breakpoint)
- Partial peek of next slide to signal scrollability
- Scroll snap to align slides on navigation
- Previous/Next buttons (optionally disable at boundaries for non-looping, or use `loop: true`)

**ARIA:** Same pattern as hero slider — `role="region"` `aria-roledescription="carousel"`, each card is `role="group"`. Cards within slides must be individually focusable (links, buttons inside cards).

**Responsive:**
- Desktop (≥1024px): 3–4 visible slides
- Tablet (768–1023px): 2–3 visible slides
- Mobile (<768px): 1–2 visible slides with peek of next

---

## Product Image Gallery

**Use when:** Product detail pages — multiple images of the same item, zoom, view switching.  
**Don't use when:** Single-image content. Equal-weight image collections (use masonry grid).

**Pattern:**
- Main image area (large, dominant)
- Thumbnail strip below or beside — click/tap to switch main image
- Click main image → opens lightbox for zoom
- Optional: hover-to-zoom lens on desktop

**Thumbnail Layout Decision Tree:**
```
How many product images?
  → 2–4: Horizontal thumbnail strip below main image
  → 5–8: Horizontal scrollable thumbnail strip with overflow indicators
  → 9+: Grid thumbnail strip with "Show all" expansion, or lightbox gallery navigation
```

**ARIA:**
- Thumbnail strip: `role="tablist"`, each thumbnail `role="tab"` with `aria-selected`
- Main image: `role="tabpanel"` linked via `aria-labelledby` to active thumbnail
- Main image alt text describes current view ("Product front view", "Product side angle")
- Zoom: accessible via keyboard — Enter opens lightbox from main image

**Responsive:**
- Desktop: Main image left/top, thumbnails right/below, hover-to-zoom
- Mobile: Main image top, swipeable (carousel behavior), thumbnail strip below with horizontal scroll
- Touch: tap main image for lightbox zoom instead of hover lens

---

## Auto-Play Rules

These rules apply to **all** carousel variants:

| Rule | Requirement |
|------|-------------|
| Pause on hover (desktop) | **MUST** |
| Pause on focus (keyboard user tabs into carousel) | **MUST** |
| Pause on touch interaction (mobile) | **MUST** |
| Visible play/pause button | **MUST** |
| Respect `prefers-reduced-motion: reduce` — disable auto-advance | **MUST** |
| Interval ≥ 5 seconds | **SHOULD** — faster intervals don't let users read content |
| Don't auto-play on mobile by default | **SHOULD** — wastes battery, users scroll past |
| `aria-live="off"` during auto-play, `"polite"` when user-controlled | **MUST** |

---

## Horizontal Scrollable Content

**Use when:** Content rows where items have equal weight and browsing left-to-right is natural — logo strips, card rows, category pills, feature previews.  
**Don't use when:** Primary content users must see (scrolling = information hiding). Vertical lists that stack fine. Navigation items.

**Pattern:**
```css
/* Container */
overflow-x: auto;
scroll-snap-type: x mandatory;

/* Each item */
scroll-snap-align: start; /* or center for centered snap */
```
- Partial overflow peek: show 10–20% of next item to signal scrollability
- Optional Previous/Next buttons for non-touch users

**Overflow Indicator Decision Tree:**
```
Is the scroll container obviously scrollable (e.g., partial item peek)?
  → YES: Partial peek is sufficient — no extra indicator needed
  → NO: Add scroll shadow/fade on the overflow edge
    → Is there a control for non-touch users?
      → YES: Arrow buttons on edges (fade in when scrollable in that direction)
      → NO: Add arrow buttons — desktop users can't swipe
```

**Scroll shadows:** CSS gradient masks on left/right edges that appear/disappear based on scroll position. Use throttled `scroll` event or `IntersectionObserver` on sentinel elements.

**ARIA:**
- Container: `role="region"` with `aria-label="Partner logos"` (descriptive)
- Arrow buttons: `aria-label="Scroll left"` / `aria-label="Scroll right"`, `disabled` at boundary
- `tabindex="0"` on scroll container — keyboard users can scroll with arrow keys
- Items follow normal tab order

**Responsive:**
- Desktop: Arrow buttons visible on hover + scroll with trackpad/mousewheel
- Mobile: Swipe naturally — hide arrow buttons, rely on partial peek + momentum scroll
- Account for `scroll-padding` if sticky headers or side nav exist

**Anti-patterns:**
- ❌ Hiding scrollbar on a container with no other scroll affordance
- ❌ Logo strip in a full carousel with arrows for 8 logos — just use a scrollable row
- ❌ Custom scrollbar styling that removes native scroll behavior

---

## Carousel Library Decision Tree

```
Do you need full design control with project tokens driving every visual aspect?
  → YES: Embla Carousel (via shadcn/ui Carousel) — headless, you build all UI
  → NO: Do you need pre-built navigation, pagination, thumbs, effects out of the box?
    → YES: Is the built-in UI close enough that you only need shallow overrides (colors, spacing)?
      → YES: Swiper — saves significant dev time with batteries-included UI
      → NO: Embla — deep-restyling Swiper's built-in CSS is more work than building from scratch
    → NO: Embla — simpler, lighter, more control
```

| Library | Bundle | Notes |
|---------|--------|-------|
| **Embla Carousel** (via shadcn/ui) | ~6kB | Headless, Tailwind-native — recommended default |
| **Swiper** | ~40–50kB | Ships own CSS (static, not runtime). A11y module included. Use when pre-built UI saves dev time |
| Masonry.js / Isotope | ❌ Forbidden | Causes layout recalc on resize; CSS Grid preferred |
