---
spec-type: behavioral
concept: spec-structure
---

# formation/ — the structure outer loop

The **Formation loop** (metaphor) / **Structure loop** (descriptive) — the step-5 outer loop
that keeps the spec **corpus** structurally coherent. Actor: the **Architect**. Run by its
delegate the **Warden** (`sdd-warden`), parallel to the conductor that runs the inner mission
loop. It is **corpus-wide and continuous**, asking one question and only one — **is what we
have organized right?**

Standing subject: **`corpus/`** (and the whole organization). Formation evolves how the corpus
is arranged, not what it says.

## Use Cases

**Subject** — the formation loop: keeping the whole spec corpus structurally organized between
missions, and the Warden's per-act self-clear-vs-escalate verdict.
**Non-goals** — it never runs as the per-spec gate structural check, never decides *what to build*
(→ `campaign/`), never grows the *process* (→ `doctrine/`), never writes a spec's `status`, and
never finalizes a **single mission's own** node placement — that is the mission's **handoff** step
(`../mission/handoff/`), scoped to the touched nodes and landed in the same change. Formation owns
only **cross-mission** structural drift.

| Trigger | Inputs | Outcome |
|---|---|---|
| **a formation pass fires** — post-mission, corpus-wide and continuous | the corpus **structure** + **discovery** (`corpus/` + `project-spec/`), optionally a forward cursor over the public trail | a **finding set covering every spec**: node-shape / split / reconcile candidates, each carrying the Warden's self-clear-or-escalate verdict |
| **an escalated act reaches across the whole project** — a fence, not a node-owning change | the escalated structural finding + its reach | a CR **called out explicitly as a barrier**, stating it is to be **hoisted early** and **naming the project it fences**; it escalates on reach alone, whatever its contract impact |

A formation pass exercises the three acts under the verdict discipline below; the per-act verdict,
the frozen-contract guard, and the altitude routing are cross-cutting guarantees. Every scenario in
[`formation.feature`](./formation.feature) maps to an act, to the verdict, or to one of those
guarantees.

## Input — the corpus structure + discovery, scoped by the public trail

The Warden's **primary** input is structural: the corpus **structure** and **discovery** (`corpus/` + `project-spec/`)
— it reads what the corpus *is*, never what a mission *did*. To stay efficient rather than
cold-scanning the whole corpus every run, it may consult the durable **public trail** (CR-source
conclusions + changesets + git history) **forward** via a cursor over the public trail
to learn what shipped recently and prioritize the structural pass there first. It reads **never**
the combat log (the doctrine loop's input, retired at retro) and **never** live subagent context
— like the other outer loops it fires strictly post-mission.

## The intra-spec structural acts

It acts on each spec's *structure*, not its content — now that one project is **one spec**,
structural maintenance is **intra-spec**:

- **audit node-shape** — untagged orphans and oversized nodes within a spec,
- **split** an oversized node that has outgrown the granularity heuristic into sub-nodes,
- **reconcile** prose↔suite drift, or a contradiction between two nodes or two governances,
- **dedupe cross-node scenario overlap** — the same behavior specified in two nodes (spec-level SSA).

| Act | Trigger | Station (`corpus/` + `project-spec/`) | Output |
|---|---|---|---|
| **Audit node-shape** | a formation pass fires post-mission | `check-spec-structure` | a finding set: untagged-node (blocking) + oversized-node (advisory), each naming the node |
| **Split an oversized node** | the Warden's `@rubric` breadth-vs-depth judgment routes an oversized-node's shape profile to breadth-overflow | `check-spec-structure` | a sub-node split; depth-overflow instead down-levels via the scenario→test bridge (`../mission/verify-scenarios/`) or is redesigned — the engine emits only the profile, never the route |
| **Reconcile drift / contradiction** | prose↔suite drift, or two nodes contradict | `align-spec` | a reconcile finding (drift fixed by direction; contradiction → align the losing side) |
| **Dedupe cross-node scenario overlap** | the same behavior is specified in two nodes' suites — a hard collision the scenario rung cannot see | `check-scenario-overlap` | a dedup finding naming both nodes; the Warden's `@rubric` arm confirms real overlap and **assigns a single owning node** (one behavior = one scenario in one node) |

A station is **not** a dependency — Formation depends on the corpus **structure** and **discovery**
(`corpus/` + `project-spec/`), not on any given station skill.

### The layout-quality signal (code-partition health)

Alongside its findings, a formation pass surfaces an **advisory layout-quality signal** — the
scheduler's **false-conflict rate** doubles as a **partition-quality metric**: a capability-first
corpus keeps node↔folder clean and the false-conflict rate low, while a layered / framework-first
layout scatters a capability across nodes and drives it up. The signal is **advisory** — it **gates
no mission**; it points the Warden (and the Council) at a degrading code partition so the
capability-first recommendation (`../design/spec-layout.md` S1) can be re-asserted.

## Corpus-wide — DISTINCT from the per-spec gate judgment

This is the load-bearing distinction. The Architect appears in **two** places and they must
not be conflated:

| | **Formation loop** (this folder) | **The gate's Architect-backward face** (`design/`) |
|---|---|---|
| Scope | the **whole corpus** | **one spec** |
| Cadence | **continuous**, across missions | **point-in-time**, at one spec's gate |
| Question | is the corpus **organized** right? | does **this change** fit structurally? |
| Acts | audit node-shape, split, reconcile | one approve/pause/reject structural verdict |

Formation **does not fire** as the per-spec structural check at a gate, and the gate's
structural verdict **is not** Formation. Every run produces a **finding set covering every spec
in the corpus**; a run scoped to one spec is **not** a Formation run.

## The Warden's per-act self-clear-vs-escalate verdict

The Warden is **rubric-subject**, exactly as the conductor is at a gate. For **each structural
act** it applies the full floor + gradient (`../design/autonomy-rubric.md`) — the floor
(**Clearance** for a narrowing act; **Compatibility** when the act's semver class exceeds the
ceiling; **Conflict** for a contested reconciliation) plus the gradient (**blast** magnitude,
**novelty**, **confidence**) — and renders its own **self-clear vs escalate** verdict —
it has **no direct user channel**:

- **Self-clear** the reversible, derivable, low-blast acts — a coverage-preserving split, a
  refactor or consistency fix. The Warden acts **in-session** and
  leaves a **provisional, agent-attributed marker** that is never final until the Council
  ratifies the trail; a Council reject unwinds it.
- **Escalate** the narrowing, contested, or class-exceeding acts — deprecating a node or dropping
  scenarios in a narrowing reconcile or split (**Clearance**), picking the winning claim in a
  reconciliation (**Conflict**), or a structural change whose **semver class** exceeds the ceiling
  (**Compatibility**). The escalated finding re-enters as a **new CR**
  (`intake/README.md`) naming the artifacts; it does not land until the Council
  ratifies.

It is **not** true that every act is proposed-and-ratified: the reversible/derivable acts
self-clear under the provisional marker; the narrowing/contested/class-exceeding ones emit a CR.

### Barriers — the fences formation produces

Formation is the **home of barrier missions**. An architecture / project-wide refactor **owns no single
node — it cross-cuts many**, so it can never be scheduled as a normal node-owning Mission; in scheduler
terms it is a **fence**, partitioning the schedule into a before and an after. Structural CRs are largely
where such fences come from, so the Warden marks them at the point it emits one:

- an escalated finding whose act **reaches across the whole project** is **called out explicitly as a
  barrier** in the CR it emits — the call-out is a **judgment made at escalation**, not a property read
  off a wide touch-set;
- the CR states the barrier is to be **hoisted early** (a refactor done *after* parallel fan-out forces
  a fleet-wide rebase; the cost only grows with delay) and **names the project it fences** — a barrier in
  one project of a monorepo does not fence another's Missions;
- a node-scoped finding is **not** a barrier; the call-out is reserved for genuinely project-wide acts.

A project-wide act **escalates regardless of its contract-impact class** — like a deprecating act, it
never self-clears even when it preserves every scenario verbatim. Its **reach** is the reason
(near-whole-project blast → HITL), not what it does to any one contract.

**Two nodes judge barriers, at different moments — this is the seam.** Formation calls one out **when it
escalates a structural finding** (a fence it is *producing*); [`../ssa-lowering/`](../ssa-lowering/README.md)
recognizes one **when it lowers a CR into Missions** (a fence it is *receiving*), and hoists it early there.
Both are sanctioned, and they are not duplicates: same judgment, different producer and trigger. A
formation-emitted barrier CR is therefore called out here **and** recognized again when it is lowered —
belt and braces on the judgment that matters most.

The call-out is a **declaration, not a scheduling act**. Formation names the barrier and states that it is
to be hoisted early; a lowering run already honors that (`ssa-lowering`), and the HITL escalation puts it
in front of a human. What is **not** built is the **shared work list** modeling fences — so nothing holds
the rest of the project back automatically while a barrier runs
([`../mission-graph/README.md`](../mission-graph/README.md) has no barrier semantics; issue #224). Calling
it out is what makes that possible later: a barrier never called out cannot be honored by anything
downstream.

This does **not** disturb the self-clearing split above, and the two can never both fire: a **split** is
by definition scoped to **one oversized node** (→ sub-nodes), so it never reaches across the project,
while a barrier act reaches across the project **rather than** one node. The two Givens are disjoint on
**reach**, and the suite pins that disjointness rather than leaving it to this prose — a coverage-preserving
split of a single node still self-clears exactly as before.

## Stations, not status — and the frozen-contract guard

The Warden runs stations in-session and **never** writes a spec's `status`. The frozen-contract
guard is keyed on **contract impact**, not the bare fact that the `.feature` is frozen:

- a split that **preserves every scenario verbatim narrows nothing** — it self-clears **even on
  a frozen `.feature`**, leaving the provisional marker; no freeze re-open needed;
- a split that **alters or drops scenario truth is a narrowing** — it shards a frozen contract only
  with a Council-ratified freeze re-open;
- a **deprecating act is destructive** (it removes a node) — it **escalates regardless** of
  contract-impact class.

## Altitude discipline — route, do not decide

Formation owns corpus structure only and emits **no** out-of-loop decision:

- a **build-or-deprecate** request → routed to `campaign/` (Product);
- a **process lesson** → routed to `doctrine/` (Process);
- a **field correction** → routed to `forge/` (Field); the Warden makes no field correction itself;
- a **per-spec gate structural check** → **declined**; Formation does not run as the gate check.

Unit scenarios for the loop and the Warden's verdict are in
[`formation.feature`](./formation.feature); cross-capability outcome scenarios (a split or reconcile
end-to-end) live in [`../acceptance/`](../acceptance/README.md).
