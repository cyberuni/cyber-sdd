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

- **New feature** — no implementation exists yet.
- **Backfill** — implementation already exists; `sdd-author` will infer content from source and tests.

If unclear, ask the user which mode applies.

## Invoke sdd-author

```
DOMAIN: <domain name>
DOMAIN_PATH: specs/<domain>/
GOAL: exploration
USER_INPUT: <user-provided What, Why, command surface — or null for backfill>
BACKFILL: <true | false>
```

Wait for `sdd-author` to complete (including any grill-me conversation with the user and its internal quality loop) before continuing.

## Report

- Domain specced
- Files written (spec.md, .feature, README.md changes, Artifacts section)
- Quality gate outcome: `pass` or `accepted-pending-review` (from QUALITY_GATE in author summary)
- Aligned: `true` or `false` (from ALIGNED in author summary)
- Open questions remaining (from OPEN_QUESTIONS in author summary)
- Next step: run `validate-spec` before changing Status from Draft → Approved

## Commit

Only commit when ALIGNED is `true`. If ALIGNED is `false`, report which artifacts still need updating before committing.

When ALIGNED is `true`, commit with:

```
docs(specs): add <domain> spec
```
