---
name: mission-graph
description: "Internal skill: the mission-graph kernel — a git-tracked, append-only work-graph store folded into a ready frontier and a cycles repair view; used by the cyberfleet-batch dispatch loop, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Mission Graph

The concrete engine for the **mission-graph kernel** (Op1.M1 of cyberfleet-batch): a project's work
list — Missions and Operations, the RAW/parent-child/discovered-from links between them, status
changes, and tombstones — written down as a **git-tracked, append-only event log** (schema `v:1`),
plus a zero-dependency **fold** into two read-only views and one write-time guard:

- **`ready`** — every Mission that is RAW-satisfied (every dependency retired, transitively) and
  not WAW-held (its declared touch-set doesn't clash with in-flight work or a lower-id peer).
  Deterministic and read-only.
- **`cycles`** — every RAW strongly-connected component, reported as a repair item. The fold never
  throws on a knotted plan; every Mission on a cycle (and anything depending on it) is quarantined
  out of `ready` instead.
- **`checkOperation`** — is a hand-declared Operation dependency-closed (the capstone's RAW closure
  ⊆ the declared set), what's its release floor (the closure alone — support members don't gate
  it), and its completed/total progress.

It carries a self-contained `.mts` script (the repo's node-≥23.6 / no-deps convention). Pure
derivations (`fold`, `ready`, `cycles`, `checkOperation`, `proposeEdge`) take and return plain data
only — no fs access — kept apart from a thin store-IO seam (v1: an in-tree JSONL file) so a later
swap to a shared, branch-independent store never touches them.

## Run it

```bash
node "<skill>/scripts/mission-graph.mts" ready     [--root .] [--format toon|json]
node "<skill>/scripts/mission-graph.mts" cycles    [--root .] [--format toon|json]
node "<skill>/scripts/mission-graph.mts" operation --id <operation-id> [--root .] [--format toon|json]

# the write path (append-only; --root defaults to .)
node "<skill>/scripts/mission-graph.mts" append node --id <id> \
  [--kind mission|operation] [--status open|claimed|retired] [--touch-set a,b,c] \
  [--blast <level>] [--hitl|--afk] [--model-tier <tier>] [--brief-pointer <path>] [--capstone <id>]

node "<skill>/scripts/mission-graph.mts" append edge --kind RAW|parent-child|discovered-from \
  --from <id> --to <id> [--override]

node "<skill>/scripts/mission-graph.mts" append tombstone --target node --id <id>
node "<skill>/scripts/mission-graph.mts" append tombstone --target edge --kind <kind> --from <id> --to <id>
```

- Default `--root` is the current directory; the store lives at
  `<root>/.agents/mission-graph/events.jsonl`. Default `--format` is **TOON**; `--format json`
  emits the same records as JSON for non-LLM consumers.
- `append edge` runs the **write-time cycle guard** first: a RAW edge that would close a loop is
  **rejected** unless `--override` is passed (a genuinely-discovered mutual dependency). A
  parent-child/discovered-from edge is never guarded — only RAW ("wait for") edges can cycle.
- `ready`'s frontier entries carry `id, node, operation, blast, hitlOrAfk, modelTier, briefPointer,
  whyReady` — `node` is the node's kind (always `mission`: an Operation is a container, never
  itself scheduled).

## Boundaries

Read-only derivation + an append-only write path over one in-tree store — it does **not** decide
how to split a request into Missions, compute a Mission's touch-set, tell a real collision from a
false one at finer-than-node grain (v1: any same-node touch-set overlap is a hard collision), rank
or annotate the frontier, run or assign a Mission, or coordinate a fleet of agents (all deferred,
see the spec's Non-goals). Status is read **only** from the graph, never from a Mission's
`.plan.md` brief — the graph is the sole scheduling authority.
