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

## Invoke sdd-spec-validator

```
DOMAIN: <domain>
DOMAIN_PATH: specs/<domain>/
TARGET_STATUS: <Draft→Approved | Approved→Implemented | any>
```

## Report

Present results clearly:

- PASS / FAIL per check (group by category: Required sections, Content quality, .feature quality, Status consistency)
- Summary: total checks passed / total checks
- If any checks failed:
  - List of `priority_issues` to fix
  - User questions from the validator (if any)
- If all passed: confirm the spec is ready to advance to the next status

Do not fix issues automatically — report them for the user to address or confirm intent.
