# Phase 3 — Quality Gates

> Loaded by `@feo-ui-builder` during Phase 3. Run all gates, update manifest to `pending-approval`.

## Gate Execution

Run each gate in order. Record result as `"pass"` or `"fail"` in `ui-builder.manifest.json` → `quality_gates`.

If a gate fails: fix the issue, re-run that gate. Do not skip gates.

## Gates

### G0 — Section Completeness

Every section listed in `ui-builder.manifest.json` → `sections` has a corresponding folder in `src/components/features/<page-name>/` with a `.tsx` file and `index.ts` barrel.

Every layout component listed in `layout_components` has a corresponding folder in `src/components/layout/`.

### G-Cascade — Primitive Manifest Sync

Before building sections, verify that primitive metadata consumed from `catalog.json` is current. The builder does not edit primitives — this gate **reads and validates**, it does not fix.

For each primitive the builder imports in built components:

1. Verify the primitive has a co-located `manifest.json` in `src/components/ui/<name>/`.
2. Verify `manifest.json` `variantAxes` keys match the `axes` array in `catalog.json` for that primitive.
3. Verify that every variant value used in built components (e.g., `variant="primary"`, `size="lg"`) exists in the primitive's `manifest.json` `variantAxes`.

If a primitive lacks a `manifest.json` or uses variant values not listed in its manifest → **do not proceed**. Report to the user: which primitive is out of sync and request a foundation agent re-run to fix the cascade.

See `ui-primitives.instructions.md` → Cascade Rule for the full protocol.

### G1 — Primitives-First

Read `src/components/ui/catalog.json` to get the current primitive inventory. For each primitive, verify that raw HTML is not used where the primitive covers the use case. Common patterns to check:

- Raw `<section` → should use a Section-type primitive if one exists
- Raw `<div className="mx-auto max-w-` → should use a Container-type primitive
- Raw `<div className="flex` → should use a layout/stack primitive
- Raw heading/paragraph elements with ad-hoc text classes → should use a typography primitive
- Raw `<hr` → should use a separator primitive

The catalog is the source of truth — if a primitive exists for a pattern, use it.

### G2 — Token Compliance

Scan all `.tsx` files in `features/` and `layout/` for forbidden Tailwind default palette usage:

- No `text-gray-`, `bg-slate-`, `border-zinc-`, `text-red-`, `bg-blue-`, etc.
- Only project tokens from `tailwind.config.ts` are allowed.

### G3 — Heading Hierarchy

Parse the assembled page (follow imports from `page.tsx`) and verify:

- Exactly one `h1` element across the full page (via Typography `as="h1"` or variant that defaults to h1)
- No skipped heading levels (h1 → h2 → h3, never h1 → h3)

### G4 — Image Handling

Every `<img` or image element must use `next/image` (`Image` from `next/image`):

- Has explicit `width`/`height` OR `fill` prop
- Has non-empty `alt` text

### G5 — Server-Only

Zero `'use client'` directives in any file under `src/components/features/` or `src/components/layout/` **except files listed in `client_skeletons[].file`** in `ui-builder.manifest.json`.

For each `'use client'` file found: verify its path appears in at least one section's `client_skeletons[].file`. If it does not appear in the manifest, it is an unauthorized client component — fix or remove it.

Zero React hook imports (such as `useState`, `useEffect`, `useRef`) in any file **not** listed in `client_skeletons[].file`.

Zero event handler props (such as `onClick`, `onChange`, `onSubmit`) in any file **not** listed in `client_skeletons[].file`.

Skeleton files listed in `client_skeletons[].file` are permitted to have `'use client'` but must still have zero hook imports and zero event handler props — skeletons are pass-through only.

### G6 — Content Contracts

- Both content files exist at the paths specified in the manifest: `content_contracts` (page-specific) and `layout_contracts` (layout content).
- Every feature section receives its content via typed props from the page content file — no hardcoded strings in JSX.
- Every layout component receives its content via typed props from `src/dictionaries/layout.ts`.
- All content interfaces are exported from their respective contracts files.

### G7 — Barrel Exports

- Every component folder (`features/<name>/`, `layout/<name>/`) has an `index.ts`.
- `page.tsx` imports feature sections from barrels, not from internal file paths.
- `layout.tsx` imports layout components from barrels, not from internal file paths.

### G8 — Code Style

Scan all files written during execution for TypeScript convention violations:

- No `function` declarations — all components and helpers must use arrow function expressions.
- No `import type { … }` — must use inline `import { type … }` syntax.
- Import groups must be separated by blank lines in the correct order (react → next → external → @/\* → parent → sibling → type-only).
- No `console.log` statements.
- No unnecessary JSX curly braces (`prop="value"` not `prop={"value"}`).
- All empty elements must be self-closed.
- No `export default` except in Next.js special files.

If any violation is found: fix it, then re-run this gate.

### G9 — Build Verification

Run `pnpm build`. Must exit with code 0 and no TypeScript errors.

Skeleton client components must compile cleanly in isolation: they use `'use client'` but contain no hook imports (such as `useState`, `useEffect`) and no library imports (such as Radix, Embla) that require a full client runtime. A skeleton that only renders `{children}` should always pass.

### G10 — Visual Fidelity Check

This gate requires user confirmation. The agent cannot self-verify visual fidelity.

1. Tell the user: "Please open the built page (`pnpm dev` → localhost:3000) and compare it side-by-side with the mockup (`public/_mockups/<source_mockup>`). Target: ≥85% visual fidelity — layout structure, spacing rhythm, typography scale, color usage, and responsive behavior should closely match the mockup."

2. Use `askQuestions` with these options:
   - **Approve — fidelity is acceptable**
   - **Request fixes** — free-form input describing what doesn’t match

3. If approved: gate passes, proceed to manifest completion.
4. If fixes requested: apply the fixes, re-run G9 (build verification), then re-ask G10. Loop until approved.

## Finalize Manifest

After all gates pass:

1. Set `status: "pending-approval"` in `ui-builder.manifest.json`.
2. Set `completed_at` to current ISO timestamp.
3. Set `last_completed_step: "completed"`.
4. Set `updated_at` to current ISO timestamp.
5. Verify all `quality_gates` entries are `"pass"`.
6. Verify every section has a `client_skeletons` key (empty array `[]` if none were created).

Run the **Approval Gate**: present a summary to the user — **"Page build complete. [N] sections and [M] layout components built. [K] client skeleton(s) created. All [G] quality gates passed (including visual fidelity)."** — and use `askQuestions` with **Approve** / **Request changes**. On approval: set `approved: true`, `approved_at`, `status: "completed"` and yield. On changes: append to `change_rounds[]`, set `status: "revision-requested"`, address the feedback, and re-run the gate.
