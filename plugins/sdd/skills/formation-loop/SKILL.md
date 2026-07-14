---
name: formation-loop
description: "Partial Skill: invoke by name only — the SDD formation loop, the Architect's outer loop run by the Warden — invoked by the formation-loop delegate, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# SDD Formation Loop

The **structure outer loop** of the SDD model. Owned by the **Architect** and run by its delegate,
the **Warden** (`sdd-warden`), parallel to the conductor running the mission loop. It fires
**post-mission**, **corpus-wide and continuous**, and asks one question and only one — **is what we
have organized right?** Its standing subject is `corpus/` + `project-spec/` and the whole organization: it evolves how
the corpus is **arranged**, never what it says.

Load `sdd:combat-log-governance` for any provenance it touches; the floor + gradient the Warden
renders its per-act verdict against are the conductor's autonomy bar (`start-mission`) — this skill
defers both and never restates them.

## Corpus-wide, never the per-spec gate

This is the load-bearing distinction. The Architect appears in **two** places that must never be
conflated:

| | **Formation loop** (this skill) | **The gate's Architect-backward face** |
|---|---|---|
| Scope | the **whole corpus** | **one spec** |
| Cadence | **continuous**, across missions | **point-in-time**, at one spec's gate |
| Question | is the corpus **organized** right? | does **this change** fit structurally? |
| Acts | audit node-shape, split, reconcile | one approve/pause/reject structural verdict |

Every run produces a **finding set covering every spec in the corpus**; a structural pass scoped to
one spec is **not** a formation run. When asked to act as the per-spec gate structural check, the
loop **declines** and renders no per-spec gate verdict.

## Input — corpus structure + discovery, never the combat log

The Warden reads what the corpus **is**, never what a mission **did**. Its **primary** input is
structural: the corpus **structure** and **discovery** (`corpus/` + `project-spec/`). To stay efficient rather than
cold-scanning the whole corpus every run, it may consult the durable **public trail** (CR-source
conclusions + changesets + git history) **forward** via a cursor to learn what shipped recently and
prioritize the structural pass there first. It reads **never** the combat log (the doctrine loop's
input, retired at retro) and **never** live subagent context — like the other outer loops it fires
strictly post-mission.

## The intra-spec structural acts

It acts on each spec's **structure**, not its content — one project is **one spec**, so structural
maintenance is **intra-spec**. A station is **not** a dependency — formation depends on the corpus
structure and discovery (`corpus/` + `project-spec/`), not on any given station skill.

| Act | Trigger | Station (`corpus/` + `project-spec/`) | Output |
|---|---|---|---|
| **Audit node-shape** | a formation pass fires post-mission | `check-spec-structure` | a finding set: untagged-node (blocking) + oversized-node (advisory), each naming the node |
| **Split an oversized node** | the Warden's `@rubric` breadth-vs-depth judgment routes an oversized-node's shape profile to breadth-overflow | `check-spec-structure` | a sub-node split; depth-overflow instead down-levels via the scenario→test bridge (`verify-scenarios`) or is redesigned — the engine emits only the profile, never the route |
| **Reconcile drift / contradiction** | prose↔suite drift, or two nodes contradict | `align-spec` | a reconcile finding (drift fixed by direction; contradiction → align the losing side) |
| **Dedupe cross-node scenario overlap** | the same behavior is specified in two nodes' suites — a hard collision the scenario rung cannot see (spec-level SSA) | `check-scenario-overlap` | a dedup finding naming both nodes; the Warden's `@rubric` arm confirms real overlap and **assigns a single owning node** (one behavior = one scenario in one node) |

A node **within** the granularity heuristic raises **no** oversized finding; a concept-tagged node
raises **no** untagged finding; nodes (or governances) that **agree** raise **no** reconcile finding;
two nodes that specify **no** shared behavior raise **no** dedup finding. The acts are evidence-gated,
not run unconditionally.

Alongside its findings a pass surfaces an **advisory layout-quality signal** — the scheduler's
**false-conflict rate** doubles as a **code-partition-quality metric** (capability-first keeps
node↔folder clean and the rate low; a layered / framework-first layout scatters a capability and
drives it up). The signal is **advisory** — it **gates no mission**; it points the Warden and Council
at a degrading partition so the capability-first recommendation can be re-asserted.

## The Warden's self-clear-vs-escalate verdict

The Warden is **rubric-subject**, exactly as the conductor is at a gate, and has **no direct user
channel**. For **each structural act** it applies the full floor + gradient
(the conductor's autonomy bar, `start-mission`) — the floor (**Clearance** for a narrowing act; **Compatibility**
when the act's semver class exceeds the ceiling; **Conflict** for a contested reconciliation) plus
the gradient (**blast** magnitude, **novelty**, **confidence**) — and renders its own verdict:

- **Self-clear** the reversible, derivable, low-blast acts — a coverage-preserving split, a refactor
  or consistency fix. The Warden acts **in-session** and leaves a **provisional, agent-attributed
  marker** that is never final until the Council ratifies the trail; a Council reject unwinds it.
- **Escalate** the narrowing, contested, or class-exceeding acts. The escalated finding re-enters as
  a **new CR** (`intake/`) naming the artifacts; it does not land until the Council ratifies.
  - **narrowing** — a reconcile or split that drops scenarios → **Clearance**;
  - **contested** — a reconciliation whose winning claim is contested → **Conflict**;
  - **class-exceeding** — a structural change whose semver class exceeds the ceiling →
    **Compatibility**;
  - a **destructive** act (it deprecates a node) → **escalates regardless** of contract-impact
    class.

It is **not** true that every act is proposed-and-ratified: the reversible/derivable acts self-clear
under the provisional marker; the narrowing/contested/class-exceeding ones emit a CR.

## Stations, not status — and the frozen-contract guard

The Warden runs stations in-session and **never** writes a spec's `status`. The frozen-contract
guard is keyed on **contract impact**, not the bare fact that a `.feature` is frozen:

- a split that **preserves every scenario verbatim narrows nothing** — it self-clears **even on a
  frozen `.feature`**, leaving the provisional marker; no freeze re-open needed;
- a split that **alters or drops scenario truth is a narrowing** — it shards a frozen contract only
  with a Council-ratified freeze re-open;
- a **deprecating act is destructive** — it **escalates regardless** of contract-impact class.

## Altitude discipline — route, do not decide

Formation owns corpus **structure** only and emits **no** out-of-loop decision:

- a **build-or-deprecate** request → routed to `campaign/` (Product); it makes no
  build-or-deprecate decision itself;
- a **process lesson** → routed to `doctrine/` (Process); it emits no process edit itself;
- a **per-spec gate structural check** → **declined**; formation does not run as the gate check.

Cross-capability outcome scenarios (a split or reconcile carried end-to-end) live in
`../acceptance/`; the loop and verdict behaviors are in `formation/formation.feature`.
