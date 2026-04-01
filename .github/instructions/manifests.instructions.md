---
description: >-
  Manifest base schema, status lifecycle, change_rounds audit trail, and gate protocol.
  Scoped to all files in the flow-generator specs directory.
applyTo: .github/flow-generator/FE/specs/**
---

# Manifest Conventions

## Base Schema — REQUIRED

Every `.manifest.json` in `.github/flow-generator/FE/specs/` MUST include these fields
before any agent-specific extensions:

```json
{
  "$schema": "feo-manifest-v1",
  "agent": "<agent-name>",
  "created_at": "<ISO 8601>",
  "updated_at": "<ISO 8601>",
  "status": "<status enum>",
  "approved": false,
  "approved_at": null,
  "change_rounds": []
}
```

| Field           | Type                        | Description                                                  |
| --------------- | --------------------------- | ------------------------------------------------------------ |
| `$schema`       | string                      | Always `"feo-manifest-v1"`                                   |
| `agent`         | string                      | Agent name that owns this manifest (e.g., `"ui-foundation"`) |
| `created_at`    | ISO 8601 datetime           | When manifest was first created                              |
| `updated_at`    | ISO 8601 datetime           | Last modification time — update on every write               |
| `status`        | enum                        | Current lifecycle state (see Status Flow below)              |
| `approved`      | boolean                     | Whether user has approved the agent's work                   |
| `approved_at`   | ISO 8601 datetime or `null` | When the user approved — set by owning agent                 |
| `change_rounds` | array                       | Audit trail of user feedback and agent responses             |

Agent-specific fields (e.g., `mockup_mapping`, `sections[]`, `quality_gates`) go **after**
the base fields. See each agent's `.agent.md` for its extension schema.

## Status Flow

```
pending → in-progress → pending-approval → [revision-requested →]* completed
```

| Status               | Meaning                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `pending`            | Manifest created, work not yet started                              |
| `in-progress`        | Agent is actively working                                           |
| `pending-approval`   | Work complete — agent presents summary and asks user directly       |
| `revision-requested` | User requested changes — agent re-working (see Change Rounds)       |
| `completed`          | User approved — owning agent set `approved: true` and `approved_at` |

**Key rule**: Each agent owns its full status lifecycle — from `pending` through `completed`.
The owning agent sets every status transition, including `"completed"` after explicit user approval.

## Change Rounds

When the user requests changes at a gate, the owning agent appends a new entry:

```json
{
  "round": 1,
  "requested_at": "<ISO 8601>",
  "feedback": "<user's feedback verbatim>",
  "resolved_at": null,
  "changes_made": []
}
```

The owning agent then addresses the feedback and fills in:

```json
{
  "resolved_at": "<ISO 8601>",
  "changes_made": ["Updated primary-500 from #3b82f6 to #1e40af", "..."]
}
```

| Field          | Type                        | Description                                    |
| -------------- | --------------------------- | ---------------------------------------------- |
| `round`        | number                      | Sequential round number (1, 2, 3...)           |
| `requested_at` | ISO 8601 datetime           | When user requested changes                    |
| `feedback`     | string                      | User's feedback verbatim                       |
| `resolved_at`  | ISO 8601 datetime or `null` | When agent addressed the feedback              |
| `changes_made` | array of strings            | What the agent changed to address the feedback |

**Never delete previous rounds** — they are the audit trail.

## Gate Protocol — Self-Managed

Every implementation agent owns its approval gate. The orchestrator does NOT act as middleman — the agent that did the work asks the user directly and handles revisions in-place (preserving full working context).

1. Agent completes work → **WRITE** manifest: `status: "pending-approval"` (CHECKPOINT)
2. Agent presents a summary to the user
3. Agent uses `askQuestions`: **Approve** / **Request changes** (free-form input)
4. If **approved** → **WRITE** manifest: `approved: true`, `approved_at: <ISO 8601>`, `status: "completed"` → yield to orchestrator
5. If **changes requested** → **WRITE** manifest: append to `change_rounds[]`, `status: "revision-requested"` → agent makes changes (still has context) → **WRITE** manifest: resolve `change_rounds` entry, `status: "pending-approval"` → loop back to step 2

When the agent yields, the orchestrator verifies `status: "completed"` and proceeds to the next phase.

## Checkpoint Contract

Every status transition is a manifest **write BEFORE the action it protects**. This is the crash-safety guarantee — if the process crashes at any point, the orchestrator can re-invoke the agent and it will resume from the last checkpoint.

| Crash point                              | Manifest state on disk | Recovery                                                                                                  |
| ---------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| During work (before gate)                | `in-progress`          | Orchestrator re-invokes agent → agent resumes from `last_completed_step`                                  |
| After checkpoint 1, before user answers  | `pending-approval`     | Orchestrator re-invokes agent → agent re-runs gate (asks user again)                                      |
| After user approves, before checkpoint 2 | `pending-approval`     | Orchestrator re-invokes agent → agent re-runs gate (user approves again — idempotent)                     |
| After checkpoint 2                       | `completed`            | Orchestrator sees `completed` → moves to next phase                                                       |
| During revision work                     | `revision-requested`   | Orchestrator re-invokes agent → agent reads feedback from `change_rounds`, makes changes, returns to gate |

**Write-before-action is non-negotiable.** Never ask the user before writing `pending-approval`. Never make changes before writing `revision-requested`. 6. Agent reads latest `change_rounds` entry, makes changes, sets `status: "pending-approval"` → loop back to step 2

**The agent that did the work handles revision requests.** The orchestrator does not
re-assign work to a different agent.

## Timestamps

Always use ISO 8601 format with UTC timezone: `2026-03-24T10:30:00Z`

## Session Resume

When an agent resumes and finds its manifest with `status: "pending-approval"`:
→ Present work for approval (do not re-execute).

When an agent resumes and finds `status: "revision-requested"`:
→ Read the latest `change_rounds` entry, address the feedback, then set `status: "pending-approval"`.
