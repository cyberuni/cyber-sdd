---
name: create-spec
description: Use this skill when the user wants to create a spec for a new or existing software feature — scaffold spec.md and a .feature file for a domain.
---

# create-spec

Scaffold `specs/<domain>/spec.md` and `specs/<domain>/<domain>.feature` for a new or existing domain.

## Identify the domain

If the user named a domain, use it directly. The domain name matches the implementation folder (e.g., `governance`, `build`, `auth`).

If no domain was named, list domains under `src/` (or the project's source root) that have no `specs/<domain>/spec.md` yet. Present the list and ask the user to select one before continuing.

## Determine mode

- **New feature** — no implementation exists yet. Ask the user for What, Why, and command surface before proceeding.
- **Backfill** — implementation already exists. `sdd-spec-designer` will infer content from source and tests; user reviews before writing.

If unclear, ask the user which mode applies.

## For the selected domain

### Iteration 0 — draft

Invoke `sdd-spec-designer` with:

```
DOMAIN: <domain name>
DOMAIN_PATH: specs/<domain>/
BACKFILL: <true | false>
PRIOR_VALIDATOR_FEEDBACK: null
USER_ANSWERS: null
USER_INPUT: <user-provided What, Why, command surface — or null for backfill>
```

Wait for `sdd-spec-designer` to complete (including any user review of inferred content) before continuing.

### Quality loop (max 3 iterations)

1. Invoke `sdd-spec-validator` with:
   ```
   DOMAIN: <domain>
   DOMAIN_PATH: specs/<domain>/
   TARGET_STATUS: any
   ```
2. If `overall == "pass"` → exit loop.
3. If `user_questions` is non-empty → ask the user those questions and collect answers.
4. Invoke `sdd-spec-designer` with:
   ```
   DOMAIN: <same>
   DOMAIN_PATH: <same>
   BACKFILL: <same>
   PRIOR_VALIDATOR_FEEDBACK: <validator output JSON>
   USER_ANSWERS: <collected answers, or null>
   USER_INPUT: null
   ```
5. Repeat from step 1.

If the loop completes 3 iterations without `overall == "pass"`, continue with status `accepted-pending-review`.

## Report

- Domain specced
- Files written (spec.md, .feature, README.md changes)
- Quality gate outcome: `pass` or `accepted-pending-review`
- Unresolved check failures (if `accepted-pending-review`)
- Number of quality-loop iterations taken
- Next step: run `validate-spec` before changing Status from Draft → Approved

## Commit

After a successful quality gate, commit with:

```
docs(specs): add <domain> spec
```
