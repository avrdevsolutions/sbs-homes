---
description: >-
  SEO pipeline spec file naming convention and manifest schema.
  Scoped to all files in the flow-generator SEO specs directory.
applyTo: .github/flow-generator/seo/specs/**
---

# Flow Generator — SEO Spec Files

## Spec File Naming — CRITICAL

All files in `.github/flow-generator/seo/specs/` MUST follow the naming convention:

- `seo.interview.brief.md` — interview summary (requires user approval)
- `seo.manifest.json` — execution tracking and phase checkpoints
- `seo.human-actions.md` — human-action playbook (final deliverable)

**Never create files with other naming patterns in the specs folder.**

## Document Types

| Type | Purpose | Requires Approval |
| --- | --- | --- |
| `.interview.brief.md` | Structured interview summary | Yes |
| `.manifest.json` | Execution tracking, status, change_rounds | No (internal) |
| `.human-actions.md` | External setup + content strategy + audit cadence | Informational |

## Manifest Base Schema

Every `.manifest.json` follows a base schema compatible with `.github/instructions/manifests.instructions.md`:

**Required base fields**: `$schema`, `agent`, `created_at`, `updated_at`, `status`, `approved`, `approved_at`, `change_rounds`.

**Status lifecycle**: `pending → in-progress → pending-approval → [revision-requested →]* completed`

**SEO-specific extensions**: `last_completed_phase`, `business_type`, `business_name`, `geo_enabled`, `languages`, `pages_audited`, `schemas_applied`, `files_created`, `files_modified`, `copy_suggestions`.

See `.github/agents/seo.agent.md` for the full manifest schema and session resume protocol.
