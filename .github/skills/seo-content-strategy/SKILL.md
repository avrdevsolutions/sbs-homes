---
name: seo-content-strategy
description: >-
  SEO keyword and content patterns — keyword cluster mapping to site architecture,
  keyword intent types (informational/commercial/transactional/local), keyword research
  workflow (Autocomplete → Keyword Planner → competitor analysis → cluster grouping),
  heading hierarchy rules (H1→H2→H3, never skip), above-the-fold content rules,
  content length table by page type (home/service/location/blog/product/FAQ),
  hub-and-spoke internal linking with descriptive anchor text, FAQ sections as long-tail
  keyword magnets with getFaqSchema(), blog content calendar pattern (4-week cadence),
  blog article template structure, anti-patterns (thin location pages, keyword
  cannibalization, intent mismatch, programmatic location spam).
  Use when planning keyword architecture, structuring content for SEO, organizing a
  keyword strategy file, writing SEO content templates, implementing FAQ rich snippets,
  planning a blog content calendar, or auditing content for keyword cannibalization.
---

# SEO — Keyword Strategy & Content Patterns

**Compiled from**: ADR-0029 §Keyword Cluster Strategy, §Content Patterns, §Blog / Content Marketing
**Last synced**: 2026-03-27

---

## Keyword Cluster Strategy

A keyword cluster is a group of related search terms with the same search intent. One page per cluster — the primary keyword goes in the title and H1, secondary keywords are woven naturally into headings and body content.

```
Cluster 1: "mobilier living"
  Primary:   "mobilier living la comandă"
  Secondary: "canapea lemn masiv", "masă living", "bibliotecă living"
  → Page: /servicii/mobilier-living

Cluster 2: "mobilier bucătărie"
  Primary:   "mobilier bucătărie la comandă"
  Secondary: "corp bucătărie lemn", "blat bucătărie", "insulă bucătărie"
  → Page: /servicii/mobilier-bucatarie

Cluster 3: "mobilier dormitor"
  Primary:   "mobilier dormitor la comandă"
  Secondary: "pat lemn masiv", "dulap dormitor", "noptieră lemn"
  → Page: /servicii/mobilier-dormitor
```

Each cluster can then expand with location pages:
```
/servicii/mobilier-living/bucuresti
/servicii/mobilier-living/cluj-napoca
```

### Keyword Intent Types

| Intent | Example query | Page type |
|---|---|---|
| Informational | "cum se întreține mobilierul din lemn" | Blog article |
| Commercial | "mobilier la comandă prețuri" | Service / pricing page |
| Transactional | "comandă mobilier living online" | Product / service page with CTA |
| Navigational | "Brand Name contact" | Contact page |
| Local | "mobilier la comandă bucurești" | Location landing page |

**Match page type to search intent.** A query asking "how to maintain wood furniture" expects a how-to article — not a product page. Mismatched intent is a primary cause of poor rankings.

### Keyword Research Workflow

1. **Seed keywords** — start with the business's core services (e.g., "mobilier la comandă")
2. **Expand with tools**:
   - Google Autocomplete — type the seed, note all suggestions
   - Google "People Also Ask" — note every question Google shows
   - Google Keyword Planner — get search volume and competition data
   - Competitor analysis — look at the `<title>` tags of the top 3 results
3. **Group into clusters** — keywords with the same intent go on the same page
4. **Assign to pages** — one cluster per page, one primary keyword per cluster
5. **Document** — record the keyword strategy in `src/lib/seo/keywords.ts`

**Prevent cannibalization**: when two pages could rank for the same primary keyword, merge them or choose a canonical. Two pages competing on the same query split rankings — neither wins.

---

## Content Patterns for SEO

### Heading Hierarchy

```
H1:  One per page — contains primary keyword
  H2:  Section headers — contain secondary keywords
    H3:  Subsection headers — long-tail variations
      H4:  Rare — only for deeply structured content
```

Rules:
- Never skip levels (H1 → H3 without an H2 between)
- H1 matches the page topic — not the brand name
- Each H2 introduces a distinct subtopic with its own keyword
- Never use headings purely for visual styling — apply CSS classes for styling

### Above-the-Fold Content Rules

The first 100 words of a page carry outsized SEO weight. Google evaluates early content more heavily than content deep in the page.

```
✅ Good above-the-fold:
  H1 containing the primary keyword
  Opening paragraph (2–3 sentences) including the primary keyword naturally
  Clear value proposition that directly answers the search query

❌ Bad above-the-fold:
  Giant hero image with no text content
  "Welcome to our website" opener (generic, signals nothing to crawlers)
  Navigation-heavy header that pushes text content below the fold
  Auto-playing image slider — Google sees only the first slide
```

### Content Length Guidelines

| Page type | Minimum | Target | Notes |
|---|---|---|---|
| Home page | 300 words | 500–800 | Services overview, trust signals |
| Service page | 500 words | 800–1500 | Service detail, process, benefits, FAQ |
| Location page | 300 words | 500–800 | **Must be unique content per city** |
| Blog article | 800 words | 1200–2500 | In-depth — answers the query fully |
| Product page | 200 words | 300–500 | Description, specs, reviews |
| FAQ page | 400 words | 800–1500 | 5–15 questions with detailed answers |

Quality matters more than word count. A 400-word page that precisely answers a query outranks a 2000-word page of filler.

---

## Internal Linking — Hub-and-Spoke

Internal links distribute page authority and help Google discover content. The hub-and-spoke model is the standard SEO architecture:

```
/servicii  (hub — links out to all service spokes)
  ├── /servicii/mobilier-living     (spoke — links back to hub + related spokes)
  ├── /servicii/mobilier-bucatarie  (spoke — links back to hub + related spokes)
  └── /servicii/mobilier-dormitor   (spoke — links back to hub + related spokes)
```

**Rules:**
- Every page should have at least 2–3 internal links to related pages
- Anchor text must be descriptive — it signals context to Google
- Link from high-authority pages (home, main service hub) to deeper pages
- Location pages link back to the national service page

```html
<!-- ❌ Generic anchor — tells Google nothing about the linked page's topic -->
<a href="/servicii/mobilier-living">Click here</a>
<a href="/servicii/mobilier-living">Learn more</a>

<!-- ✅ Descriptive keyword anchor — reinforces the target page's primary keyword -->
<a href="/servicii/mobilier-living">mobilier living la comandă</a>
<a href="/blog/intretinere-lemn">cum se întreține mobilierul din lemn</a>
```

---

## FAQ Sections as Long-Tail Keyword Magnets

FAQ sections serve three purposes simultaneously:
1. Answer real user questions (search intent match)
2. Capture long-tail search queries as entry points
3. Qualify for FAQ rich results in Google (via JSON-LD schema)

**Where to add FAQ sections:**
- Service pages — process, pricing, timeline, warranty questions
- Location pages — city-specific questions (parking, delivery area, showroom hours)
- Product pages — material, care, durability questions
- Dedicated FAQ page — comprehensive, links to detail pages

**FAQ content rules:**
- Answer each question in 2–4 sentences (Google shows ~300 chars in FAQ rich results)
- Include relevant keywords naturally in both the question AND the answer
- Source questions from Google "People Also Ask" — these are real search queries
- Always wire `getFaqSchema()` when adding a FAQ section to a page

```tsx
// In the page component
import { JsonLd } from '@/components/ui/json-ld'
import { getFaqSchema } from '@/lib/seo/structured-data'

<JsonLd data={getFaqSchema([
  {
    question: 'Cât durează producerea mobilierului la comandă?',
    answer: 'Durata standard de producție este 4–6 săptămâni, în funcție de complexitatea proiectului și disponibilitatea materialelor.',
  },
  {
    question: 'Livrați mobilier în toată România?',
    answer: 'Da, livrăm în toată România, cu precădere în București, Cluj-Napoca și Timișoara. Costul de transport se calculează la comandă.',
  },
])} />
```

---

## Blog / Content Marketing

Blog content targets informational keywords — the "how to" and "what is" queries. It builds topical authority over time, attracts backlinks, and funnels users toward commercial pages.

### Monthly Content Calendar Pattern

```
Week 1: How-to article
  Target:  informational keyword ("cum alegi lemnul pentru mobilier")
  Length:  1200–2500 words
  Links:   → 2-3 relevant service pages

Week 2: Case study / portfolio piece
  Target:  commercial keyword + location ("mobilier bucătărie proiect București")
  Length:  800–1500 words
  Links:   → the matching service + city landing page

Week 3: Comparison / FAQ article
  Target:  comparison keyword ("MDF vs lemn masiv — ce e mai bun?")
  Length:  1000–2000 words
  Links:   → relevant service/product pages

Week 4: Local / seasonal content
  Target:  trending keyword ("tendințe mobilier 2026 România")
  Length:  600–1200 words
  Links:   → multiple service pages
```

### Blog Article Template

```
Title:       [Primary Keyword — question format]
             "Cum Alegi Lemnul Potrivit pentru Mobilier la Comandă"

Description: [Answer + CTA, 120–160 chars]
             "Ghid complet: stejar, nuc sau frasin? Compară durabilitate, preț și estetică."

H1:          Same as title

Intro (100 words):
  → State the problem the reader has
  → Include primary keyword in first 2 sentences
  → Preview what the article covers

H2: [Subtopic 1 — secondary keyword]       200–400 words
H2: [Subtopic 2 — secondary keyword]       200–400 words
H2: [Subtopic 3 — secondary keyword]       200–400 words

H2: Întrebări Frecvente  ← FAQ section
  → 3–5 questions with 2–4 sentence answers
  → Wire getFaqSchema() for this block

CTA at end:
  → Link to the relevant service page with descriptive anchor
  "Vrei mobilier din stejar la comandă? Solicită ofertă gratuită →"
```

---

## Anti-Patterns

```
❌ Keyword cannibalization
  Two pages both targeting "mobilier la comandă bucurești".
  → Google can't decide which to rank — neither ranks well.
  → One page per primary keyword. Merge or set canonical if overlap exists.

❌ Mismatched search intent
  Targeting "cum se întreține lemnul" with a product listing page.
  → Informational queries want how-to articles, not product pages.
  → Match page type to the intent type table above.

❌ Thin location pages (same content, city name swapped)
  /servicii/mobilier/bucuresti identical to /servicii/mobilier/cluj.
  → Google penalizes duplicate/thin content.
  → Minimum 200 unique words per location page.

❌ Generating pages for cities the business doesn't serve
  Creating location pages for every city in Romania to capture traffic.
  → Google detects programmatic thin content — penalizes the entire domain.
  → Create location pages only for cities the client genuinely serves.

❌ Generic internal link anchor text
  <a href="/servicii/mobilier-living">Click here</a>
  → Tells Google nothing about the destination page's topic.
  → Use the destination page's primary keyword as anchor text.

❌ No FAQ on high-value service pages
  Service pages with zero FAQ content.
  → FAQ sections capture long-tail queries and qualify for rich results.
  → Add a FAQ section to every key service and location page.

❌ Blog with no internal links to service pages
  Blog posts that are islands — no links back to commercial pages.
  → Blog content should funnel readers toward service/product pages.
  → Every blog article must link to at least 2 relevant service pages.
```
