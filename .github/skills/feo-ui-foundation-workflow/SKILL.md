---
name: feo-ui-foundation-workflow
description: 'FEO UI Foundation agent workflow phases — scenario detection, brief writing, execution steps, and quality gates. Use when the feo-ui-foundation agent needs phase-specific procedures for building the design system foundation from a mockup.'
user-invocable: false
disable-model-invocation: true
---

# FEO UI Foundation Workflow

> Agent-internal workflow skill. Loaded by the `@feo-ui-foundation` agent during its three phases. Not a slash command.

## Pattern Files

| File                                                                   | Load When                                                            |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [path-a-fresh-mockup.patterns.md](./path-a-fresh-mockup.patterns.md)   | Phase 1 — Scenario A: chosen mockup + placeholder tokens (first run) |
| [path-b-update-mockup.patterns.md](./path-b-update-mockup.patterns.md) | Phase 1 — Scenario B: chosen mockup + existing design system         |
| [execution.patterns.md](./execution.patterns.md)                       | Phase 2 — Execute the approved foundation brief                      |
| [quality-gates.patterns.md](./quality-gates.patterns.md)               | Phase 3 — Run quality gates + write foundation manifest              |

## Domain Knowledge (loaded separately)

The agent also reads these skill files for domain knowledge — they are NOT part of this workflow skill:

| Skill                       | File                                          | Contains                                                                                    |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| ui-primitives-customization | `skills/ui-primitives-customization/SKILL.md` | Variant discovery, color separation, cva updates, font registration, shadcn/ui relationship |
| styling-tokens              | `skills/styling-tokens/SKILL.md`              | Flat vs scaled tokens, HSL conversion, config structure, color scale generation             |

Auto-attached instructions (activate by file glob, no manual loading needed):

- `instructions/ui-primitives.instructions.md` — authoring rules (active when editing `src/components/ui/**`)
- `instructions/storybook.instructions.md` — story conventions (active when editing `**/*.stories.tsx`)

## Common Gate Protocol

Both path files (A, B) end with the same approval gate:

1. Tell the user the brief is written.
2. Use `askQuestions`: **Approve foundation brief** / **Request changes** (free-form).
3. If approved: set `approved: true` in frontmatter, proceed to Phase 2 → load `execution.patterns.md`.
4. If changes requested: revise, re-ask. Loop until approved.

**Never proceed to Phase 2 without explicit user approval.**
