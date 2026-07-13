# ADR-0025: Mission-graph model — an optimizing compiler + CPU instruction scheduler, not an Agile taxonomy

## Status

Accepted

## Context

SDD needed a way to take one or more **change-requests** (CRs) and *compile* them into a set of
individually-executable **missions** (the mission-loop unit) plus a **schedule** for running them in
parallel and knowing when the project is shippable. The conductor already makes every one of these
calls by hand: intake turns a CR into a plan under `.agents/plans`; Explore reshapes mission scope,
files follow-up CRs, and discovers blocks; post-mission feeds back. What was missing is a **model**
that names the decisions, gives criteria for the cuts (currently intuition), and lets the plan persist
as a queryable graph. Worked instance: **#120 blocked on #122** — today an ad-hoc block-and-wait;
under a model it is a true dependency edge discovered during Explore, written down so the scheduler
routes around it.

The obvious frame to reach for is the Agile **epics → stories → tasks** taxonomy. But that taxonomy
organizes work **by topic** — what belongs together for a human reader — and says nothing about the
two questions a parallel fleet actually asks: *what can run concurrently without collision*, and
*when is trunk shippable*. Meanwhile the three CR relationships we kept encountering (true dependency,
same-target collision, same-file-different-region overlap) are **exactly the three classic CPU data
hazards**, and every mechanism we already have (worktrees, per-mission branches, Operation-ordered
merge) has a precise counterpart in an out-of-order processor. A decision was needed on which mental
model governs the design, because every downstream choice — vocabulary, store schema, scheduler
semantics, what the "waves" diagram even means — flows from it.

**Scope:** this ADR records the **model** decision — the hierarchy, the hazard mapping, the axes, the
execution semantics, and the lifecycle loop. The **store** (SDD-native, per-repo, git-tracked; the
beads/Dolt/GasTown rejections; the orphan-ref F3 mechanics) is a separate decision recorded in
[ADR-0026](0026-mission-graph-store.md).

## Decision Drivers

- Organize by **hazards and parallelism**, not by topic — the product is a schedule, not a backlog.
- The dependency/overlap structure is a **means** (the scheduler's internal hazard analysis), not the
  product; "analyze the structure of a CR" is explicitly not what this is.
- The graph is **discovered, not known ahead** — touch-sets, deps, and even which nodes exist emerge
  through Explore; a model that assumes a whole-program view guarantees thrown work.
- Missions are **independent agent sessions** in parallel worktrees; trunk must stay deployable
  under that parallelism.
- **Formalize the loop SDD already runs** — intake → plan(s) → Explore → post-mission — rather than
  bolt a new pre-mission engine onto it.
- The model must be **artifact-type-neutral** (skills, governances, docs, and code all schedule the
  same way) and serve the autonomy north-star (per-mission blast and HITL/AFK shape the schedule).

## Considered Options

### Option 1: Agile static taxonomy (epics → stories → tasks)

- **Pros**: universally understood; zero invention; tracker tooling (GitHub/Asana) speaks it natively;
  the "story = one coherent deliverable unit" instinct is genuinely right and survives into the chosen
  model (Mission ≈ Story, Operation ≈ Epic/Release).
- **Cons**: organizes by **topic**, not by hazards — two stories in different epics can collide on the
  same file and nothing in the taxonomy says so; has no dependency or conflict semantics at all, so it
  cannot answer "what can run concurrently" or "when is this shippable"; it is a static grouping with
  no execution model, so parallel dispatch, merge order, and rebase cost all remain unmodeled folklore.

### Option 2: Static/applicative whole-graph DAG (Make / Turborepo / Nx-style AOT plan)

- **Pros**: deterministic; the whole schedule is computable up front (waves, critical path, capacity)
  with well-understood algorithms; matches how build tools plan.
- **Cons**: assumes the graph is **known ahead** (applicative, in *Build Systems à la Carte* terms) —
  ours is **monadic**: dependencies are discovered *while building*, Explore reshapes the node set,
  handoff spawns `discovered-from` missions. A rigid up-front wave-plan is stale the moment the first
  mission's Explore runs; deep-decomposing the far horizon is speculation that gets thrown away.
  Static whole-graph reasoning is sound only over the **settled core**, never the frontier.

### Option 3: GPU-warp lockstep waves

- **Pros**: waves are a genuinely useful *view* (topological levels for humans and capacity planning);
  lockstep issue/retire is simple to reason about.
- **Cons**: missions are **independent MIMD agent sessions**, not SIMT lanes — there is no shared
  program counter and no reason for a barrier. A wave barrier makes every mission wait for the
  slowest sibling, wasting exactly the capacity parallel worktrees exist to provide; and warp
  divergence / homogeneous-wave assumptions have no counterpart in heterogeneous missions.

### Option 4: Optimizing-compiler back-end + CPU instruction scheduler *(chosen)*

- **Pros**: the three CR relationships map **exactly** onto RAW/WAW/WAR data hazards, which *explains*
  the soft/hard overlap split instead of asserting it; imports a coherent, proven doctrine where every
  concept has a real counterpart already in the system (renaming = worktrees, reorder buffer =
  Operation-ordered merge, fences = project-wide refactors, speculation + squash = the merge-time
  bisection backstop, latency hiding = a gate-blocked agent picking up other ready work); SSA gives
  lowering an **objective** — conflicts are designed out, not merely detected; dataflow (fire-when-ready)
  execution fits MIMD missions with no barrier.
- **Cons**: vocabulary burden — authors must learn hazard terms; the metaphor must be policed (the
  SIMT/warp parts do *not* apply and are explicitly demoted); hazard analysis rests on **predictive**
  touch-sets, a false-negative risk no real CPU or build tool faces.

## Decision

Adopt **Option 4**: model CR-parallelism as an **optimizing compiler back-end + CPU instruction
scheduler**. The organizing principle is hazards and parallelism, not topic. Concretely:

### Hierarchy: Campaign > Operation > Mission > Task (military doctrine)

| Unit | Definition | Agile analogue |
|---|---|---|
| **Campaign** | SDD's existing product outer loop (grow/prune capabilities) — untouched | — |
| **Operation** | a **declared set of missions with one designated capstone**; the releasable/deployable unit; its **release floor = the capstone's dependency closure** (a derived subset — support members outside the closure share the Operation's priority and retire window but do not gate release) | Epic/Release |
| **Mission** | the executable DAG node; runs the mission loop; individually builds+tests-green; **PR = Mission** (branch, spec-gate diff scope, plan brief — all per-Mission) | Story |
| **Task** | a step inside a mission — its plan-brief todos | Task |

Operation membership is a **judgment call, declared** (stored as parent-child edges), not a derived
closure; the engine checks **dependency-closure** (the capstone's closure ⊆ the declared set — a
missing prerequisite is flagged; a support member outside the closure is legal). The distinguishing
property of an Operation is *shippable product value* — not "builds + tests green," which every
Mission already has. "Active" is not a runtime toggle: an Operation is active iff present in the
local graph, decided at ingress; deferred Operations are amended back onto the CR and its tracker
source (the tracker is the far-horizon store). Missions generally do **not** get tracker refs — the
mission-ref is minted locally, with originating CR(s) kept as provenance; the CR carries stakeholder
intent, missions are its local decomposition.

### The hazard mapping (why the compiler model is load-bearing)

Edge convention: `A → B` = A must finish before B (A produces, B consumes).

| Our term | Hazard | Resolution |
|---|---|---|
| dep edge (B consumes what A produces) | **RAW** — true data dependency | serialize |
| **hard** overlap (both write the same node) | **WAW** — output dependency | **serialize at issue** (coarse merges are expensive; never optimistically parallelize) |
| **soft** overlap (same file, different region) | **WAR** — anti-dependency | parallel OK; removable by rename = **rebase** |

Soft overlaps are false dependencies a rebase dissolves; hard overlaps are genuine output collisions.
The mapping *explains* the soft/hard split instead of asserting it. Refinement: a WAW collapses to a
**versioned-RAW** whenever an order can be imposed (do first, rebase second); it is irreducibly hard
only for order-less concurrent co-writes of one target.

### SSA is the lowering objective

Lowering (CR → missions) aims at **single static assignment: one owning mission per spec-node**
(spec-node = project + capability + artifact-type, whose contract is its frozen `.feature` — the
stable, artifact-neutral atom; per-export was rejected as unstable under monadic uncertainty and
meaningless for prose artifact-types). Under SSA, WAW/WAR false dependencies **vanish by
construction** — only true RAW deps remain; the residue (two CRs that must both rewrite one node) is
the irreducible hard conflict → serialize. The CPU counterparts each name a real mechanism:
**register renaming = worktrees** (a fresh physical copy dissolves file-level false deps until
write-back), **φ-nodes = merge/rebase reconciliation**, **spilling = the irreducible serialize**.
Screaming architecture is the **precision lever**: clean capability boundaries make a node-level
collision a real collision — architecture quality *is* scheduler precision. Barrier missions
(project-wide refactors) are **fences**: they own no single node, conflict with nearly everything in
their project, cannot reorder with the fleet, and are hoisted early once confirmed.

### The five axes (read the DAG on all at once)

1. **Concurrency** — hazards → waves; a wave = a pairwise non-WAW antichain (WAR pairs may co-wave
   with a rebase-cost annotation).
2. **Deliverability** — Operations; orthogonal to concurrency: deliverability = the legal ship
   points, concurrency = how fast we reach them. Priority is **not** an independent axis — it derives
   from declared Operation membership; progress = completed/total declared missions (a derived ratio).
3. **Granularity / lowering** — how a coarse CR splits into missions (one mission ≈ one coherent,
   independently-verifiable unit ≈ one PR / one context window); decides the *nodes*, not their order.
4. **Risk / autonomy** — per-mission blast + HITL vs AFK; the schedule must respect gates (a HITL
   capstone can't auto-ship). The SDD north-star axis.
5. **Cost** — per-mission effort, **critical path** (bounds wall-clock), capacity (K parallel
   worktrees = issue width), and the rebase tax from soft overlaps.

Axes 1–2 are the heart; 3 defines the nodes; 4–5 shape and constrain the schedule.

### The DAG is monadic (dynamic), not static

In *Build Systems à la Carte* terms the graph is **monadic** (deps discovered while building —
Shake/Nix), not **applicative** (known ahead — Make/Turborepo). The engine therefore maintains a
partial, growing DAG and **re-derives continuously**; the primary output is a **live `ready`
frontier** (open + unblocked + unclaimed), never a fixed wave-plan. Commitment **decays with
distance**: fully commit the ready-set, loosely speculate the next, don't schedule far. Lowering is
**lazy** — decompose the frontier, leave far work coarse until it approaches. The graph mutates at
the existing touchpoints (intake, Explore, handoff) on multiple timescales. Static whole-graph
reasoning is demoted to the settled core.

### Execution: barrier-free dataflow, ordering only at retirement

Missions are independent MIMD sessions — **no wave barrier**. A mission fires the moment its own deps
retire (Turborepo's *execution* semantics — barrier-free, fire-when-ready — without its applicative
graph model). **"Waves" are a topological-level view** for humans and capacity planning, never an
execution unit. The one real ordering constraint sits at **retire, not issue**: missions are worked
out-of-order in parallel worktrees but **merge in an Operation-coherent order** — the **reorder
buffer** — so trunk stays deployable. Latency hiding is MIMD-safe: a mission blocked on a gate/CI/
human lets its agent pick up another ready mission.

### The lifecycle loop (above the mission loop)

The mission loop ends at handoff = PR created + reported. A **lifecycle loop** picks up from there:
**merge the PR (Operation-order + speculative-CI backstop) → tear down the pod → append to the
mission graph (retired, corrected touch-set, discovered edges/nodes) → re-derive `ready` → dispatch
next**. The **Operator owns this loop** and is the **single graph writer** — missions *report*, the
owner *writes*. It is not a daemon: summoned, runs a tick, exits. Two orderings split cleanly:
`ready` governs **issue**; retirement is Operation-ordered merge. Capacity (K) and human-availability
are the dispatcher's; the scheduler stays read-only. v1 runs none of this loop (manual authoring,
no fleet) — it is an F3 concern.

### Not a new engine

The model **formalizes + enriches the flow SDD already runs**. It adds three things to decisions the
conductor already makes by hand: **plan → plans** (intake can split one CR into a DAG of Operations/
missions, not one flat brief), **criteria** (SSA node-ownership, RAW/WAW/WAR, Operation-coherence,
blast — replacing intuition), and **persistence** (the mission graph — ADR-0026). Lowering rides the
existing phases, and the front-end judges before it cuts: the **Oracle** vets CR legitimacy
(kill-or-ship, re-checked as far CRs approach the frontier) and the **Architect** judges structural
fit / barriers / placement — the spec-gate bars pulled forward to planning; killing a dead CR at
intake is the cheapest possible flush.

## Rationale

The Agile taxonomy answers "what belongs together for a human" — the wrong question for a parallel
fleet, whose questions are "what can run concurrently without collision" and "when is trunk
shippable." The hazard mapping answers both, and it is not a decoration: it **derived** design
decisions rather than merely labeling them — the soft/hard overlap split falls out of WAR-vs-WAW
instead of being asserted; SSA turns "a good mission cut" from taste into an objective the reasoning
front-end aims for and the deterministic back-end verifies; serialize-at-issue for hard collisions
follows from coarse merges being expensive, exactly the coarse-atom bias real schedulers have. The
static-DAG option fails on the ground truth that Explore *is* the discovery process — the monadic
framing is a correction to any "we know the whole DAG ahead" premise, and it dictates the live-frontier
output shape. The GPU-warp option fails on execution reality — missions are MIMD, so ordering belongs
at the one place trunk-deployability actually needs it (Operation-coherent retirement), not at issue.
The compiler/scheduler model is the only option under which every mechanism the system already has
(worktrees, per-mission branches, ordered merge, merge-time bisection, gate-blocked agents grabbing
other work, refactor fences) is a named, load-bearing part of one coherent doctrine rather than
folklore. And because the model formalizes the loop SDD already runs, adopting it costs no new
process — only names, criteria, and persistence for decisions the conductor was already making.

## Consequences

### Positive

- "What can start now" and "when can we ship" become **computable reads** (`ready`, release floor)
  over one graph instead of conductor intuition.
- Conflicts are **designed out at lowering** (SSA) rather than discovered at merge; the residue is
  explicitly serialized at issue, so the expensive semantic merge never happens by accident.
- Trunk stays deployable under parallelism by construction (Operation-coherent retirement).
- The vocabulary imports a proven doctrine — new situations (a discovered mutual dependency, a
  project-wide refactor, a stalled gate) have named, pre-decided handlings (cycle repair, fence,
  latency hiding) instead of ad-hoc calls.
- Mission ≈ Story and Operation ≈ Epic/Release keep the human-facing intuition; trackers still speak
  CR/Operation grain while the machinery runs Mission grain.

### Negative

- Authors and the conductor must learn hazard vocabulary and declare touch-sets; lowering toward SSA
  is more thought per intake than writing one flat brief.
- Scheduler precision is **coupled to architecture quality** — a layered/framework-first layout
  scatters capabilities across nodes, collisions explode, and the schedule degrades to serial
  (mitigated by F1: strengthening the capability-first layout recommendation; the false-conflict rate
  doubles as a partition-quality metric).

### Risks

- **Predictive touch-sets are wrong sometimes** — a false negative lets two colliding missions run in
  parallel. Mitigation: v1 sidesteps it (node-level WAW-mutex serializes all same-node work; no
  soft-parallel path exists yet); a corrected touch-set is appended post-hoc from the git diff.
- **SOFT is a rebase-cost hint, not a safety proof** — ~33% of textually clean merges are
  semantically broken (Brun). Mitigation: when the finer ladder later enables soft-parallel, the
  dispatch consumer keeps a speculative-CI/bisection merge backstop; the scheduler never promises
  merge safety.
- **Metaphor overreach** — importing SIMT/warp or whole-program AOT reasoning where it does not apply.
  Mitigation: this ADR demotes them explicitly (waves = view only; AOT = settled core only); treat any
  future design leaning on them as re-litigating this decision.
- **Front-end judgment is not unit-testable** — lowering and the Oracle/Architect calls are judgment,
  not pure functions. Mitigation: validation is two-sided — the deterministic back-end is proven by
  authored fixtures; the front-end emits a decision-evidence artifact (sources, judgments,
  alternatives, verification) as its auditable proof of work (F5).

## Implementation Notes

- **v1 = the self-hosting kernel** (dogfood: the system's first job is planning its own build) —
  the git-tracked mission graph with hand-authored nodes/edges/node-level touch-sets, plus a zero-dep
  `ready`/`cycles` engine with the node-level WAW-mutex. Everything else (SSA-lowering automation,
  finer-than-node collision ladder, barrier handling, dispatcher/headless-operator, git-diff
  touch-set correction) is deferred as Missions in its own graph.
- Follow-up CRs named by the design: **F1** (strengthen capability-first spec-layout), **F2**
  (cross-node scenario dedup — spec-level SSA), **F3** (lifecycle loop / headless-operator + the
  orphan-ref store move), **F4** (codify the transient `.design.md`/`.operations.md`/`.evidence.md`
  artifacts), **F5** (automate the decision-evidence emit).
- Worked example: GitHub issues **#135/#136/#137** (RAW #135 → #136; #137 WAW-pairs #136), distilled
  into an authored test fixture — frozen scenarios run against constructed graphs, never the live store.
- The engine/capability *name* was still parked at design time; the store noun is settled
  (**mission graph**). Vocabulary Campaign > Operation > Mission > Task is settled.

## Related Decisions

- [ADR-0026](0026-mission-graph-store.md) — the **store** half of this design: SDD-native, per-repo,
  git-tracked mission graph; single write-decider, no sharding; the beads/beads_rust/Dolt/
  cyberlegion-hub rejections; v1 in-tree files → F3 `sdd/mission-graph` orphan ref.
- [ADR-0011](0011-sdd-process-vs-agentic-workflow.md) — SDD is a governed process; this model
  formalizes that process's planning layer without adding a new engine.
- **Spec node:** [`.agents/specs/sdd/mission-graph/README.md`](../../.agents/specs/sdd/mission-graph/README.md)
  — the behavioral contract of the v1 kernel (`ready`/`cycles` over the git-tracked list).
- **Research survey:** [2026-07 Work decomposition & CR parallelism](../../docs/research/2026-07-work-decomposition.md)
  — the prior-art evidence (beads, Wayfinder, build systems, merge queues, Brun) this model rests on.
