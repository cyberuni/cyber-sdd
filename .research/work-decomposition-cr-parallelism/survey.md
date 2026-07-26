# Work decomposition & CR-parallelism — prior art behind the mission graph

**Date:** 2026-07 · **Informs:** ADR-0025 (mission compiler/scheduler model), ADR-0026
(mission-graph store), SDD's `.agents/specs/sdd/mission-graph/` (Op1.M1). Working dossier:
`.research/work-decomposition-cr-parallelism/`.

SDD's mission graph compiles change-requests into a set of individually-executable **missions**
plus a schedule for running the independent ones in parallel. Before settling that design, the
project surveyed four adjacent fields that have already solved pieces of the same problem: agent
issue trackers (how do you model "what depends on what"?), build systems (how do you turn a diff
into a safe parallel batch?), merge queues (how do you decide two changes are safe to land
together?), and — because the mission graph borrows its vocabulary from there — CPU and compiler
architecture (data hazards, out-of-order execution, static single assignment). This survey
distills what each field actually does, not just what mission-graph adopted from it.

## Issue-graph / ready-frontier prior art

Agent task/issue trackers model **task-level** dependency graphs, and only a couple of them
compute a live "what can start now" answer rather than a flat list.

- **beads (v1.1.0, 2026-07-04)** is the strongest example: a Dolt-embedded SQL DAG (the
  `.beads/issues.jsonl` export is a mirror, not the source of truth), hash IDs (`bd-a1b2`),
  priority 0–4, and **cycles rejected at write time** (`bd dep add` refuses an edge that would
  close a loop; `bd graph check` audits the rest). It distinguishes **blocking** edges that gate
  readiness (`blocks`, `parent-child`, `conditional-blocks`, `waits-for`) from **informational**
  edges that just record history (`related`, `tracks`, `discovered-from`, `caused-by`,
  `validates`, `supersedes`). `bd ready` folds the graph into a live frontier — transitive
  blocking, computed offline in ~10ms.
- **Wayfinder (v1.1.0, 2026-07-08)** is a methodology layered over an existing tracker
  (GitHub/GitLab/local markdown) rather than its own store. It does breadth-first "fog clearing"
  from one `wayfinder:map` issue into child tickets, uses only the host tracker's **native**
  blocking edge, and defines its **frontier as open + unblocked + unclaimed** (claim = assign to
  self). Its most exportable idea is orthogonal to parallelism: every ticket carries a
  **HITL/AFK label** (human-in-the-loop vs away-from-keyboard) — a HITL ticket must be resolved by
  a live human exchange, the agent may not self-answer. That autonomy-boundary axis maps cleanly
  onto SDD's leash/gate model.
- Everything else in this layer is weaker on parallelism specifically. **Task Master** has a real
  `dependencies[]` DAG (with cycle detection) but its `next` command picks one task, not a ready
  set. **spec-kit** is the only file-format tool with an explicit parallel marker — `[P]` on a
  `tasks.md` line means "different files, no incomplete deps" — but the dependencies themselves
  are hand-written prose ("depends on T012"), and spec-kit's own users filed
  **issue #1934** asking for real dependency syntax. **Kiro** groups independent tasks into
  "waves," but the grouping is agent-inferred each time, never persisted as edges. **Backlog.md**
  and **OpenSpec** track dependencies or checklist grouping with no parallel computation at all.
  Native TODO tools (Codex, Gemini, Amp, Cursor) are flat `{text, status}` lists; the one
  exception is **Claude Code's Task tools**, which added a real DAG (`addBlockedBy`/`addBlocks`,
  auto-unblock, cycle rejection, an `owner` field) — the same shape as beads, independently
  arrived at.

Taken together, this layer converged — independently, without knowledge of each other in most
cases — on the same handful of primitives the mission graph needed: a **cycle-rejected DAG**, a
**discovered-from-style edge** for work that surfaces mid-flight, a **frontier query** as the
thing an agent or dispatcher actually calls, and (from Wayfinder) an **autonomy-boundary label**
alongside the dependency edges. None of them reason below task granularity — none model file or
symbol overlap.

## Build systems: applicative graphs vs. the monadic frontier

Build-graph "affected" tooling already implements the exact pipeline CR-parallelism wants —
**git diff → owning unit → reverse-dependency closure → antichain scheduling** — one rung more
mechanical than the issue trackers above. **Nx** computes `affected --base/--head` over a cached,
auto-inferred project graph (task edges are kept distinct from project edges, so independent
tasks parallelize even inside a dependent project). **Turborepo** declares a package+task DAG in
`turbo.json` (`dependsOn` with a `^` topological prefix) and selects a range with
`--filter=[main]...pkg`. **Bazel/Buck2** answer `rdeps(universe, seed, depth)` — a depth-bounded
reverse-dependency closure over the action graph — and two actions are parallel-safe iff there is
no path between them and their outputs are disjoint (`--output maxrank` reports the topological
level directly). **Pants** goes furthest of the shipped tools: it infers file-level
producer/consumer edges by parsing imports, and `--changed-since --changed-dependents=transitive`
is the closest any product gets to a real symbol-level touch-set. **Rush**'s `--impacted-by` names
the blast-radius selector as a first-class CLI concept. All of them, though, still treat a file (or
build target) as **atomic** and parallelize purely on graph independence.

*Build Systems à la Carte* (Mokhov, Mitchell, Peyton Jones, ICFP 2018) gives this landscape a
name that the mission-graph design borrowed directly: an **applicative** task description has its
whole dependency graph fixed before a single task runs (Make's static Makefile graph, and — in the
tools above — Turborepo's and Nx's declared/cached graphs); a **monadic** task description lets a
task discover its own dependencies while it runs, so the graph can only be known by executing it
(Shake, Nix — and, in the mission-graph design's own reading, Bazel's dynamically-grown action
graph as well, since Skyframe can discover new dependencies mid-build the way Shake and Nix do).
The mission graph plants itself firmly in the monadic camp, and for a reason none of the static
build tools have to deal with: **a CR's true touch-set, and even which mission-nodes will exist,
are not known until Explore runs.** Only the near frontier is knowable; the far horizon is
speculation that decays with distance. So the engine cannot emit a fixed wave-plan the way Make or
Turborepo can — it must persist a **partial, growing DAG**, re-derive the ready-set continuously,
and lower only the frontier in detail (JIT, not whole-program), deferring deep decomposition of far
work until it approaches.

## Merge queues and speculative execution

CR/merge scheduling decides parallelism from **declared topology** or **empirical speculative
CI**, at build-target granularity — one rung closer to "is it actually safe to combine these two
changes," and the rung where the dossier's most important caveat lives.

- **Graphite** stacks declare a parent-pointer topology (`refs/branch-metadata`): serial within a
  stack, parallel across stacks, with speculative CI and topology-aware bisection — no content or
  overlap analysis at all.
- **Merge queues** infer conflict from CI pass/fail and recover via bisection on failure: **Bors**
  does a binary search, O(E log N); **Mergify** batches n-ary by changed directory; **Aviator**'s
  `affected_targets` is the cleanest statement of the primitive — disjoint targets merge
  independently in any order, overlapping targets get co-tested.
- **Uber's SubmitQueue** (Ananthanarayanan et al., EuroSys 2019) is the strongest production
  result: `CT(change)` is the set of build targets whose hash changed, two changes are independent
  iff `CT(A) ∩ CT(B) = ∅`, and a speculation tree plus a logistic-regression predictor (~97%
  accuracy) lands independent changes in parallel — 53% less CI, 37% lower P95 wait. **Google
  TAP** runs the same affected-target-batching idea; **Meta** does server-side push-rebase land.

The load-bearing finding underneath all of this is **Brun's** (FSE 2011 / TSE 2013, the *Crystal*
work): across nine systems and 550k versions, only ~17% of merges conflict textually, but **~33%
of git-clean merges are semantically broken** — build or test failures from action-at-a-distance
coupling (a signature change plus a distant, unrelated-looking caller) that no textual or file-level
overlap check can see. Structured-merge research sharpens the picture at finer grain — Accioly
(EMSE 2018) finds conflicts concentrate on the **same top-level declaration** (method, field, or
modifier list, not just method bodies), and Cavalcanti (OOPSLA 2017) explains *why*: method bodies
are ordered statement sequences (same-symbol edits collide — HARD), while class member lists are
unordered (different-symbol edits in the same file don't collide — SOFT), a distinction that cuts
false positives by ~62% versus plain line-based merging. An ML pre-filter over this signal (Owhadi-
Kareshk, ESEM 2019) is strong at clearing genuinely safe pairs (F1 ~0.95) but weak at pinpointing
real conflicts (F1 ~0.57) — good for cutting speculation cost, useless as an oracle. No shipped
product classifies overlap at this region/symbol granularity; it exists only in research.

The conclusion the mission graph draws from this layer: **static disjointness is a scheduling
hint, never a safety proof.** A SOFT (same-file, different-region) classification means
"lower rebase cost, schedule together" — it does not mean "guaranteed non-conflicting." Whatever
static overlap check the engine runs, it must sit in front of a **speculative-CI-plus-bisection
backstop at merge time**, the same backstop Bors, Mergify, and Uber already rely on. This dovetails
with SDD already rebasing a CR's branch onto its target before the impl gate — the gate already
judges the merged tree; the natural extension is a batch-merge check at the same seam.

## Borrowing the CPU/compiler model — hazards, renaming, SSA, retirement

Where the field above stops — no product reasons below file/target granularity — the mission-graph
design reaches instead for an older, well-worked vocabulary: an optimizing compiler back end plus a
CPU instruction scheduler, not the Agile "epics → stories → tasks" taxonomy. The organizing
principle it borrows is **hazards and parallelism**, not topic.

**The three classic data hazards map directly onto the three CR relationships** (edge convention
`A → B` = "A must finish before B"):

| Mission-graph term | Hazard | Resolution |
| --- | --- | --- |
| dep edge (B consumes a symbol A produces) | **RAW** — true data dependency | serialize |
| hard overlap (both write the same symbol) | **WAW** — output dependency | serialize, can't co-wave |
| soft overlap (same file, different region) | **WAR** — anti-dependency | co-wave OK, removable by rename → rebase |

This is more than a naming convenience — it *explains* the soft/hard split the merge-queue
research above argues for empirically, instead of merely asserting it: a WAR hazard is, by
definition, a **false** dependency that disappears once you give each writer its own copy.

- **Out-of-order execution and register renaming** (Tomasulo's algorithm, 1967) is the model for
  **worktrees**: giving each mission its own physical checkout dissolves file-level WAR/WAW
  hazards the same way a spare physical register dissolves a false dependency between two
  instructions that happen to reuse the same architectural register — the conflict, if there is a
  real one, only re-materializes at write-back (merge). This sharpens what "soft" and "hard"
  actually mean: **soft** is a collision on the *physical register* (same file, renamable, i.e.
  rebase-able); **hard** is a collision on the *architectural register* (the same symbol's
  semantics, not renamable away).
- **Static single assignment form** (Cytron et al., ACM TOPLAS 1991) is the **lowering
  objective**: decompose a CR so that every spec-node has exactly one owning mission. Do that, and
  WAW/WAR hazards vanish **by construction** — only true RAW dependencies remain, and the residue
  that's left (two CRs that genuinely must both rewrite one symbol) is an *irreducible* hard
  conflict, designed to be flagged rather than silently parallelized. Merge/rebase points play the
  role of SSA's φ-nodes.
- **The reorder buffer and in-order retirement** (the precise-interrupt discipline for
  out-of-order machines, Smith & Pleszkun, ISCA 1985) is the model for **Operation-ordered
  merging**: missions run out of order, in parallel worktrees, exactly like instructions issuing
  out of order — but they must *retire* (merge to trunk) in an order that keeps the project
  releasable, with the Operation acting as the retirement boundary. Issue order is barrier-free;
  retirement is not.
- **Branch prediction and squash-on-misprediction** is the model for the speculative-CI-plus-
  bisection backstop from the merge-queue layer above: the static hazard classification is a
  prediction, and predictor confidence should bound how far ahead the scheduler is willing to
  speculate.

**Why the GPU/NPU model does *not* transfer.** GPUs execute **SIMT** — single-instruction,
multiple-thread — where a warp of threads runs in lockstep and diverging control flow serializes
the warp; NPU-style accelerators (e.g., Google's XLA) get their speed from compiling a whole,
**statically known** computation graph ahead of time. Neither fits missions: missions are
**independent agent sessions — MIMD, not SIMT** — so there is no wave barrier and no lockstep
retirement to break on divergence. "Waves" in the mission graph are a topological-level *view* for
humans and capacity planning, never an execution unit; a mission fires the moment its own
dependencies retire (the same barrier-free, fire-when-ready semantics Turborepo already uses for
task execution, as distinct from its *graph*, which — per the applicative/monadic framing above —
is static). Static, whole-graph NPU/XLA-style reasoning is demoted to the **known, settled core**
of the graph (already-specified, already-built work); the frontier, where CRs are still being
lowered and discovered, stays CPU-style: discover, speculate, re-derive. The one GPU idea that
*does* carry over is **occupancy / latency hiding**: oversubscribe the ready pool so that a
mission blocked on a gate, CI, or a human can be swapped for another ready mission — without ever
reintroducing the lockstep barrier that made the GPU model wrong in the first place.

## Where this leaves the mission graph

None of the three shipped layers unifies task-level dependency tracking, file/target-level
"affected" analysis, and merge-time safety — the mission graph is meant to be the one system that
does, because it already owns the inputs the other layers have to fake: **spec nodes and
artifact-types** as a better coarse blast unit than a directory (what Mergify uses) or a build
target (what Aviator/Uber use); a **real, queryable DAG** instead of spec-kit's hand-typed `[P]`
prose tag; and a CR's **plan brief already declaring entry files/symbols** — a touch-set floor the
merge-queue world never has pre-merge. What it deliberately does *not* claim is that the CPU/GPU
vocabulary is a proof of anything — it is a naming discipline borrowed to make the hazard model
legible, sitting on top of the same disjointness primitive (Uber, Aviator) and the same
speculative-CI backstop (Bors, Mergify) the merge-queue layer already validated in production. The
one place SDD is genuinely first is the soft/hard region-level overlap tier — and per Brun's
finding above, it ships as a scheduling hint with a backstop behind it, not a safety oracle.

## Distilled into

- **ADR-0025** — the mission compiler/scheduler model: the CR → Operation → Mission decomposition,
  the five scheduling axes, the RAW/WAW/WAR hazard mapping, SSA lowering, and the barrier-free /
  reorder-buffer execution model.
- **ADR-0026** — the mission-graph store: SDD-native, per-repo, git-tracked, single-writer,
  append-only with tombstones; beads/Dolt and the cyberlegion global hub (GasTown's shape)
  considered and rejected on locality grounds.
- **`.agents/specs/sdd/mission-graph/`** — the frozen Op1.M1 spec node (the `ready`/`cycles`
  kernel) this research and the design brief fed.
