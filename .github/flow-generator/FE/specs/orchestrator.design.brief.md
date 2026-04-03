# FE Brief: SBS Homes Landing Page

## What it does

A single-page scroll-storytelling website for SBS Homes, an off-site timber home manufacturer. The page unfolds like their brochure — starting with the emotional lifestyle experience (what it feels like to live here), then peeling back the facade to reveal the precision engineering underneath. Target audience: architects, developers, and potential buyers.

## Brand DNA

SBS Homes builds precision-manufactured timber homes off-site — not generic site-built houses. Founded by Adrian Farcut, they use advanced timber construction systems to deliver contemporary homes with factory-level precision.

The differentiator is engineering confidence: these homes are designed and built in controlled conditions, then assembled on-site. Every panel, every joint, every layer is specified and documented. The brochure itself reads like a technical manual wrapped in architectural photography — that's the brand.

The ONE thing a visitor remembers: these homes are precision-engineered off-site with advanced timber systems — not slapped together on a muddy building site.

Tone of voice: confident, precise, understated. Let the engineering speak. No superlatives, no marketing fluff. Think Apple "designed in California" energy — state what it is, show why it matters.

## Visual direction

Modern architectural editorial. Clean, European, confident. Not luxury real estate flash — precision engineering that speaks for itself.

Full-bleed imagery, bold headlines, generous whitespace. The content reveals itself as you scroll — Apple product page pacing. Section numbers mark progress through the story. The page visually transitions from warm light backgrounds (Act 1 — the lifestyle) to dark charcoal backgrounds (Act 2/3 — the technology), and this tonal shift IS the storytelling.

Fonts: Instrument Sans for headings (uppercase, wide letter-spacing, thin weight) and DM Sans for body text. Both Google Fonts.

Colors: Warm orange (~#D4740E) is the brand accent — used for section numbers, headings, highlights. Light warm backgrounds (~#F5F3F0, ~#EDEBE8) for lifestyle sections. Dark charcoal (~#1C1C1E) for technical/engineering sections. Red (~#D4453A) for technical annotations matching the brochure's drawing labels.

Mood keywords: precision, editorial, confident, clean, European, architectural.

## Anti-references

Not luxury real estate flash — no gold accents, no marble textures, no "exclusive lifestyle" language.
Not generic volume builder sites — no stock photo families, no "starting from £X" banners.
Not cluttered brochure layouts — no cramped grids, no competing CTAs.

## Feature

- **Name**: landing-page
- **Route**: /

## Mockup preference

- Count: 2
- Mode: B (variations within the architectural editorial direction)
- Inspiration: No (references provided: Apple product pages, Vipp.com, Dezeen features)

## Sections

Three-act structure with a storytelling arc from lifestyle to engineering:

**Act 1 — The Homes (light warm backgrounds)**

1. **Hero** — Full viewport. Section number "1". Headline: "These Are SBS Homes. A Showcase Project of Four Contemporary Homes." Sets the tone: bold, confident, architectural.
2. **Exterior Views** — Street approach, front door, rear garden. Each pairs a full-bleed image with a brochure headline and floor plan location indicator. _(Animation placeholder — container with headline only, content built in animation pass.)_
3. **Interior Lifestyle** — Living area, kitchen, master bedroom. Same pattern as exteriors. _(Animation placeholder — container with headline only.)_
4. **Floor Plans** — Ground floor and first floor general arrangement plans with room schedule. _(Fully built static content.)_

**Act 2 — The Technology (transition from light to dark)**

5. **Section Divider** — "These Are SBS Homes: What Makes Them Special?" with section number "2". Marks the tonal shift from lifestyle to engineering.
6. **Construction Overview** — Exploded cutaway showing off-site timber panel construction with 5 key components labeled. _(Animation placeholder — container with headline only.)_
7. **Assembly Sequence** — 7-step build sequence from slab to roof. _(Animation placeholder — container with headline only.)_
8. **Structural Floor Plans** — Color-coded plans showing component types (external walls, internal walls, party walls, etc.). _(Fully built static content.)_

**Act 3 — The Components (dark backgrounds)**

9. **Component Details** — One sub-section each for: ground floor slab, external walls, internal walls, party walls, intermediate floor, roof. Each has isometric material diagram and layer-by-layer specs from the brochure. _(Fully built static content.)_
10. **Footer** — Contact: Adrian Farcut, +44 (0)792 7714 786, enquiries@sbs-homes.co.uk, www.sbs-homes.co.uk. _(Fully built static content.)_

**Navigation** — Sticky top bar. "SBS Homes" wordmark left, section links right.

## Content

- Language: English
- Copy: Real copy from brochure where available, placeholder English text where needed
- Images: Unsplash placeholders

## Layout

- Approach: Mobile-first (default)

## Constraints

- **Animation-ready sections** (Exterior Views, Interior Lifestyle, Construction Overview, Assembly Sequence) must be laid out as empty container sections with just their headline and a placeholder area. Do NOT fill them with static content — these will be built in a second animation pass.
- **Static sections** (Floor Plans, Structural Floor Plans, Component Details, Footer) should be fully built out.
- The light-to-dark background transition across acts is a core storytelling device, not optional styling.
- The brochure PDF is the single source of truth for all content, section structure, and technical specifications.
