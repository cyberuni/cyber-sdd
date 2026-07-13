---
name: place-node
description: "Partial Skill: invoke by name only — project-spec/place-node's engine that suggests a capability home and surfaces duplicates for a new node — used by explore, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Place Node

The concrete engine for the **place-node** step. Given a new
node's `concept` (and optional name), it suggests a **provisional** capability home and catches possible
duplicates, so explore places a node without holding the whole tree in its head (it reads the project-spec's
declared placement map + capability layout). Self-contained `.mts` (the repo's node-≥23.6 / no-deps
convention).

## Run it

```bash
node "<skill>/scripts/place-node.mts" --spec-dir <spec> --concept <c> [--name <n>]
```

- `--concept` — suggests the capability folders where that concept's facets already sit, ranked by count
  (the provisional home). A concept no node yet carries → an empty suggestion: pick any plausible
  capability, finalized at handoff.
- `--name` — surfaces existing nodes whose path overlaps the name ("belongs near X" duplicate-catch).

The home is **derived** from the project-spec's own `concept:` tags, never a stored routing list (the
`corpus/discovery` no-drift rule). For genuinely contested overlaps, the human tie-break rules live in
the placement-map routing table (root `spec.md`), which this tool points to rather than re-deriving.

## Boundaries

Read-only and advisory — it **writes nothing** (no scaffold, no relocation, no frontmatter); placement is
provisional and finalized at handoff (the `start-mission` handoff step), so a
suggestion never has to be correct — only useful. Frontmatter only — no node body is read. When `node` is
absent, an agent does the same by hand: read the `concept:` tags, see where that concept already lives,
and place near them.
