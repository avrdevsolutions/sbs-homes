---
description: >-
  Page Architect pipeline spec file naming convention and manifest schema.
  Scoped to all files in the page-architect specs directory.
applyTo: .github/flow-generator/page-architect/specs/**
---

# Page Architect — Spec File Naming

## Spec File Naming — CRITICAL

All files in `.github/flow-generator/page-architect/specs/` MUST follow the naming convention:

- `page-architect.brief.md` — execution brief (requires user approval)
- `page-architect.manifest.json` — execution tracking
- `page-architect.analysis.md` — analysis output (reference page map + extracted content)

Valid agent name: `page-architect`

**Never create files with other naming patterns in the specs folder.**

## Document Types

| Type             | Purpose                                                        | Requires Approval |
| ---------------- | -------------------------------------------------------------- | ----------------- |
| `.analysis.md`   | Reference page architecture + extracted content from sources   | Yes (checkpoint)  |
| `.brief.md`      | Full execution plan: sections, content, refactoring, new files | Yes               |
| `.manifest.json` | Execution tracking, status, change_rounds                      | No (internal)     |

## Manifest Schema

The manifest follows the `page-architect-manifest-v1` schema. Base fields match
`.github/instructions/manifests.instructions.md` (`$schema`, `agent`, `created_at`,
`updated_at`, `status`, `approved`, `approved_at`, `change_rounds`).

### Extension Fields

```json
{
  "$schema": "page-architect-manifest-v1",
  "agent": "page-architect",
  "created_at": "<ISO 8601>",
  "updated_at": "<ISO 8601>",
  "status": "<status enum>",
  "approved": false,
  "approved_at": null,
  "change_rounds": [],
  "input_mode": "reference | inspiration | conversation | mixed",
  "reference_page": {
    "route": "<e.g. /windows>",
    "feature": "<e.g. windows-page>",
    "content_file": "<e.g. src/dictionaries/windows-page.ts>"
  },
  "content_sources": [{ "type": "url | image | manual", "source": "<path or URL>" }],
  "target_page": {
    "route": "<e.g. /doors>",
    "feature": "<e.g. doors-page>",
    "content_file": "<e.g. src/dictionaries/doors-page.ts>"
  },
  "last_completed_step": null,
  "extraction_validated": false,
  "refactoring": {
    "needed": false,
    "generic_feature": null,
    "shared_types_file": null,
    "renames": [],
    "files_modified": []
  },
  "sections": [],
  "files_created": [],
  "quality_gates": {}
}
```

`reference_page` is `null` when no existing page is used as a structural template.

### Status Flow

```
pending → in-progress → pending-approval → [revision-requested →]* completed
```

Same lifecycle as `feo-manifest-v1`. See `.github/instructions/manifests.instructions.md`
for the full status enum, `change_rounds` format, and gate protocol.

### Section Entry

Each entry in `sections[]`:

```json
{
  "name": "<section-name>",
  "reuse": "as-is | genericized | new",
  "component": "<ComponentName>",
  "path": "<src/components/features/...>",
  "content_mapped": true
}
```
