---
name: page-architect-workflow
description: 'Page Architect agent workflow phases — intake interview, reference page analysis, content extraction, brief writing, execution (refactoring + content + route), and quality gates. Use when the page-architect agent needs phase-specific procedures for creating new pages from existing structures.'
user-invocable: false
disable-model-invocation: true
---

# Page Architect Workflow

> Agent-internal workflow skill. Loaded by the `@page-architect` agent during its five phases. Not a slash command.

## Pattern Files

| File                                                         | Load When                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| [intake-analysis.patterns.md](./intake-analysis.patterns.md) | Phase 1–2 — Intake interview, reference analysis, extraction |
| [execution.patterns.md](./execution.patterns.md)             | Phase 3–4 — Brief writing, approval gate, code execution     |
| [quality-gates.patterns.md](./quality-gates.patterns.md)     | Phase 5 — Run quality gates + final approval                 |

## Auto-Attached Instructions (activate by file glob, no manual loading needed)

- `instructions/features.instructions.md` — feature component rules (active when editing `src/components/features/**`)
- `instructions/layout-components.instructions.md` — layout component rules (active when editing `src/components/layout/**`)
- `instructions/components.instructions.md` — tier system + primitives-first (active when editing `src/components/**`)
- `instructions/typescript-conventions.instructions.md` — code style (active when editing `**/*.ts, **/*.tsx`)

## Gate Protocol

The agent manages two approval gates:

### Extraction Checkpoint (Phase 2)

Lightweight checkpoint — not a full gate. Present extracted content to the user and ask for validation. No manifest status change (stays `in-progress`). If the user corrects content, update the analysis doc and set `extraction_validated: true` in the manifest.

### Brief Gate (Phase 3)

Full approval gate following `manifests.instructions.md` protocol:

1. Write the brief.
2. Present summary. Use `askQuestions`: **Approve brief** / **Request changes** (free-form).
3. If approved: proceed to Phase 4.
4. If changes requested: revise, track in `change_rounds[]`, re-present. Loop until approved.

**Never proceed to Phase 4 without explicit user approval of the brief.**

### Final Gate (Phase 5)

Full approval gate after quality gates pass:

1. Present summary of all changes (files created, files modified, sections, refactoring).
2. Use `askQuestions`: **Approve** / **Request changes** (free-form).
3. If approved: set `status: "completed"`, `approved: true`, `approved_at`.
4. If changes requested: track in `change_rounds[]`, fix, re-run affected gates, re-present.
