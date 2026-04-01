---
agent: 'agent'
description: 'Sanity CMS setup: interview for content types, schema design, prerequisites checklist, bootstrap + schema code'
---

# /sanity-cms-builder — Sanity CMS Setup

## Workflow

1. Invoke **@Sanity CMS Builder**.
2. The agent runs a phased process with 3 approval gates before any code is written:
   - **Intake** — Paste your content type descriptions (text dump) or answer guided questions. The agent digests your input and asks targeted follow-ups about relationships, singletons, taxonomies, rich text, images, and scope boundaries.
   - **Interview Brief (Gate 1)** — Writes a structured brief summarizing all content types, relationships, and scope. You approve or request changes.
   - **Schema Design Review (Gate 2)** — Writes per-type field definitions with Sanity types, validation rules, reusable objects, and recommendations. You approve or request changes.
   - **Human Actions Checklist (Gate 3)** — Writes a step-by-step checklist of external prerequisites (Sanity account, project, tokens, CORS, webhooks, env vars). You complete these and confirm.
   - **Bootstrap Code** — Writes all 6 ADR-0033 bootstrap files (sanity.config.ts, sanity.cli.ts, schemas/index.ts, Studio route, env.ts, middleware.ts).
   - **Schema Code** — Writes schema files per the approved design (reusable objects first, then document types, then registry update).
   - **Verification** — Runs type check and lint. Presents summary and final approval gate.
3. Output saved to `.github/flow-generator/sanity/specs/`.
4. Session-resumable — re-invoking `@Sanity CMS Builder` picks up where it left off.

## When to Use

- Setting up Sanity CMS from scratch on a new project.
- Defining content types and schemas for Sanity.
- Bootstrapping the Sanity project structure (Studio, config, env vars).
- Getting guidance on content modeling decisions (relationships, taxonomies, singletons).

## What This Does NOT Cover

- GROQ queries, data-fetching layer, rendering (ADR-0032 scope).
- Visual Editing, Draft Mode, caching, or revalidation setup.
- The agent will suggest next steps for these after completion.
