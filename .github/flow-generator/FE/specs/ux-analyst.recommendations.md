---
source_manifest: ui-builder.manifest.json
sections_analyzed: 9
---

# UX Recommendations

---

## Navigation — NavSpine

> **DEFERRED — see Revision Round 1 below.** Navigation design is being reconsidered. No UX interaction recommendations are active for the navigation component at this time. The UX Integrator should leave `NavSpineClient` as-is (bare skeleton) until a new navigation design direction is confirmed.

---

## Section: Hero (01)

- **Recommended**: The CTA anchor `<a href="#exterior-views">` relies on smooth scrolling. Add `scroll-behavior: smooth` to the `html` element in `globals.css` so the scroll behaves gracefully without JavaScript dependency. The existing element and href are correctly formed for progressive enhancement — this CSS addition is all that is needed for functional smooth scroll.

- **Alternative**: Handle smooth scroll programmatically in a client component `onClick` handler using `element.scrollIntoView({ behavior: 'smooth' })`. This allows scroll offset corrections (e.g., if a sticky header height must be subtracted) but adds a client boundary for what is currently a server component.

- **Why**: The CTA is a section-to-section in-page anchor — the `<a href="#">` approach is the correct element choice. Smooth scroll is a single CSS line on `html`. The mockup also uses `scroll-behavior: smooth` on `html` directly. Without it, jumping to `#exterior-views` is an instant jarring snap.

### Desktop Content Offset

- **Recommended**: On desktop (≥1024px), the fixed nav spine occupies 56px (`3.5rem`) on the right edge of the viewport and currently overlaps page content since `<body>` has no right padding. Add `lg:pr-14` (3.5rem) to `<body>` in the root layout, matching the mockup's `padding-right: var(--nav-collapsed)` pattern, so that content in all sections is never clipped by the nav spine. The hero section and technology divider section (which are full-bleed and benefit from extending under the nav) are already handled by their own layout — their background images should extend into that gap, but text content stays within the container.

- **Alternative**: Apply `lg:mr-14` to a wrapper `<div>` around `<main>` rather than the body, keeping the scroll container clean. This has the same visual effect.

- **Why**: Without this offset, the right edge of all section content — including the CTA and body text — is partially obscured by the translucent nav spine bar on desktop. The mockup accounts for this explicitly.

---

## Section: Exterior Views (02)

- **Recommended**: This section currently holds a `viewport="animation"` placeholder. When the scroll-driven image narrative is implemented, mobile devices that honour `prefers-reduced-motion: reduce` should receive a static fallback: a single representative exterior photograph displayed at the same aspect ratio as the animation canvas, with appropriate alt text describing the home exterior. The section header and its content remain unchanged for both paths.

- **Alternative**: Display a simple grid of three static photographs (street approach, front door, rear garden) as the reduced-motion fallback, matching the narrative of the three viewpoints described in the section description.

- **Why**: The section description explicitly names three viewpoints ("the arrival, the threshold, and the private outdoor space"). Users who cannot or choose not to see the animation still deserve meaningful exterior content rather than an empty rectangle. The section header text promises this content — the fallback delivers on that promise.

---

## Section: Interior Lifestyle (03)

- **Recommended**: Identical pattern to Exterior Views. When the scroll-driven interior scene is implemented, a reduced-motion fallback of a single well-composed interior photograph (living area or kitchen) replaces the animation canvas on devices that prefer reduced motion.

- **Alternative**: A static lifestyle-style photograph (full-bleed, slightly overlapping the section below) presented as a static image that fades in on scroll entry — no animation mechanics, just an opacity transition via CSS.

- **Why**: The warm-alt background and the heading ("Living Area, Kitchen, Master Bedroom") set user expectations for interior imagery. A reduced-motion path must honour those expectations.

---

## Section: Floor Plans (04)

- **Recommended**: This is a content placeholder pending real architectural drawing assets. When ground-floor and first-floor plan images arrive, implement a two-state segmented control above the plan area — labelled "Ground Floor" and "First Floor" — that switches which plan is displayed. Each plan image should be clickable to open a full-screen overlay view where the user can study the plan at full resolution. The overlay should close via an explicit close button (top-right), pressing Escape, or clicking outside the image. On mobile, the overlay occupies the full screen with a close button in the top-right corner.

- **Alternative**: Present both floor plans stacked vertically (no switcher), each accompanied by a "View full size" link that opens the individual plan in the full-screen overlay. This avoids the tab-switching interaction but results in a more scrollable layout.

- **Why**: Floor plans are reference documents that users study at detail level — a lightbox/full-screen view is the appropriate pattern. The two plans (ground + first floor) are naturally paired but distinct views; a segmented control (two items) is the minimal-complexity way to switch between them without burying content below the fold. This pattern does not require a full accordion or separate pages since both plans are contextually part of the same section.

---

## Section: Technology Divider (05)

- **Recommended**: No discrete interactive elements are needed or appropriate for this section. It functions as a pure act-transition scene. The large background word and centred title are informational. The only UX requirement is that this section's dark background correctly triggers the nav spine context switch from light glass to dark glass, since this is the transition boundary between Act I and Act II.

- **Alternative**: None applicable — this section is intentionally non-interactive.

- **Why**: The section contains no links, no buttons, and no expandable content. It is a deliberate pacing device between Act I (the homes) and Act II (the technology). Adding interaction here would undermine its purpose.

---

## Section: Construction Overview (06)

- **Recommended**: This section holds an animation placeholder for the exploded cutaway animation. When the animation is implemented, it will visualise the five key structural components. A reduced-motion fallback should display a static labelled diagram or a simple ordered list naming the five components (foundation slab, external walls, internal walls, floor cassette, roof cassette) — preserving the informational goal of the animation without motion. The section heading and description remain visible in both animation and fallback paths. At the end of the section (or within the animation's final held state), a contextual link to the Component Details section below ("See full layer specifications ↓") provides a logical continuation for users who want to go deeper.

- **Alternative**: Instead of a text list fallback, the reduced-motion path could show a single representative cross-section photograph of the construction system — a real photograph of the timber panel factory showing components pre-assembly if available.

- **Why**: The section description says "Five key components — engineered in a factory, not improvised on a building site." The animation shows these five components. For users who cannot experience the animation, the fallback must communicate these five components. A contextual link to Component Details closes the narrative loop — each component is fully specified below with U-values and assembly layers.

---

## Section: Assembly Sequence (07)

- **Recommended**: This section holds an animation placeholder for a seven-step sequential build narrative. As the animation progresses through steps, a persistent step indicator should communicate current position: "Step 3 of 7" or a horizontal progress bar with seven segments — both updating as the scroll-driven animation advances. The indicator should be implemented as an `aria-live="polite"` region so screen readers also receive step updates without disruptive interruption. A reduced-motion fallback shows the seven steps as a numbered list with brief descriptions of each phase.

- **Alternative**: Omit the numeric step counter and rely solely on visual progress cues within the animation itself (e.g., parts of the structure appear as the user scrolls). This is simpler but removes the explicit progress signal that helps users understand how long the sequence is.

- **Why**: A seven-step sequence is long enough that users need orientation — knowing they are on step 3 of 7 reduces uncertainty and sets expectations for scroll depth. The `aria-live` requirement ensures that screen reader users, who may not perceive the visual animation, still receive the sequential narrative at an appropriate pace.

---

## Section: Structural Floor Plans (08)

- **Recommended**: Currently a content placeholder for structural drawings. When real colour-coded structural plan assets arrive, implement a set of layer visibility toggles — one per structural system — allowing users to show or hide specific layer types on the plan (exterior walls, internal walls/panels, floor cassette, roof structure). Each toggle corresponds to one of the colour codes already established in the Component Details section (using the same amber/steel/tan/etc. pip colours), creating a visual consistency across the two sections. On desktop, toggles appear in a horizontal strip above the plan. On mobile, toggles appear in a horizontally scrollable strip above a single-column plan view.

- **Alternative**: Present the structural plan as a single composite image with no layer toggling, accompanied by a colour legend key that maps each colour to a structural component. This is passive display rather than active exploration but involves zero interaction complexity.

- **Why**: The section description says "Colour-coded plans showing the structural system — every wall, floor, and panel type identified." If users cannot isolate individual systems, the colour coding is purely decorative. Layer toggling transforms the plan from a static image into an explorable document. This section deliberately mirrors the Component Details section's breakdown — the same components that are specified layer-by-layer below are the same systems shown colour-coded here.

---

## Section: Component Details (09)

- **Recommended**: On mobile (below 768px viewport width), make each component card collapsible. The card header row — title and key metric (U-value or acoustic rating) — acts as the toggle trigger: tapping it expands or collapses the layer list beneath. Cards start in the expanded state on desktop and in the collapsed state on mobile. A subtle expand/collapse indicator (chevron or "+" icon) appears in the card header on mobile to signal interactivity. Keyboard users can trigger the toggle with Enter or Space. An `aria-expanded` attribute on the card header element communicates state to screen readers. On desktop (≥768px, 2-column grid), all cards remain fully expanded — the 2-column layout distributes the content manageably.

- **Alternative**: Keep all cards fully expanded at all breakpoints (current behaviour). This is the simplest path and is defensible because Component Details is a specification reference section — users arriving at it expect full detail without needing to trigger anything. The trade-off is a very long mobile scroll (~50 layer rows across 6 cards).

- **Why**: There are 6 component cards with between 3 and 9 layer rows each. In a single-column mobile layout, this produces approximately 50 stacked rows within a section already deep in the page. Progressive disclosure at the card level (not the layer level) respects users who want to scan card titles and dive into only the components they care about. The card title and metric value remain visible in the collapsed state — enough context to decide whether to expand. Desktop avoids this interaction cost entirely because the 2-column grid distributes the rows across 3 rows of cards.

---

## Site Footer

- **Recommended**: The footer contains two external links — an email address (`mailto:`) and a website URL. The website link opens an external domain and must include `target="_blank"` with `rel="noopener noreferrer"` to prevent opener access and inform the browser. A visually-hidden "(opens in new tab)" text or equivalent `aria-label` suffix should accompany the external link for screen reader users. The email link should use a `mailto:` href. Both links already have hover opacity transitions — ensure keyboard focus produces an equivalent visible focus ring (`focus-visible:ring-*`) matching the project token for focus state.

- **Alternative**: Remove the `target="_blank"` pattern entirely and let external links open in the same tab. This avoids the "opens in new tab" disclosure requirement but is generally considered worse UX for links that take users off the current page entirely.

- **Why**: The footer's contact section is likely the most-visited part of the page for qualified visitors who want to enquire. External links that silently hijack the current tab (without `target="_blank"`) lose the current-page context. Screen reader users must be told about new-tab behaviour because they cannot detect it visually.

---

## Global UX

### Smooth Scroll

- **Recommended**: Add `scroll-behavior: smooth` to the `html` element rule in `globals.css`. This is the single change needed to activate smooth scrolling for all in-page anchor links (`#exterior-views`, `#the-technology`, etc.). It is automatically suppressed by browsers when `prefers-reduced-motion: reduce` is active in some implementations; for full compliance, also add `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }` to explicitly reset it.

- **Alternative**: Handle smooth scroll only through programmatic `scrollIntoView({ behavior: 'smooth' })` calls in event handlers. This requires converting the hero CTA anchor into a button with a click handler and adding a client boundary, which is more complex than the CSS-only approach.

- **Why**: The CTA "Explore the homes" has `href="#exterior-views"` and the nav links all target section IDs. Without `scroll-behavior: smooth`, all of these produce instant jarring position jumps. The CSS approach requires zero JavaScript and zero new client components.

### Skip Link

- **Recommended**: Add a visually-hidden skip-to-main-content link as the first focusable element in `layout.tsx`, immediately before `NavSpine`. The link should read "Skip to main content", point to `#main-content`, and become visible when focused (using `sr-only` with a `focus:not-sr-only` override). The `<main>` element in `layout.tsx` should receive `id="main-content"`.

- **Alternative**: Instead of a skip link, add `tabIndex={-1}` to the `<main>` element and programmatically move focus to `<main>` after any client-side navigation. This is more complex and only relevant for route changes, which this single-page layout does not have.

- **Why**: The nav spine contains 8 links (plus wordmark) across two nav groups, plus a footer element. Keyboard users would need to Tab through all of these on every page load before reaching the hero heading. A skip link is a WCAG 2.4.1 (Level A) requirement. It is the first focusable element on the page.

### Back-to-Top Button

- **Recommended**: Add a fixed back-to-top button that appears after the user has scrolled past the hero section (approximately 100vh from the top). The button is fixed to the bottom-left corner on desktop (to avoid conflicting with the right-side nav spine), and bottom-right corner on mobile (since the bottom bar will occupy the full width and the button should slide above or be positioned to avoid it). The button is a `<button aria-label="Back to top">` element. Activating it scrolls the window to the top and moves focus to the `<body>` or the hero section heading. It fades in and out based on scroll position.

- **Alternative**: Omit the back-to-top button and rely on the wordmark link at the top of the nav spine (which links to `#`) to provide the same function on desktop. On mobile, this requires opening the nav to access the wordmark — not a clean fallback.

- **Why**: The page spans 9 content sections plus a footer — it is approximately 10–15 viewport heights tall at a typical reading pace. Without a back-to-top affordance, users who reach the footer must scroll all the way back up manually to return to the hero or navigate to Act I sections. The nav spine wordmark covers this on desktop when the nav is hovered, but mobile has no equivalent.

### Focus Ring Compliance

- **Recommended**: Audit all interactive elements on the page — nav links, CTA anchor, footer links, card toggle triggers when added — to confirm that each has a visible `focus-visible:ring-*` style using project colour tokens. The current ghost-button CTA in `HeroSection` uses the `buttonVariants()` helper; confirm that the ghost variant definition includes a `focus-visible:ring-2 focus-visible:ring-offset-2` rule. Nav links in `NavSpine.tsx` are `<a>` elements with custom styling; they need explicit `focus-visible:ring-*` additions if not already present.

- **Alternative**: Add a global focus ring rule in `globals.css` (`*:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }`) as a catch-all that applies before any component-level focus styles. This is lower precision but ensures nothing is missed.

- **Why**: Focus visibility is a WCAG 2.4.7 (Level AA) requirement. Dark overlay sections (Act II and III, dark-deeper background) especially need high-contrast focus rings since the default browser outline may not meet contrast requirements against dark surfaces.

---

## Revision Round 1

**Requested**: 2026-04-02T11:01:00Z
**Feedback**: "Remove the navigation completely — will rethink it further, no inspiration yet and not happy with how it looks."

### Updated Recommendations

#### Section: Navigation — NavSpine

- **Previous**: Full recommendation suite for desktop scroll-spy, dark/light context switching, mobile bottom bar, and NavSpineClient skeleton implementation.
- **Revised**: Navigation UX recommendations are deferred entirely. The section header above has been replaced with a deferred notice. `NavSpineClient` should remain as its current bare skeleton. No navigation interactions should be implemented by the UX Integrator. Navigation will be addressed in a future design iteration once the direction is confirmed.

---
