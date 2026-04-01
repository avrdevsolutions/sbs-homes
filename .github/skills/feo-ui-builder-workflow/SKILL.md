---
name: feo-ui-builder-workflow
description: 'FEO UI Builder agent workflow phases — mockup analysis, section discovery, brief writing, component execution, and quality gates. Use when the feo-ui-builder agent needs phase-specific procedures for translating a mockup into React components.'
user-invocable: false
disable-model-invocation: true
---

# FEO UI Builder Workflow

> Agent-internal workflow skill. Loaded by the `@feo-ui-builder` agent during its three phases. Not a slash command.

## Pattern Files

| File                                                       | Load When                                                              |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| [analysis-brief.patterns.md](./analysis-brief.patterns.md) | Phase 1 — Mockup analysis, section discovery, brief writing            |
| [execution.patterns.md](./execution.patterns.md)           | Phase 2 — Content contracts, feature components, layout, page assembly |
| [quality-gates.patterns.md](./quality-gates.patterns.md)   | Phase 3 — Run quality gates + finalize page-builder manifest           |

## Auto-Attached Instructions (activate by file glob, no manual loading needed)

- `instructions/features.instructions.md` — feature component rules (active when editing `src/components/features/**`)
- `instructions/layout-components.instructions.md` — layout component rules (active when editing `src/components/layout/**`)
- `instructions/components.instructions.md` — tier system + primitives-first (active when editing `src/components/**`)
- `instructions/typescript-conventions.instructions.md` — code style (active when editing `**/*.ts, **/*.tsx`)

## Gate Protocol

Phase 1 ends with an approval gate before the pipeline continues:

1. Tell the user the brief is written.
2. Use `askQuestions`: **Approve page builder brief** / **Request changes** (free-form).
3. If approved: set `approved: true` in frontmatter, proceed to Phase 2 → load `execution.patterns.md`.
4. If changes requested: revise, re-ask. Loop until approved.

**Never proceed to Phase 2 without explicit user approval.**
