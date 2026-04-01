---
agent: "agent"
description: "Recompile instructions and skills from ADRs"
---

# /sync-knowledge — Knowledge Recompilation

## Workflow

1. Invoke **@knowledge-sync**.
2. Tell it which ADR(s) to sync:
   * Specific ADR: "Sync ADR-0023" — syncs only that ADR's instruction and skill output.
   * All ADRs: "Sync all" — full recompilation. Use sparingly.
3. The agent will:
   * Analyze the ADR(s) and propose a split plan (instruction file + individual skills with descriptions).
   *  Wait for your approval before writing.
   *  Write the instruction and skill files.
   *  Verify coverage and report a summary. 

## When to Run

* After the CTO creates or updates an ADR.
* After merging a PR that modifies any ADR.
* When an agent produces inconsistent output — the skill patterns may be out of sync with the ADR.
