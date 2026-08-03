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
only — no fs access — kept apart from a thin store-IO seam with **two backends**: an in-tree JSONL
file and the branch-independent orphan ref `refs/sdd/mission-graph`, resolved at run time. The swap
never touches a derivation.

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

# store home + reach (idempotent; --root defaults to .)
node "<skill>/scripts/mission-graph.mts" migrate  [--root .]
node "<skill>/scripts/mission-graph.mts" sync     [--root .] [--remote origin]
```

- Default `--root` is the current directory. The store home is resolved at run time — the orphan ref
  `refs/sdd/mission-graph` inside a git work-tree, else the in-tree file
  `<root>/.agents/mission-graph/events.jsonl`; `MISSION_GRAPH_STORE=in-tree|orphan-ref` overrides.
  Default `--format` is **TOON**; `--format json` emits the same records as JSON for non-LLM
  consumers.
- **`migrate` retires the in-tree seed** after copying it into the ref — `git rm` the store file,
  leaving the deletion **staged, not committed** (the engine's only working-tree write; it reports that
  the commit is required for the migration to reach other clones). **Why it is not optional:** the seed
  is a *tracked* file, so a seed left behind travels to every clone, where `resolveBackend` prefers it
  over the (never-fetched) ref — the clone reads a **stale list that looks valid** and no `sync` can
  dislodge it, because the seed is precisely what stops the clone consulting the ref. Two guards:
  it **refuses** to retire a seed whose every line is not already in the ref (deleting otherwise would
  be the data loss migration exists to avoid), and it **does** retire a seed an earlier migration left
  behind, so a pre-fix project is repaired by re-running `migrate`.
- **Reach.** `refs/sdd/*` is outside `refs/heads/*`, so git's default refspec never fetches or
  pushes it: the ref is shared by every **worktree of one clone** and travels no further on its own.
  `sync` is the one step that widens that reach.
- **`sync` names the ref explicitly on its own command line**, so it needs **no git configuration and
  writes none** — not a fetch refspec, not a push refspec. Verified: a fresh clone carrying only the
  default `+refs/heads/*:refs/remotes/origin/*` fetches the store ref fine when the refspec is given
  as an argument. The engine never touches `.git/config`.
- **No refspec is ever written in its forced (`+`-prefixed) form.** A leading `+` means *force*: with
  `+refs/sdd/*:refs/sdd/*` in play, a diverged store ref is overwritten at **exit 0** with
  `(forced update)`, silently destroying the local appends — the exact data loss the compare-and-swap
  write path exists to prevent. Non-forced, the same transfer reports
  `! [rejected] (non-fast-forward)` and **exits 1**, leaving the ref intact.
- `sync` is **fast-forward only**, in both directions. Its cases are a **total partition** of
  `(local ref, remote ref)` — each side present or absent, and when both are present the pair is
  exactly one of identical / one an ancestor of the other (either way) / neither:

  Two checks run **before** the partition, in this order — (1) **backend**: under the in-tree backend,
  no-op reporting the home, exit 0, no network touched (an in-tree project must not fail merely for
  being offline); (2) **reachability**: a remote unreachable *or not configured* fails non-zero and is
  **never** reported as "remote has none". Then:

  | local | remote | action |
  |---|---|---|
  | absent | absent | report **both absent**, change nothing |
  | present | absent | push |
  | absent | present | collect |
  | present | present, same commit | report agreement, change nothing |
  | present | present, local is ancestor | fast-forward local |
  | present | present, remote is ancestor | push |
  | present | present, neither is ancestor | **refuse loudly**, report both tips, change nothing |

  There is no `--force`; divergence means two write-deciders, which the store surfaces rather than
  resolves. **The reachability row is load-bearing:** `git ls-remote` fails the same way for an
  unreachable remote as for a missing ref, so a naive read conflates them and lands on "both absent" —
  reporting a benign empty state for a remote it never saw. That is the silent-empty defect this whole
  capability exists to remove; establish reachability first and fail non-zero when it cannot be
  established.
- **Making an ordinary `git fetch` collect the ref too is out of scope here.** That means writing a
  persistent fetch refspec into a clone's config — an opt-in, per-clone setup act with a real cost (a
  diverged store ref then makes unrelated `git fetch` calls exit 1). It belongs to the onboarding
  skill that already asks consent before writing operational config, not to this engine.
- **Recovering from a refused sync.** The refusal names both tips. Read each side's log with
  `git cat-file -p <tip>:events.jsonl`, then — as the single write-decider — rebuild one list holding
  both sides' events and append it forward from the tip you keep. The store is append-only, so no
  event is dropped by that reconcile; `sync` does not automate it, because choosing the surviving
  order is a decision, not a merge.
- **Never configure `remote.<remote>.push`.** Setting it *replaces* the default branch push refspec,
  so a plain `git push` silently stops sending the current branch while reporting
  "Everything up-to-date". `sync` passes its push refspec as an argument and writes no push config.
- **`sync` is orphan-ref-only.** Under the in-tree backend it is a **no-op** that reports the active
  backend — an in-tree store rides its branch and needs no ref transport.
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
