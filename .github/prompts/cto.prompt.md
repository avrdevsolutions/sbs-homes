---
agent: "agent"
description: "Architecture decisions: create or update ADRs"
---

# /cto — Architecture Decisions

## Workflow

1. Invoke **@cto**.
2. Describe the technology decision, tradeoff, or standard to evaluate.
3. The CTO agent runs a phased process:
   - **Research** — Uses web search and Context7 MCP to research current best practices, audits real-world implementations, reviews existing ADRs for consistency, and maps the full pattern space.
   - **Scope Verification (gate)** — Presents the planned scope (covered patterns, out-of-scope items, series context) and waits for your approval before writing.
   - **Write** — Writes the ADR following existing format conventions, with library recommendations where appropriate.
   - **Self-Check** — Verifies every pattern has when-to-use/when-not-to-use/a11y/responsive, cross-references are accurate, and no requested patterns were dropped.
   - **Catalog Update** — Updates `docs/adrs/catalog.md` with the new entry.
4. After the ADR is written, remind the user to run `/sync-knowledge` to recompile instructions and skills.

## When to Use

- Evaluating a new library or tool.
- Changing an existing architectural decision.
- Adding a new standard or pattern to the project.
- Resolving conflicting approaches found during development.

## ADR Format

Follow the existing format in `docs/adrs/` — numbered sequentially (no gaps), with title, status, context, decision, and consequences sections.
