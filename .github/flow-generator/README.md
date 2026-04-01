# Flow Generator

Agent pipeline working directory. Each branch (FE, BE, FullStack) has its own folder.

## Structure

```
flow-generator/
├── FE/                          # Frontend branch (FEO pipeline)
│   ├── specs/                   # Agent output files ({agent-name}.{type}.{ext})
│   │   ├── orchestrator.design.brief.md    # Orchestrator design brief
│   │   ├── design-planner.brief.md         # Design Planner creative plan
│   │   ├── mock-designer.manifest.json     # Mock Designer rounds, variations, chosen
│   │   ├── ui-foundation.brief.md          # UI Foundation analysis brief
│   │   ├── ui-foundation.manifest.json     # UI Foundation run receipt (status + gates)
│   │   ├── ui-builder.brief.md             # UI Builder component build strategy
│   │   ├── ui-builder.manifest.json        # UI Builder section structure + skeletons
│   │   ├── ux-analyst.recommendations.md   # UX Analyst analysis output
│   │   ├── ux-analyst.manifest.json        # UX Analyst tracking
│   │   ├── orchestrator.ux.brief.md        # Orchestrator UX decisions
│   │   ├── orchestrator.ux.manifest.json   # Orchestrator UX interview tracking
│   │   └── ux-integrator.manifest.json     # UX Integrator execution tracking
│   └── inspiration/             # Drop design inspiration images here
├── page-architect/              # Page Architect (standalone)
│   └── specs/
│       ├── page-architect.analysis.md      # Reference page map + extracted content
│       ├── page-architect.brief.md         # Execution plan
│       └── page-architect.manifest.json    # Tracking
└── animation/                   # Animation orchestration (standalone)
    └── specs/
        └── {target-name}/       # One folder per animation target
            ├── analyst.manifest.json
            ├── analyst.recommendations.md
            ├── orchestrator.manifest.json
            ├── orchestrator.brief.md
            └── implementor.manifest.json
```

## How It Works

1. User invokes `@feo-orchestrator`.
2. Orchestrator auto-scans `FE/inspiration/` for reference images.
3. After the interview, orchestrator writes `FE/specs/orchestrator.design.brief.md`.
4. User reviews and approves the brief (Gate Protocol).
5. Orchestrator invokes `@feo-design-planner`, which reads the brief and writes `FE/specs/design-planner.brief.md`.
6. User reviews and approves the plan (Gate Protocol).
7. Orchestrator invokes `@feo-mock-designer`, which reads the plan and generates HTML+CSS mockups in `public/_mockups/`. User iterates until satisfied. Session state tracked in `FE/specs/mock-designer.manifest.json`.
8. Orchestrator runs the Variant Selection Gate — user picks one mockup. Choice recorded in `mock-designer.manifest.json`.
9. Orchestrator invokes `@feo-ui-foundation`, which customizes tokens/primitives, runs quality gates, updates design-tokens.json and the primitives catalog, and sets `ui-foundation.manifest.json` status to `"pending-approval"`. Orchestrator runs the Implementation Gate — if approved, promotes to `"completed"`.
10. Orchestrator invokes `@feo-ui-builder`, which translates the mockup into React components. Tracked in `ui-builder.manifest.json`. Orchestrator runs the Implementation Gate.
11. Orchestrator invokes `@feo-ux-analyst`, which produces `ux-analyst.recommendations.md` and `ux-analyst.manifest.json`. Orchestrator runs the Implementation Gate.
12. Orchestrator runs UX Interview — user decisions written to `orchestrator.ux.brief.md`.
13. Orchestrator invokes `@feo-ux-integrator`, which implements client interactivity. Tracked in `ux-integrator.manifest.json`. Orchestrator runs the Implementation Gate.

> **Note**: Mockup HTML files (`public/_mockups/`) live outside `flow-generator/`. The mock designer's manifest (`mock-designer.manifest.json`) lives in `specs/` with all other manifests.

## File Naming

Pattern: `{agent-name}.{document-type}.{ext}` — no nested subfolders per agent.

Valid agent names: `orchestrator`, `design-planner`, `mock-designer`, `ui-foundation`, `ui-builder`, `ux-analyst`, `ux-integrator`.

See `.github/instructions/flow-generator.instructions.md` for the full naming convention.

## Manifest Conventions

Every `.manifest.json` follows the `feo-manifest-v1` base schema:

- **Required fields**: `$schema`, `agent`, `created_at`, `updated_at`, `status`, `approved`, `approved_at`, `change_rounds`
- **Status lifecycle**: `pending → in-progress → pending-approval → [revision-requested →]* completed`
- **Gate protocol**: Implementation agents set `pending-approval` when done. The orchestrator asks the user to approve or request changes. Approval promotes to `completed`; changes are tracked in `change_rounds[]`.

See `.github/instructions/manifests.instructions.md` for the full schema, status enum, `change_rounds` format, and gate protocol.

## Animation Orchestration

Standalone flow — invokable anytime on any component, independent of the FEO pipeline.

1. User invokes `@animation-orchestrator`, points it at one or more components.
2. Orchestrator validates scope, creates target folder in `animation/specs/`.
3. Orchestrator invokes `@animation-analyst`, which reads the components and produces recommendations.
4. Analyst presents recommendations to user, runs its own approval gate.
5. Orchestrator reads approved recommendations, runs a structured decision interview.
6. User accepts, modifies, or skips each recommendation. Decisions checkpointed per section.
7. Orchestrator writes the animation brief. User approves (brief gate).
8. Orchestrator invokes `@animation-implementor`, which reads the brief and animation skills.
9. Implementor applies Framer Motion animations section by section, runs quality gates.
10. Implementor presents results to user, runs its own approval gate.

Parallel sessions supported — each target gets its own folder, no collision.

## Animation Manifests

Animation manifests follow the `animation-manifest-v1` base schema — same fields as `feo-manifest-v1` with a different schema identifier. See `.github/instructions/animation-flow.instructions.md`.

Valid agent names: `animation-orchestrator`, `animation-analyst`, `animation-implementor`.

## Page Architect

Standalone flow — invokable anytime, independent of the FEO pipeline. Creates new pages by analyzing existing ones, extracting content from external sources (URLs, images, conversation), refactoring shared structures, and assembling new routes.

```
flow-generator/
├── page-architect/
│   └── specs/
│       ├── page-architect.analysis.md     # Reference page map + extracted content
│       ├── page-architect.brief.md        # Execution plan (sections, content, refactoring)
│       └── page-architect.manifest.json   # Tracking (status, gates, change_rounds)
```

### How It Works

1. User invokes `@page-architect`, describes the goal (e.g., "Create a doors page like the windows page").
2. Agent runs a structured intake interview: reference page, content sources, target route, sections.
3. Agent analyzes the reference page architecture and extracts content from URLs/images.
4. **Extraction checkpoint** — user validates extracted content before drafting.
5. Agent writes the execution brief. User approves (brief gate).
6. Agent executes: refactors shared structures, creates content file, creates route file, builds new sections.
7. Agent runs quality gates (type check, lint, regression, content, primitives, tokens, barrels).
8. Agent presents results to user, runs final approval gate.

### Page Architect Manifests

Manifests follow the `page-architect-manifest-v1` schema — base fields match `feo-manifest-v1` with page-architect-specific extensions (`reference_page`, `target_page`, `content_sources`, `refactoring`, `sections`). See `.github/instructions/page-architect-flow.instructions.md`.

Valid agent name: `page-architect`.

### Workflow Skill

The agent uses a lazy-loaded workflow skill at `.github/skills/page-architect-workflow/`:

| File                          | Phase                                    |
| ----------------------------- | ---------------------------------------- |
| `intake-analysis.patterns.md` | Phase 1–2 (interview + analysis)         |
| `execution.patterns.md`       | Phase 3–4 (brief + code execution)       |
| `quality-gates.patterns.md`   | Phase 5 (quality gates + final approval) |

## Foundation Manifest — Downstream Consumer Protocol

After `@feo-ui-foundation` completes, it updates `ui-foundation.manifest.json` to `status: "completed"`. The design system metadata is split across three files:

| File                                                          | Content                                             | Lifecycle                                             |
| ------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `src/components/ui/design-tokens.json`                        | Colors, fonts, spacing — structured token inventory | Living — updated by any agent that changes tokens     |
| `src/components/ui/catalog.json`                              | Primitive index (names, paths, axes)                | Living — updated by any agent that changes primitives |
| `.github/flow-generator/FE/specs/ui-foundation.manifest.json` | Run metadata (scenario, gates, files modified)      | Snapshot — written by foundation agent only           |

### How Downstream Agents Should Use the Design System Metadata

1. **Read `src/components/ui/design-tokens.json`** — get the full token inventory (available colors, fonts, spacing tokens). Only use tokens listed here. Do not invent token names.
2. **Read `src/components/ui/catalog.json`** — get the full inventory of available primitives, their patterns, and variant axis names. For detailed API surface of specific primitives (variant values, props, defaults), read their co-located `manifest.json` (e.g., `src/components/ui/button/manifest.json`).
3. **Do NOT re-read primitive source files** unless you need implementation detail beyond what the catalog and manifests provide (e.g., exact class strings for a complex composition).
4. **Import from barrel** — use `import { Typography, Button, ... } from '@/components/ui'`. The foundation manifest's `barrel_export` field confirms the path.
5. **Check `ui-foundation.manifest.json`** for run metadata:
   - `status` — if `"pending"`, no foundation has run yet (template defaults only). If `"aborted"`, the foundation is incomplete.
   - `quality_gates` — if any gate has status `"skipped"` or `"fail"`, be aware of that gap.
6. **Sync rule**: if you add tokens to `tailwind.config.ts`, update `design-tokens.json`. If you add/modify a primitive, update its `manifest.json` and `catalog.json`.

### Schema References

See `skills/feo-ui-foundation-workflow/quality-gates.patterns.md` for:

- §Design Tokens Update — `design-tokens.json` schema
- §Primitives Catalog Update — `catalog.json` + per-primitive `manifest.json` schema
- §Foundation Manifest — `ui-foundation.manifest.json` schema

---

## SEO Pipeline (Standalone)

Standalone flow — invokable anytime, independent of the FEO and animation pipelines. Interviews the user about their business, implements SEO infrastructure, and produces a human-action document.

### Invocation

User invokes `@seo` (or `/seo` prompt shortcut). The agent runs an 8-phase workflow:

1. **Interview** — 6 structured rounds: business identity, location/geo, pages & content, keywords, external accounts, technical preferences. Output: `seo.interview.brief.md`.
2. **Infrastructure** — Creates `src/lib/seo/config.ts`, `sitemap.ts`, `robots.ts`, `keywords.ts`, updates root layout metadata.
3. **Structured Data** — Creates JSON-LD schema generators and `JsonLd` component, applies schemas to pages.
4. **Page Metadata & Copy** — Scans all routes, writes SEO-optimized titles/descriptions/H1s/alt text, suggests copy improvements.
5. **Technical SEO** — Configures redirects, canonical URLs, hreflang, RSS feeds.
6. **Geo/Location** _(conditional)_ — Multi-location page architecture with per-city metadata and schemas. Only runs if interview reveals multi-location needs.
7. **Human Action Doc** — Writes `seo.human-actions.md` with external account setup, content strategy, keyword map, and audit cadence.
8. **Verification** — eslint, typecheck, build, summary, approval gate.

### Directory Structure

```
flow-generator/
└── seo/
    └── specs/
        ├── seo.interview.brief.md      # Interview summary (requires approval)
        ├── seo.manifest.json            # Execution tracking, status, change_rounds
        └── seo.human-actions.md         # Human-action playbook (final deliverable)
```

### File Naming

Pattern: `seo.{document-type}.{ext}` — all files prefixed with the agent name.

| File                     | Purpose                                         | Requires Approval |
| ------------------------ | ----------------------------------------------- | ----------------- |
| `seo.interview.brief.md` | Structured interview summary                    | Yes               |
| `seo.manifest.json`      | Execution tracking and phase checkpoints        | No (internal)     |
| `seo.human-actions.md`   | External setup, content strategy, audit cadence | Informational     |

### Manifest Schema

Follows `seo-manifest-v1` — same base fields as `feo-manifest-v1` (`$schema`, `agent`, `created_at`, `updated_at`, `status`, `approved`, `approved_at`, `change_rounds`) plus SEO-specific extensions:

| Extension Field        | Type           | Description                                                  |
| ---------------------- | -------------- | ------------------------------------------------------------ |
| `last_completed_phase` | string or null | Phase checkpoint for session resume                          |
| `business_type`        | string or null | Business category from interview                             |
| `geo_enabled`          | boolean        | Whether geo/location phase is needed                         |
| `pages_audited`        | string[]       | Page paths audited for metadata/copy                         |
| `schemas_applied`      | string[]       | JSON-LD schema types applied                                 |
| `files_created`        | string[]       | Files created during the session                             |
| `files_modified`       | string[]       | Files modified during the session                            |
| `copy_suggestions`     | object[]       | Copy improvements: page, field, current, recommended, reason |

### Session Resume

The SEO agent supports full session resume. On startup, it scans `seo/specs/` for existing files and determines the furthest completed phase via `last_completed_phase` in the manifest. See the agent definition (`.github/agents/seo.agent.md`) for the complete resume state table.

### Relationship to Other Pipelines

- **Independent of FEO** — can run before, after, or alongside frontend build
- **Recommended post-FEO** — when the FEO pipeline builds new pages, invoke `@seo` afterward to add metadata, structured data, and copy optimization to the new routes
- **Independent of Animation** — SEO agent does not touch animation code
