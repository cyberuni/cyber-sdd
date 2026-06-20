---
name: validate-spec
description: Use this skill when the user wants to check a spec for completeness, consistency, or readiness to advance status (Draft → Approved or Approved → Implemented).
---

# validate-spec

Validate a spec before approving it or marking it Implemented.

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

## Invoke sdd-author

```
DOMAIN: <domain>
DOMAIN_PATH: specs/<domain>/
GOAL: <derived from context>
USER_INPUT: null
BACKFILL: false
```

## Report

Present results clearly:

- PASS / FAIL per check (relay from sdd-author → sdd-spec-validator output)
- Aligned: `true` or `false` (from ALIGNED in author summary); if `false`, list which artifacts in `## Artifacts` are missing or out of sync
- If any checks failed: list of issues to fix and OPEN_QUESTIONS from author summary
- If GOAL_ACHIEVED is false: surface BLOCKER from author summary
- If GOAL_ACHIEVED is true: confirm the spec has advanced to the next status

Do not fix issues automatically — report them for the user to address or confirm intent.
