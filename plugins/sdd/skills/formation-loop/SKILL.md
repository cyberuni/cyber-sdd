---
name: formation-loop
description: "Internal skill: the SDD formation loop — the Architect's outer loop run by the Warden. Acts corpus-wide and continuously (dedupe overlap, split monoliths, keep the spec graph sound, reconcile contradictions), distinct from the per-spec structural verdict at a gate. Invoked by the formation-loop delegate — not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# SDD Formation Loop

The **outer loop** of the SDD model that keeps the spec **corpus** structurally coherent. Owned by the **Architect** and run by its delegate, the **Warden** (`sdd-warden`), parallel to the Operator running the mission loop. It is **corpus-wide and continuous**, asking one question and only one — **is what we have organized right?** Where the Mission loop wins one mission, the Formation loop keeps the fleet's **order of battle** coherent.

It acts on the corpus's *structure*, not its content. Its four corpus-wide acts:

- **dedupe** overlapping specs so each behavior has exactly one home,
- **split** monoliths that have outgrown the spec-granularity heuristic,
- **keep the spec graph sound** — the rendered DAG stays in sync with the `blocked-by` edges, and cycles are surfaced,
- **reconcile contradictions** between governances or between specs.

Load `sdd:spec-governance` for the **spec-granularity heuristic** (the split trigger) and the `## Use Cases` rule; `sdd:lifecycle-governance` for project/feature composition and the freeze re-open transition; `sdd:ownership-governance` for write-ownership and the freeze write-constraint. The split and graph acts run through stations (`sdd:split-spec`, `sdd:render-spec-graph`); dedupe/reconcile runs through `sdd:dedupe-specs`.

## Corpus-wide — DISTINCT from the per-spec gate judgment

This is the load-bearing distinction. The Architect appears in **two** places and they must not be conflated:

| | **Formation loop** (this skill) | **The gate's Architect-backward face** (`architect-governance`) |
|---|---|---|
| Scope | the **whole corpus** | **one spec** |
| Cadence | **continuous**, across missions | **point-in-time**, at one spec's gate |
| Question | is the corpus **organized** right? | does **this spec** fit structurally? |
| Acts | dedupe, split, graph soundness, reconcile | a single approve/pause/reject structural verdict |
| Output | a finding set over every spec + proposals | one spec's structural verdict |

The Formation loop **does not fire** as the per-spec structural check at a gate, and the per-spec gate structural judgment **is not** the Formation loop. They share the Architect's *concern* (structural fit) but operate at different altitudes. The gate's structural verdict, when recorded, advances only **that one spec** — it reshapes nothing across the corpus. Formation reads the corpus and reshapes it between missions.

## The Warden acts across the whole corpus

A Formation run is not scoped to one spec. The Warden reads every `spec.md` under the specs root and produces a **finding set covering every spec in the corpus** — each spec is examined for split candidacy, overlap with siblings, contradiction, and its place in the graph. A run that touched only one spec is not a Formation run.

## The four acts — triggers and stations

| Act | Trigger | Station | Output |
|---|---|---|---|
| **Split a monolith** | a spec's `.feature` exceeds the spec-granularity heuristic | `sdd:split-spec` | a project spec + feature children |
| **Keep the graph sound** | the rendered graph is stale vs the `blocked-by` edges, or a cycle appears | `sdd:render-spec-graph` | `graph.md` back in sync; cycles surfaced |
| **Dedupe overlap** | two specs cover overlapping behavior | `sdd:dedupe-specs` | a dedupe proposal naming the overlapping specs |
| **Reconcile a contradiction** | two governances (or two specs) contradict | `sdd:dedupe-specs` | a reconciliation proposal naming the contradicting artifacts |

A station is **not** a spec dependency — the Formation loop depends on the spec **graph** and **discovery**, not on the existence of any given station skill. `dedupe-specs` was a noted gap before it was built, exactly as `split-spec` once was.

## The split trigger is the spec-granularity heuristic

A spec is a split candidate when it trips the granularity heuristic owned by `sdd:spec-governance`: the `.feature` exceeds ~15–20 scenarios, the `## Use Cases` table spans more than one distinct behavior, or different parts change on independent cadences. A spec **within** the heuristic is **left alone** — Formation does not split for its own sake. Within-heuristic ⇒ not split.

## Graph soundness

Run `sdd:render-spec-graph` over the corpus to bring `graph.md` back in sync with the `blocked-by` edges; after a clean re-render the rendered graph matches the `blocked-by` edges. When the `blocked-by` edges contain a **cycle**, the station stops and the **cycle is surfaced** — it is not written away. Surfacing the cycle is the Formation act; resolving it is a structural change the Council ratifies.

## Dedupe and reconcile produce a PROPOSAL

Overlap and contradiction are not silently rewritten. The Warden runs `sdd:dedupe-specs` to produce a **proposal that names the artifacts**:

- **overlap** → a dedupe proposal naming the overlapping specs (each behavior gets one home);
- **contradiction** → a reconciliation proposal naming the contradicting artifacts (no contradiction stands).

The proposal is surfaced for human confirmation through the relay; the Warden does not merge or rewrite without it.

## Altitude discipline — Formation owns structure only

Formation never decides what to build and never grows the process. It emits **no out-of-loop decision** and routes the request to the loop that owns it:

- a **build-or-deprecate** proposal ("we should build feature X" / "deprecate Y") → **routed to the Campaign loop** (Director). Formation produces no build-or-deprecate decision.
- a **process lesson** ("we should add cause Y to the enum" / "the team should work this way") → **routed to the Doctrine loop** (Strategist). Formation emits no governance or process edit.
- a **per-spec gate structural check** → declined; Formation does not run as the gate check.

Formation acts corpus-wide and stays inside corpus organization alone.
