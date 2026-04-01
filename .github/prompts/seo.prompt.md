---
agent: "agent"
description: "SEO setup: interview, implement infrastructure, optimize copy, produce human-action doc"
---

# /seo — SEO Setup & Audit

## Workflow

1. Invoke **@seo**.
2. The SEO agent runs a phased process:
   - **Interview** — 6 structured rounds covering business identity, location/geo, pages, keywords, external accounts, and technical preferences.
   - **Infrastructure** — Creates `src/lib/seo/config.ts`, sitemap, robots, keywords, and updates root layout metadata.
   - **Structured Data** — Creates JSON-LD schema generators and applies them to pages based on business type.
   - **Page Metadata & Copy** — Scans all pages, writes SEO-optimized titles, descriptions, H1s, and alt text. Suggests copy improvements.
   - **Technical SEO** — Configures redirects, canonical URLs, hreflang (if multilingual), and RSS feeds (if blog).
   - **Geo/Location** *(conditional)* — Creates multi-location page architecture with per-city metadata and schemas.
   - **Human Action Doc** — Writes `seo.human-actions.md` with external account setup, content strategy, keyword map, audit cadence.
   - **Verification** — Runs eslint, typecheck, build. Presents summary and approval gate.
3. Output saved to `.github/flow-generator/seo/specs/`.
4. Session-resumable — re-invoking `@seo` picks up where it left off.

## When to Use

- Setting up SEO on a new project.
- Adding SEO infrastructure to an existing site.
- Auditing and improving page metadata and copy.
- Creating a content strategy and keyword plan.
- Preparing for launch (SEO readiness review).

## After Completion

- Follow the human-action doc (`seo.human-actions.md`) for external account setup and content strategy.
- Run Lighthouse SEO audit (target ≥ 90).
- Test JSON-LD at Rich Results Test.
- Monthly/quarterly reviews per the audit cadence in the doc.
