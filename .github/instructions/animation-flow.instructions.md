---
description: >-
  Animation orchestration conventions — folder-per-target structure, manifest schema,
  valid agent names, status lifecycle. Scoped to animation specs directory.
applyTo: .github/flow-generator/animation/specs/**
---

# Animation Flow — Spec Conventions

## Directory Structure

One folder per animation target inside `.github/flow-generator/animation/specs/`:

```
animation/specs/{target-name}/   # kebab-case from component name
├── analyst.manifest.json
├── analyst.recommendations.md
├── orchestrator.manifest.json
├── orchestrator.brief.md
└── implementor.manifest.json
```

## Folder Naming

Kebab-case from component name (e.g., `HeroSection.tsx` → `hero-section`). Append feature context when ambiguous (e.g., `landing-hero-section` vs `about-hero-section`).

## File Naming

Pattern: `{agent-role}.{document-type}.{ext}` — valid agent names: `animation-orchestrator`, `animation-analyst`, `animation-implementor`.

## Manifest Base Schema — `animation-manifest-v1`

Same base fields as `feo-manifest-v1` — `$schema` (`"animation-manifest-v1"`), `agent`, `created_at`, `updated_at`, `status`, `approved`, `approved_at`, `change_rounds`. Agent-specific fields go after the base fields.

## Status Lifecycle

`pending → in-progress → pending-approval → [revision-requested →]* completed`

## Gate Protocol

Each agent owns its full status lifecycle. Agents set `pending-approval` and ask the user directly. The orchestrator reads manifests for `completed` status — it does not run gates for sub-agents. See each agent's `.agent.md` for detailed gate behavior.
