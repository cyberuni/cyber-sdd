---
name: discover-plans
description: "Partial Skill: invoke by name only — intake/plan-discovery's engine that surfaces resumable mission plan briefs — used by the sdd gateway on entry, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Discover Plans

The concrete engine for SDD **plan discovery**. It
locates the **resumable missions** in a repo — the mission **plan briefs** under `.agents/plans` —
and returns each one's CR ref, name, todo tally, and `## NEXT` resume lead, **without reading the
rest of the body**, so a consumer (the **gateway**, on entry) can offer resume cheaply. It carries a
self-contained `.mts` script (the repo's node-≥23.6 / no-deps convention). It is the **plan** sibling
of `discover-specs`: that engine finds **specs** by status shape; this one finds **missions** by
their briefs.

## Recognition — location-bounded and shape-confirmed

A file is a mission brief only when **both** hold (`intake/plan-discovery`):

- **Location** — it sits directly under the repo's **`.agents/plans/`** directory (the one plans
  location intake scaffolds into).
- **Shape** — its filename ends `.plan.md` **and** it carries a frontmatter block (the basic plan
  template: `name` + a `todos` list + a `## NEXT` anchor). A `*.plan.md` with no frontmatter is a
  stray and is skipped; a sibling that does not end `.plan.md` (a combat-log `*.log.jsonl`, a loose
  `*.md`) is never a brief.

**Present means resumable.** By default there is **no status filter** — a present brief is already
unretired (the doctrine loop's `plan-retirement` deletes a brief once its CR is done/merged and
distilled), so every brief the scan finds is a resumable mission. The todo tally lets the caller tell
a barely-started mission from one near handoff.

**The `status` dispatch flag.** Each brief may declare a top-level `status` (the mission dispatch
flag — `active` by default, `approved` once a human clears it for headless dispatch). The scan
**reports** it in every row (an unset value reads as `active`), and, **only when a caller passes
`--status <value>`**, narrows the set to that status — the opt-in filter the gateway's dispatch loop
uses to build the approved queue. A value no brief carries yields the empty set. The engine reports
the flag; it never interprets or writes it.

## Run the scan

```bash
node "<skill>/scripts/discover-plans.mts" [--root .] [--format toon|json] [--status <value>]
```

- Default `--root` is the current directory; default `--format` is **TOON** (the token-efficient
  tabular form the gateway scans).
- Emits one row per brief, sorted by CR ref, with columns
  `cr,name,total,completed,inProgress,status,next` — `cr` is the filename slug (`<cr-ref>`), the
  three counts are the todo tally, `status` is the dispatch flag (`active` when unset), and `next` is
  the lead line of the brief's `## NEXT` anchor (the resume hint).
- `--status <value>` narrows to the briefs at that dispatch status (e.g. `--status approved` for the
  dispatch queue); absent, no status filter is applied.
- `--format json` emits the same records as a flat JSON array for non-LLM consumers.

Example (TOON):

```
plans[2]{cr,name,total,completed,inProgress,status,next}:
  github-34,github-34: ...,34,21,0,active,"sub-corpus — suites done, impls pending"
  add-auth,add-auth: ...,6,2,0,approved,"build the token exchange unit"
```

When `node` is absent, an agent performs the same derivation by hand: list `.agents/plans/*.plan.md`,
keep each file carrying frontmatter, tally its `todos` by `status`, and read its `## NEXT` lead.

## Boundaries

Frontmatter + the `## NEXT` section only — it never reads the rest of a brief's body, owns no
lifecycle state, and writes nothing. It **never resumes** a mission (that is `resume-mission`) and
**never retires** a brief (that is `plan-retirement`). Ref resolution over the returned list
(matching a CR ref to a filename slug) is the **caller's** step, not the script's.
