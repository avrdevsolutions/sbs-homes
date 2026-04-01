---
description: >-
  Spec file naming convention for the FEO pipeline.
  Scoped to all files in the flow-generator specs directory.
applyTo: .github/flow-generator/FE/specs/**
---

# Flow Generator — Spec File Naming

## Spec File Naming — CRITICAL

All files in `.github/flow-generator/FE/specs/` MUST follow the naming convention:

- `{agent-name}.brief.md` — agent's brief (requires user approval)
- `{agent-name}.manifest.json` — agent's execution tracking
- `{agent-name}.{output}.md` — agent's special outputs (such as `recommendations`)

Valid agent names: `orchestrator`, `design-planner`, `mock-designer`, `ui-foundation`,
`ui-builder`, `ux-analyst`, `ux-integrator`

Orchestrator uses context qualifiers: `orchestrator.design.brief.md`, `orchestrator.ux.brief.md`

**Never create files with other naming patterns in the specs folder.**

## Document Types

| Type                  | Purpose                                    | Requires Approval |
| --------------------- | ------------------------------------------ | ----------------- |
| `.brief.md`           | Instructions for what the agent will build | Yes               |
| `.manifest.json`      | Execution tracking, status, change_rounds  | No (internal)     |
| `.recommendations.md` | Analysis output (UX Analyst)               | Yes               |

## Manifest Base Schema

Every `.manifest.json` follows the `feo-manifest-v1` base schema defined in
`.github/instructions/manifests.instructions.md`. See that file for the required fields
(`$schema`, `agent`, `created_at`, `updated_at`, `status`, `approved`, `approved_at`, `change_rounds`),
status lifecycle, and gate protocol.

## Mockup Files

HTML mockups live in `public/_mockups/` with the pattern:

```
{feature-name}-mockup-r{round}-v{variation}.html
```

No JSON files in the mockups folder. The mock designer's manifest lives in `specs/` as `mock-designer.manifest.json`.
