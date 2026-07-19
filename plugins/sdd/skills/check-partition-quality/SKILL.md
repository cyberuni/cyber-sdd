---
name: check-partition-quality
description: "Partial Skill: invoke by name only — project-spec/partition-quality's engine: measures from git history how much parallel work a layout permits, and compares candidate layouts. Opt-in from scaffold-project-spec and the formation loop, and runnable standalone; not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Check Partition Quality

Measures, from a project's **own git history**, how much parallel work its layout actually permits —
and compares candidate layouts on the same evidence. The mission scheduler cuts **one mission per
spec-node**, so two changes touching a shared node must serialize; this reports how often that
happens.

Read-only and advisory: it moves no file, writes nothing, and renders **no verdict**. Layout is the
owner's call (`sdd:spec-structure-governance` — adoption over purity).

## Run it

```bash
node "<skill>/scripts/check-partition-quality.mts" \
  --repo <path> --scope <dir> [--partition <name>]... [--floor N] [--limit N] [--format json]
```

- `--scope` — restrict to a subtree (e.g. `src`, `plugins/sdd/skills`). Files outside it are ignored.
- `--partition` — repeatable; compare candidates on the same commits. Built in:
  `top-folder` (the capability cut) · `second-folder` (capability/unit) · `role` (artifact role — the
  layered analogue, useful as a contrast) · `single` (the degenerate floor: no parallel work).
  Default compares `top-folder` against `role`.
- `--floor` — minimum usable multi-file commits before a rate is emitted (default 20).

## Reading the output

**The headline is the parallelizable share** — of two changes drawn from history, how often they
*could* run in parallel. Higher is better.

**Check the control before believing it.** Every run reports the same metric over a **shuffled**
partition of identical node sizes. A partition that does not beat its shuffle explains nothing, and
the run says so.

**The diagnostics are confounded — never headline them.** `within-node co-change` and `mean nodes
touched` both reward a **coarser** partition for being coarse: a single-node partition scores a
*perfect* 1 on each while permitting zero parallel work. They are printed only so a reader can see
why they are not used. Two engines built on them would recommend a layered layout.

## Boundaries

Measurement only — no file is moved, no spec written, no layout approved or rejected. Thin history is
**reported, never scored**: below the floor it emits no rate rather than a confident number drawn
from noise. It reads `git log` and nothing else; no node body, no spec frontmatter.
