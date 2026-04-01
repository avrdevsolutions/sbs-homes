# Phase 5 — Quality Gates

> Loaded by `@page-architect` during Phase 5. Run all gates, present summary, and manage the final approval gate.

## Prerequisites

- All Phase 4 execution steps completed
- `last_completed_step` is `"route"` or `"new-sections"`

## Gate Execution

Run each gate in order. Record result as `"pass"` or `"fail"` in `page-architect.manifest.json` → `quality_gates`.

If a gate fails: fix the issue, re-run that gate. Do not skip gates.

---

## Gates

### G0 — Type Check

Run `pnpm tsc --noEmit`.

- **Pass**: zero errors.
- **Fail**: fix type errors. Common causes:
  - Content object doesn't match type shape (missing field, wrong type)
  - Import path typo after refactoring
  - Renamed component not updated in barrel export

### G1 — Lint

Run `pnpm lint`.

- **Pass**: zero errors (warnings are acceptable).
- **Fail**: fix lint errors. Common causes:
  - Function declarations instead of arrow expressions
  - Missing `type` keyword on type-only imports
  - Import ordering
  - `console.log` leftover from debugging

### G2 — Reference Page Regression

Verify the reference page (if one was used) still functions after refactoring:

1. Read the reference page's route file (`src/app/{original-route}/page.tsx`).
2. Verify all imports resolve (the type check in G0 covers this, but explicitly confirm the route file is clean).
3. Read the reference page's content file — verify it imports types from the shared types file correctly.
4. Read the feature folder barrel export — verify all section components are exported with their new names.

- **Pass**: route file imports resolve, content file types match, barrel export is complete.
- **Fail**: fix broken imports or missing exports in the refactored files.

### G3 — Content Completeness

Verify the new content file has no gaps:

1. Read `src/dictionaries/{new-page}.ts`.
2. For every field in every section type:
   - Field has a non-empty value (no `''`, no `[]` where items are expected)
   - Images have `src`, `alt`, `width`, `height` (or at minimum `src` and `alt`)
   - CTAs have both label text and href
3. `/* REVIEW */` comments are acceptable (they flag uncertain content for the user) — but the field itself must have a value.

- **Pass**: all fields populated.
- **Fail**: fill in missing content — draft from analysis document or ask the user.

### G4 — Primitives-First

If new section components were created (Step 4):

1. Read `src/components/ui/catalog.json`.
2. For each new component, verify raw HTML is not used where a primitive exists:
   - Raw `<section>` → should use `Section` primitive
   - Raw `<div className="mx-auto max-w-` → should use `Container`
   - Raw `<div className="flex` → should use `Stack`
   - Raw heading/paragraph with ad-hoc text classes → should use `Typography`
   - Raw `<hr>` → should use `Separator`

- **Pass**: primitives used where available.
- **Fail**: replace raw HTML with primitive equivalents.

### G5 — Token Compliance

Scan all new or modified `.tsx` files for forbidden Tailwind usage:

- No `text-gray-`, `bg-slate-`, `border-zinc-`, `text-red-`, `bg-blue-`, or any default Tailwind palette color.
- No arbitrary values (`w-[28px]`, `text-[#ff0000]`) in className.
- Only project tokens from `tailwind.config.ts`.

- **Pass**: no forbidden tokens.
- **Fail**: replace with project tokens.

### G6 — Barrel Exports

Verify all component folders have correct barrel exports:

1. New feature folder (if created): `index.ts` exports all section components.
2. Renamed feature folder: `index.ts` exports all components with updated names.
3. Top-level `src/components/features/index.ts` (if it exists): includes the new/renamed feature.

- **Pass**: all barrels correct.
- **Fail**: fix missing or incorrect exports.

---

## Final Summary

After all gates pass, prepare a summary for the user:

```markdown
## Page Architect — Build Summary

### Target: [route] ([feature-name])

### Files Created

- [list of new files with paths]

### Files Modified

- [list of modified files with what changed]

### Refactoring

- [summary: types extracted, folder renamed, components renamed, hardcodes fixed]

### Sections

| Section       | Strategy    | Status |
| ------------- | ----------- | ------ |
| hero          | genericized | ✓      |
| product-lines | as-is       | ✓      |
| ...           | ...         | ...    |

### Quality Gates

| Gate          | Status     |
| ------------- | ---------- |
| G0 Type Check | pass       |
| G1 Lint       | pass       |
| G2 Regression | pass       |
| G3 Content    | pass       |
| G4 Primitives | pass / N/A |
| G5 Tokens     | pass       |
| G6 Barrels    | pass       |

### Content Review Items

- [any `/* REVIEW */` markers that need user attention]
```

## Final Approval Gate

1. Set manifest `status: "pending-approval"`.
2. Present the summary to the user.
3. Use `askQuestions`: **Approve** / **Request changes** (free-form).
4. If **approved**:
   - Set `approved: true`, `approved_at: <ISO 8601>`, `status: "completed"`.
   - Report: **"Page build complete. [route] is ready."**
   - Offer: **Build another page** / **Done**.
5. If **changes requested**:
   - Append to `change_rounds[]`: `{ "round": <N>, "requested_at": "<ISO>", "feedback": "<verbatim>", "resolved_at": null, "changes_made": [] }`.
   - Set `status: "revision-requested"`.
   - Address feedback (edit files, re-run affected gates).
   - Fill in `change_rounds[]` entry: `resolved_at`, `changes_made[]`.
   - Set `status: "pending-approval"`. Loop back to step 2.
