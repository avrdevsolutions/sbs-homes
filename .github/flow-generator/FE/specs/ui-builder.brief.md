---
approved: true
source_mockup: landing-page-mockup-r3-v2.html
page_name: landing-page
page_entry: src/app/page.tsx
content_contracts: src/dictionaries/landing-page.ts
layout_contracts: src/dictionaries/layout.ts
---

# Page Builder Brief

## Discovery Summary

- **Source mockup**: `landing-page-mockup-r3-v2.html`
- **Sections discovered**: 9 feature sections + 2 layout components
- **Content language**: English
- **Heading hierarchy**: h1 in hero, h2 in all section headers/divider title, h3 in component detail cards

## Content Contracts

### Layout Contract - `src/dictionaries/layout.ts`

#### `NavSpineContent`

- `wordmark`: { `label`: string; `href`: string; `ariaLabel`: string }
- `groups`: { `label`: string; `links`: { `number`: string; `label`: string; `href`: string; `ariaLabel`: string; `active`?: boolean }[] }[]
- `contactEmail`: string
- `ariaLabel`: string

#### `FooterContent`

- `title`: string
- `description`: string
- `contact`: { `nameLabel`: string; `name`: string; `phoneLabel`: string; `phone`: string; `emailLabel`: string; `email`: { `label`: string; `href`: string }; `webLabel`: string; `web`: { `label`: string; `href`: string } }
- `bottom`: { `copyright`: string; `brand`: string }

### Page Contract - `src/dictionaries/landing-page.ts`

#### `HeroSectionContent`

- `id`: string
- `sectionNumber`: string
- `title`: string
- `subtitle`: string
- `image`: { `src`: string; `alt`: string; `width`: number; `height`: number }
- `cta`: { `label`: string; `href`: string }
- `scrollLabel`: string

#### `PlaceholderSectionContent`

- `id`: string
- `eyebrow`: string
- `title`: string
- `description`: string
- `placeholderLabel`: string

#### `DividerSectionContent`

- `id`: string
- `backgroundWord`: string
- `sectionNumber`: string
- `title`: string

#### `ComponentLayer`

- `name`: string
- `dimension`: string
- `tone`: `primary` | `annotation` | `earth` | `amber` | `steel` | `steel-light` | `stone` | `stone-dark` | `sage` | `tan` | `porcelain` | `charcoal`

#### `ComponentCardContent`

- `title`: string
- `metric`: { `label`: string; `value`: string; `muted`?: boolean }
- `layers`: `ComponentLayer`[]

#### `ComponentDetailsSectionContent`

- `id`: string
- `eyebrow`: string
- `title`: string
- `description`: string
- `cards`: `ComponentCardContent`[]

#### `LandingPageContent`

- `hero`: `HeroSectionContent`
- `exteriorViews`: `PlaceholderSectionContent`
- `interiorLifestyle`: `PlaceholderSectionContent`
- `floorPlans`: `PlaceholderSectionContent`
- `technologyDivider`: `DividerSectionContent`
- `constructionOverview`: `PlaceholderSectionContent`
- `assemblySequence`: `PlaceholderSectionContent`
- `structuralFloorPlans`: `PlaceholderSectionContent`
- `componentDetails`: `ComponentDetailsSectionContent`

## Sections

### 1. `hero`

- **Component**: `HeroSection` in `src/components/features/landing-page/hero-section/`
- **Purpose**: Introduce SBS Homes with full-viewport editorial hero and CTA into Act 1.
- **Layout**: Full-bleed image with dark gradient overlay; bottom-aligned content block; left-aligned text stack.
- **Primitives**: `Section(spacing="hero", background="dark", fullBleed)`, `Container(size="xl", padding="default")`, `Typography(section-number/h1/body/overline)`, `Button(ghost, inline)`, `Stack`.
- **Responsive**: Section-number scales 5rem -> 7rem -> 9rem -> 10.5rem; container padding widens at md/lg.
- **Images**: 1 image - hero 16:9 landscape.
- **Interactivity hints**: CTA and nav links should sync with scroll targets/active section state.
- **Mockup reference**: `.hero` with `.hero__overlay`, `.hero__content`.

### 2. `exterior-views`

- **Component**: `ExteriorViewsSection` in `src/components/features/landing-page/exterior-views-section/`
- **Purpose**: Act 1 exterior storytelling entry point.
- **Layout**: Section header block plus large empty animation container.
- **Primitives**: `Section(spacing="spacious", background="warm")`, `Container`, `Typography(overline/h2/body)`, `Separator(accent)`, `Stack`.
- **Responsive**: Maintains single-column header + placeholder block with larger vertical rhythm at lg.
- **Images**: 0 in builder pass (animation placeholder only).
- **Interactivity hints**: Scroll-driven scene for street/front/rear image sequence.
- **Mockup reference**: `#exterior-views` + `.anim-placeholder`.

### 3. `interior-lifestyle`

- **Component**: `InteriorLifestyleSection` in `src/components/features/landing-page/interior-lifestyle-section/`
- **Purpose**: Act 1 interior experience section.
- **Layout**: Same as exterior section with alternate warm background.
- **Primitives**: `Section(spacing="spacious", background="warm-alt")`, `Container`, `Typography(overline/h2/body)`, `Separator(accent)`.
- **Responsive**: Same as section 2.
- **Images**: 0 in builder pass (animation placeholder only).
- **Interactivity hints**: Scroll-driven interior gallery narrative.
- **Mockup reference**: `#interior` + `.anim-placeholder`.

### 4. `floor-plans`

- **Component**: `FloorPlansSection` in `src/components/features/landing-page/floor-plans-section/`
- **Purpose**: Static placeholder for future floor-plan asset integration.
- **Layout**: Header + content placeholder block.
- **Primitives**: `Section(spacing="standard", background="warm")`, `Container`, `Typography(overline/h2/body)`, `Separator(accent)`.
- **Responsive**: Single-column; preserved placeholder height.
- **Images**: 0 (content placeholder).
- **Interactivity hints**: Optional anchor target for future downloadable plans.
- **Mockup reference**: `#floor-plans` + `.content-placeholder`.

### 5. `technology-divider`

- **Component**: `TechnologyDividerSection` in `src/components/features/landing-page/technology-divider-section/`
- **Purpose**: Transition between lifestyle and engineering acts.
- **Layout**: Centered content over giant low-opacity background word.
- **Primitives**: `Section(spacing="hero", background="dark")`, `Container`, `Typography(section-number/h1-as-h2)`, `Separator(accent)`.
- **Responsive**: Background word scales with viewport width.
- **Images**: 0.
- **Interactivity hints**: Potential pinned/transition scene marker for animation phase.
- **Mockup reference**: `.section-divider`.

### 6. `construction-overview`

- **Component**: `ConstructionOverviewSection` in `src/components/features/landing-page/construction-overview-section/`
- **Purpose**: Act 2 technical construction intro.
- **Layout**: Dark variant section header + empty animation container.
- **Primitives**: `Section(spacing="spacious", background="dark")`, `Container`, `Typography(overline/h2/body)`, `Separator(accent)`.
- **Responsive**: Single-column with fixed minimum placeholder viewport height.
- **Images**: 0 in builder pass.
- **Interactivity hints**: Exploded cutaway animation with layered highlights.
- **Mockup reference**: `#construction` + dark `.anim-placeholder`.

### 7. `assembly-sequence`

- **Component**: `AssemblySequenceSection` in `src/components/features/landing-page/assembly-sequence-section/`
- **Purpose**: Act 2 sequence narrative intro.
- **Layout**: Deep dark header + empty animation container.
- **Primitives**: `Section(spacing="spacious", background="dark-deeper")`, `Container`, `Typography(overline/h2/body)`, `Separator(accent)`.
- **Responsive**: Same as section 6.
- **Images**: 0 in builder pass.
- **Interactivity hints**: Step-by-step build timeline animation.
- **Mockup reference**: `#assembly` + dark `.anim-placeholder`.

### 8. `structural-floor-plans`

- **Component**: `StructuralFloorPlansSection` in `src/components/features/landing-page/structural-floor-plans-section/`
- **Purpose**: Static placeholder for future structural plan assets.
- **Layout**: Dark header + content placeholder.
- **Primitives**: `Section(spacing="standard", background="dark")`, `Container`, `Typography(overline/h2/body)`, `Separator(accent)`.
- **Responsive**: Single-column placeholder.
- **Images**: 0.
- **Interactivity hints**: Optional filterable overlays in future UX pass.
- **Mockup reference**: no explicit id; second dark `section-standard` before components act.

### 9. `component-details`

- **Component**: `ComponentDetailsSection` in `src/components/features/landing-page/component-details-section/`
- **Purpose**: Fully populated technical card grid with layered specs.
- **Layout**: Centered header followed by 1-col mobile / 2-col desktop card grid.
- **Primitives**: `Section(spacing="spacious", background="dark-deeper")`, `Container`, `Typography(overline/h2/body/h3/caption)`, `Stack`, `Separator(subtle)`.
- **Responsive**: Cards stack on mobile; split into two columns at lg.
- **Images**: 0.
- **Interactivity hints**: Potential future expandable cards or reveal animations per layer row.
- **Mockup reference**: `#the-components` + `.comp-grid` and `.comp-card`.

## Layout Components

### `nav-spine`

- **Component**: `NavSpine` in `src/components/layout/nav-spine/`
- **Structure**: Fixed right-side glass spine nav for desktop only (collapses/expands), with act grouping labels and section links.
- **Primitives**: `Typography`, `Stack`, `Separator`, optional `Badge` for active number emphasis.
- **Content contract**: `src/dictionaries/layout.ts` -> `NavSpineContent`
- **Interactivity hints**: Requires client boundary for hover-expand state, active-section tracking, and dark/light inversion by section. Mobile navigation is intentionally omitted in this phase.

### `footer`

- **Component**: `SiteFooter` in `src/components/layout/site-footer/`
- **Structure**: Contact block + detail columns + bottom legal/brand row.
- **Primitives**: `Section(spacing="compact", background="dark-deeper")`, `Container`, `Typography`, `Stack`, `Button(link)` for external/email links.
- **Content contract**: `src/dictionaries/layout.ts` -> `FooterContent`
- **Interactivity hints**: External links only; no client behavior required.

## Build Order

1. Layout content file `src/dictionaries/layout.ts`
2. Page content file `src/dictionaries/landing-page.ts`
3. Feature sections in page order: hero, exterior-views, interior-lifestyle, floor-plans, technology-divider, construction-overview, assembly-sequence, structural-floor-plans, component-details
4. Layout components: nav-spine, footer
5. Page assembly in `src/app/page.tsx` with typed content imports
6. Build and quality gate checks
