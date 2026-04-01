---
description: >-
  Sanity CMS pipeline spec file naming conventions and manifest schemas for
  both the Builder and Consumer agents. Scoped to all files in the
  flow-generator Sanity specs directory.
applyTo: .github/flow-generator/sanity/specs/**
---

# Flow Generator — Sanity CMS Spec Files

## Spec File Naming — CRITICAL

All files in `.github/flow-generator/sanity/specs/` MUST follow the naming conventions below. Each agent owns its own prefix.

### Sanity CMS Builder (`sanity-cms-builder.*`)

- `sanity-cms-builder.interview.brief.md` — interview summary with content types, relationships, scope (requires user approval)
- `sanity-cms-builder.schema-design.md` — per-type field definitions, Sanity types, validation, recommendations (requires user approval)
- `sanity-cms-builder.human-actions.md` — external prerequisites checklist: account, tokens, CORS, webhooks, env vars (requires user confirmation)
- `sanity-cms-builder.manifest.json` — execution tracking, phase checkpoints, change_rounds audit trail

### Sanity CMS Consumer (`sanity-cms-consumer.*`)

- `sanity-cms-consumer.interview.brief.md` — data consumption brief: query inventory, adapter inventory, caching scheme, Draft Mode decision (requires user approval)
- `sanity-cms-consumer.query-design.md` — full GROQ queries, adapter signatures, revalidation tag mapping, client config, Draft Mode specs (requires user approval)
- `sanity-cms-consumer.manifest.json` — execution tracking, phase checkpoints, change_rounds audit trail

**Never create files with other naming patterns in the specs folder.**

## Document Types

| Type                  | Agent(s)          | Purpose                                                                                         | Requires Approval  |
| --------------------- | ----------------- | ----------------------------------------------------------------------------------------------- | ------------------ |
| `.interview.brief.md` | Builder, Consumer | Structured intake summary (content types for Builder; queries/adapters for Consumer)            | Yes                |
| `.schema-design.md`   | Builder           | Per-type field spec with Sanity types, validation rules, reusable objects, relationship diagram | Yes                |
| `.query-design.md`    | Consumer          | Full GROQ queries, adapter function signatures, revalidation tags, client config                | Yes                |
| `.human-actions.md`   | Builder           | Step-by-step external prerequisites the user must complete before code is written               | Yes (confirmation) |
| `.manifest.json`      | Builder, Consumer | Execution tracking, status, phase checkpoints, change_rounds                                    | No (internal)      |

## Manifest Base Schema

Every `.manifest.json` follows a base schema compatible with `.github/instructions/manifests.instructions.md`:

**Required base fields**: `$schema`, `agent`, `created_at`, `updated_at`, `status`, `approved`, `approved_at`, `change_rounds`.

**Status lifecycle**: `pending → in-progress → pending-approval → [revision-requested →]* completed`

### Sanity CMS Builder Extensions

| Field                     | Type             | Description                                                                                                 |
| ------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `last_completed_phase`    | enum             | `"interview"` \| `"schema-design"` \| `"human-actions"` \| `"bootstrap"` \| `"schemas"` \| `"verification"` |
| `last_completed_step`     | string or null   | Checkpoint within Phase 5–6 (e.g., `"sanity-config"`, `"studio-route"`, `"schema:blog-post"`)               |
| `content_types`           | array of strings | Document type names from approved schema design                                                             |
| `singletons`              | array of strings | Singleton document type names                                                                               |
| `reusable_objects`        | array of strings | Reusable object type names (e.g., `"seo-fields"`, `"portable-text"`)                                        |
| `bootstrap_files_written` | array of strings | Paths of bootstrap files created in Phase 5                                                                 |
| `schema_files_written`    | array of strings | Paths of schema files created in Phase 6                                                                    |
| `prerequisites_confirmed` | boolean          | Whether user confirmed external prerequisites are done                                                      |
| `quality_gates`           | object           | `{ "typecheck": "passed"\|"failed"\|null, "lint": "passed"\|"failed"\|null }`                               |

See `.github/agents/sanity-cms-builder.agent.md` for the full manifest schema and session resume protocol.

### Sanity CMS Consumer Extensions

| Field                  | Type             | Description                                                                                                        |
| ---------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `last_completed_phase` | enum             | `"analysis"` \| `"interview"` \| `"query-design"` \| `"build"` \| `"verification"`                                 |
| `last_completed_step`  | string or null   | Checkpoint within Phase 5 (e.g., `"client"`, `"fetch"`, `"queries:project"`, `"api:revalidate"`)                   |
| `queries`              | array of strings | GROQ query names from approved query design                                                                        |
| `adapters`             | array of strings | Adapter function names from approved query design                                                                  |
| `api_routes`           | array of strings | API route paths created (e.g., `"/api/revalidate"`, `"/api/draft-mode/enable"`)                                    |
| `infrastructure_files` | array of strings | Paths of infrastructure files created in Phase 5                                                                   |
| `draft_mode_enabled`   | boolean          | Whether Draft Mode / Visual Editing was set up                                                                     |
| `quality_gates`        | object           | `{ "typecheck": "passed"\|"failed"\|null, "lint": "passed"\|"failed"\|null, "typegen": "passed"\|"failed"\|null }` |

See `.github/agents/sanity-cms-consumer.agent.md` for the full manifest schema and session resume protocol.
