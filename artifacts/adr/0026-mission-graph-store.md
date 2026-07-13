# ADR-0026: The mission graph store — SDD-native, per-repo, git-tracked

## Status

Accepted

Scope: this ADR records the **store** decision — where and how the mission graph persists. The
compiler/scheduler *model* that reads and grows the graph (lowering, hazards, `ready`/`cycles`
semantics) is [ADR-0025](0025-mission-graph-compiler-scheduler-model.md).

## Context

ADR-0025's mission graph is **monadic** — nodes, edges, and touch-sets are discovered while working,
not known ahead — so it must persist and grow across sessions. Naming is settled: the **mission
graph** is the *noun* (nodes + edges + status you query); a git-backed **ledger/store** is the
*storage mechanism* — a log at the persistence layer, a graph at the query layer ("DAG log" is
retired; it mixed those layers).

Facts that shape the choice:

1. **Scale ceiling ≈ 1k entries.** This is a per-project CR/Mission planner, not a general issue
   tracker. At that scale a naive whole-graph fold is milliseconds; no DB, index, or incremental
   algorithm is warranted.
2. **The value lives above any store.** SSA lowering, WAW/WAR from touch-sets, and Operation-ordered
   retirement are ours regardless of persistence. Prior art (beads) independently converged on the
   same primitives — cycle-rejected dep-DAG, `discovered-from` growth, a `ready` frontier — which
   validates the model, but a generic issue tracker would store nodes + RAW deps only: ~80% of the
   easy part, ~0% of the hard part.
3. **A single write-decider.** One actor decides every write — v1: the conductor, by hand; F3: the
   Operator's lifecycle loop — with missions *reporting* facts up the existing relay and the decider
   appending. Writes serialize through one point.
4. **The repo is zero-dep TS/`.mts`/`npx`.** New toolchains (Go, Rust, a DB process) are a real cost.

## Decision Drivers

- **Locality principle: shared storage infra must not dictate locality.** The store follows the
  data's natural scope. Mail is global by nature (owner inboxes receive from headless/cron agents
  anywhere); the mission graph is **per-repo by nature** (one spec corpus, one trunk, one touch-set
  space).
- One provenance home — do not stand up a second store competing with the SDD plan briefs and ledger.
- Keep an audit trail of how the monadic graph grew.
- No new toolchain, DB, or daemon at ~1k-entry scale.
- Branch-independent reads once a fleet runs missions on their own branches (F3) — without touching
  the `ready`/`cycles` reasoning.

## Considered Options

### Option 1: Adopt beads (Go + Dolt)

- **Pros**: closest existing tool; independently converged on our primitives (`ready`, cycle-rejected
  dep-DAG, `discovered-from`) — the reasoning comes prebuilt.
- **Cons**: Dolt is a DB/process to run; invasive auto-git behavior; the heaviest option; its generic
  issue schema does not carry touch-sets, overlap classification, or Operations — the easy 80%, none
  of the hard part. **Rejected.**

### Option 2: Adopt beads_rust (`br`)

- **Pros**: operationally much closer — embedded SQLite + JSONL, self-contained ~5–8 MB binary,
  non-invasive (never commits, no hooks).
- **Cons**: the schema impedance remains (touch-sets/overlap/Operation don't fit its issue schema);
  it is a **second provenance store** competing with the SDD plan briefs; a Rust toolchain dep in a
  zero-dep TS/`.mts`/`npx` repo; and it earns little — the interesting relations are computed outside
  it anyway. **Rejected.**

### Option 3: Drop to Dolt directly

- **Pros**: a version-controlled, queryable database — purpose-built for data with history.
- **Cons**: **git already versions our files**; Dolt adds a second versioning system plus a DB
  process for ~1k entries. beads_rust abandoning Dolt for SQLite confirms it was overkill even for
  beads' own scale. **Rejected.**

### Option 4: The cyberlegion global hub (mailbox substrate)

- **Pros**: an existing store with a proven `FileStore`→`SqliteStore` seam; one shared substrate for
  all agent coordination.
- **Cons**: the hub resolves to `~/.agents/cyberlegion` (verified empirically in `paths.ts`
  `resolveRoot`) — **user-global, not git-tracked, shared across every repo**. Reusing it means
  rebuilding **GasTown** — its global HQ + Beads work-state records + the files→SQLite/Dolt slide
  the `Store` interface already sanctions — the architecture Options 1–3 reject. `--space`-scoping a
  global store only *fakes* per-repo locality against the grain. The hub is right for **mail**
  (global by nature); it is the wrong locality for the mission graph. **Rejected.**

### Option 5: SDD-native, per-repo, git-tracked store *(chosen)*

- **Pros**: correct locality — the graph travels with the repo and its history; unifies provenance
  beside the plan briefs; no new toolchain, DB, or process; append-only + git = a free audit trail;
  ~ms folds at the design ceiling.
- **Cons**: we own the store and reimplement beads' `ready`/`cycles` primitives (small at our scale);
  v1 in-tree files are branch-coupled until the F3 orphan-ref move.

## Decision

Adopt **Option 5** — an **SDD-native, per-repo, git-tracked** mission graph store, a new artifact
**beside** the plan briefs `discover-plans` already lists (honest scoping: `discover-plans` reads a
flat brief list — the graph is new; the briefs stay the detail layer). beads/beads_rust remain
design *reference*, not runtime dependencies.

- **Single write-decider ⇒ no sharding.** One actor decides every write (v1: the conductor, by hand;
  F3: the Operator's lifecycle loop), invoking the SDD mission-graph engine to append. With writes
  serialized through one decider, per-writer sharding (ADR-0020's `ledger/` pattern) earns nothing —
  a plain append-only file (or small current-state file-set) suffices. **Append-only is kept for the
  audit trail** (how the monadic graph grew), *not* for collision-avoidance. Sharding returns only if
  a real multi-decider case ever appears.
- **Schema versioned from v1.** Every event carries a schema version (`v: 1` to start). Deferred
  fields (finer touch-set tiers, auto-computed `blast`, `hitl|afk`, per-event originator) land
  **additively**; the fold tolerates mixed versions — no migration, ever, on a store that can't be
  rewritten.
- **Tombstone/retract event kind from v1.** Append-only can't delete, so edge-retraction and
  mission-fusion (cycle repair, later re-cuts) use a **tombstone event** the fold honors. A schema
  primitive from day one — cheap now, painful to retrofit.
- **Status authority = the graph, not the brief.** The graph owns **scheduling state** (open /
  claimed / retired — what `ready` folds); the brief owns the **detail layer + the human dispatch
  clearance** (`status: approved`, a human-attributed leash flag). Different axes, no shared field;
  on conflict the graph wins — a brief outliving a graph-retirement is `plan-retirement` sweep debt,
  never a second truth.
- **Write-ownership.** The SDD mission-graph engine is the only write mechanism (no hand-edits); the
  single write-decider is the only authorized caller. A per-event **originator** stamp is deferred
  (YAGNI — its only consumers, telemetry and the Warden's partition-quality metric, don't exist yet;
  git history gives coarse who/when for free); it lands as an additive schema-v2 field when a
  consumer arrives.
- **Physical home — behind a read/write seam** that abstracts the *git access mechanism* (not
  file-vs-DB — that swap is the Dolt slide, avoided at this scale):
  - **v1 = in-tree git-tracked files.** Single session, no fleet ⇒ no cross-branch visibility
    problem exists; the conductor writes graph files on its working branch like any tracked file,
    merged via the normal PR. Zero new git machinery.
  - **F3 = the orphan ref `sdd/mission-graph`.** When the fleet runs, missions execute on their own
    branches, so the graph moves onto a dedicated **in-repo orphan ref** — git-tracked and per-repo
    (correct locality) yet **branch-independent** (every ship reads the same graph regardless of its
    checkout). This is **our Dolt — a git-backed queryable datastore — in-repo, not global and not a
    separate DB.** The v1→F3 swap happens behind the seam and never touches `ready`/`cycles`.
- **Mission-graph management is SDD work, not cyberfleet.** Read/query/write is an **SDD engine** —
  the same layer that owns `ready`/`cycles`. cyberfleet only *consumes* `ready` and *calls* the SDD
  write path from its lifecycle loop (an orchestrator, not the store's owner) — no cross-package
  layer inversion: SDD owns both the reasoning and the store.

## Rationale

The locality principle decides it: each rejected option imports storage infrastructure whose
locality contradicts the data's. beads/Dolt bring a DB and process model the ~1k ceiling never
justifies; beads_rust brings a second provenance store and a foreign toolchain for relations we
compute outside it anyway; the cyberlegion hub is user-global — right for mail, wrong for a graph
bound to one spec corpus, one trunk, one touch-set space. Git already provides versioning, history,
and distribution for repo-scoped files; the store rides it instead of duplicating it.

The single write-decider is what makes the simple shape sound: ADR-0020 sharded the ledger because
concurrent writers genuinely collided; here "missions report, the decider writes" removes the
concurrency instead of accommodating it, so sharding is deliberately **not** reused. The seam is
proven by precedent — cyberlegion's own `FileStore`→`SqliteStore` seam shows a storage swap behind a
narrow interface is clean — so committing to in-tree files now does not mortgage the F3 orphan-ref
move.

**Validated by dogfood:** the v1 in-tree store shape was exercised on this project's own plan — the
Op1–Op5 mission graph (`cyberfleet-batch.operations.md`) was hand-authored into it and `ready`-folded
over it, proving the schema carries a real project's Operations, Missions, RAW edges, and WAW
touch-set collisions before anything else consumed it.

## Consequences

### Positive

- The graph travels with the repo: clones, worktrees, and PRs carry the plan and its full history.
- No new toolchain, DB, or daemon; the fold is a zero-dep `.mts` over tracked files.
- One provenance home: graph = structure + scheduling status; briefs = detail; git = who/when.
- Additive schema evolution — deferred fields land without migration; tombstones make re-cuts
  possible without ever rewriting history.

### Negative

- v1 graph writes ride the working code branch; cross-branch visibility waits for the F3 orphan-ref
  move (acceptable: v1 is single-session with no fleet).
- We reimplement `ready`/`cycles` ourselves instead of inheriting beads' (small at ~1k scale).
- The F3 orphan-ref engine is bespoke git machinery still to build.

### Risks

- **Hand-edits around the engine** could corrupt the fold. Mitigated by write-ownership (the engine
  is the only write mechanism) and the fold contract (never crashes; quarantines what it cannot use).
- **The fleet arriving before F3** would put a branch-coupled graph under parallel missions.
  Mitigated structurally: the F3 store move WAW-collides with the v1 store node in the dogfood graph
  itself, serializing it after the kernel — the schedule cannot reach fleet dispatch without it.
- **A genuine second write-decider** would break the no-sharding premise. Resolution is defined:
  fold-time deterministic tie-break for a rare race, and ADR-0020's sharded pattern rehired if
  multi-decider ever becomes the norm.

## Implementation Notes

- v1 ships as the SDD node `sdd/mission-graph`: the store schema (nodes, RAW/parent-child/
  discovered-from edges, status changes, declared node-level touch-sets, `blast`, `hitl|afk`,
  tombstones, `v: 1`) plus the zero-dep `ready`/`cycles` `.mts` engine. WAW/WAR are **not stored** —
  computed from touch-sets at ready-time over the small active frontier.
- Validation follows the engine-suite convention: frozen scenarios over per-scenario **authored**
  fixture graphs, never the live store (it mutates on every retirement).
- F3 open mechanics deferred to that CR: orphan-ref access (git plumbing vs a dedicated worktree for
  the ref) and ledger-shard keying under Mission-shaped machinery (cr-ref vs mission-ref).

## Related Decisions

- [ADR-0025](0025-mission-graph-compiler-scheduler-model.md) — the compiler/scheduler model this store persists;
  `ready`/`cycles` semantics, hazards, and lowering live there.
- [ADR-0020](0020-sharded-ledger.md) — the sharded ledger; the contrast case: sharding answered real
  multi-writer contention, and a single write-decider is why it is deliberately not reused here.
- [ADR-0015](0015-three-tier-provenance-and-plan-handoff.md) — the plan-brief detail layer the graph
  sits beside; the graph adds scheduling authority, the briefs keep the handoff detail.
- Spec node: [`.agents/specs/sdd/mission-graph/README.md`](../../.agents/specs/sdd/mission-graph/README.md)
  — the behavioral spec and frozen suite for the store + `ready`/`cycles` engine.
