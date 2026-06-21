---
name: validate-spec
description: Use this skill when the user wants to check a spec for completeness, consistency, or readiness to advance status (Draft → Approved or Approved → Implemented).
---

# validate-spec

Validate a spec before approving it or marking it Implemented.

## State check (deterministic, run first)

Run the static state-machine check — it rejects illegal `(status, aligned, markers, .feature)` tuples and malformed `approved-by` attribution (e.g. `draft + aligned:true`, an approved spec with no `.feature` or no recorded approver, a `by: agent` self-assertion with no `why`):

```bash
node "<skill>/scripts/check-spec-state.mts" [--root <specs-dir>]
```

Exit `0` = states legal; exit `1` = it prints each violation as `✗ <slug>: <reason>`. A violation blocks the transition — fix the frontmatter before continuing. If `node` is unavailable, perform the same checks by reading each `spec.md` frontmatter yourself.

## Identify the target

If the user named a domain or path, resolve it directly to `specs/<domain>/spec.md`.

If no target was named, ask the user which domain to validate.

## Determine the validation context

Ask or infer which status transition is being validated:

- **Draft → Approved** — spec is being reviewed for the first time
- **Approved → Implemented** — checking that tests cover all scenarios
- **General review** — no specific transition; check completeness only

Map to GOAL:

| Context | GOAL |
|---|---|
| Draft → Approved | `approval` |
| Approved → Implemented | `implementation` |
| General review | `exploration` |

## Invoke sdd-orchestrator

```
DOMAIN: <domain>
DOMAIN_PATH: specs/<domain>/
GOAL: <derived from context>
USER_INPUT: null
BACKFILL: false
```

## Report

Present results clearly:

- PASS / FAIL per check (relay from sdd-orchestrator → sdd-spec-validator output)
- Aligned: `true` or `false` (from ALIGNED in author summary); if `false`, list which artifacts in `## Artifacts` are missing or out of sync
- If any checks failed: list of issues to fix and OPEN_QUESTIONS from author summary
- If GOAL_ACHIEVED is false: surface BLOCKER from author summary
- If GOAL_ACHIEVED is true: confirm the spec has advanced to the next status

Do not fix issues automatically — report them for the user to address or confirm intent.
