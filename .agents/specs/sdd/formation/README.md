---
spec-type: behavioral
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
(→ `campaign/`), never grows the *process* (→ `doctrine/`), and never writes a spec's `status`.

| Trigger | Inputs | Outcome |
|---|---|---|
| **a formation pass fires** — post-mission, corpus-wide and continuous | the corpus **structure** + **discovery** (`corpus/`), optionally a forward cursor over the public trail | a **finding set covering every spec**: split / dedupe / reconcile candidates, each carrying the Warden's self-clear-or-escalate verdict |

A formation pass exercises the three acts under the verdict discipline below; the per-act verdict,
the frozen-contract guard, and the altitude routing are cross-cutting guarantees. Every scenario in
[`formation.feature`](./formation.feature) maps to an act, to the verdict, or to one of those
guarantees.

## Input — the corpus structure + discovery, scoped by the public trail

The Warden's **primary** input is structural: the corpus **structure** and **discovery** (`corpus/`)
— it reads what the corpus *is*, never what a mission *did*. To stay efficient rather than
cold-scanning the whole corpus every run, it may consult the durable **public trail** (CR-source
conclusions + changesets + git history) **forward** via a cursor over the public trail
to learn what shipped recently and prioritize the structural pass there first. It reads **never**
the combat log (the doctrine loop's input, retired at retro) and **never** live subagent context
— like the other outer loops it fires strictly post-mission.

## The three corpus-wide acts

It acts on the corpus's *structure*, not its content:

- **dedupe** overlapping specs so each behavior has exactly one home,
- **split** monoliths that have outgrown the spec-granularity heuristic,
- **reconcile contradictions** between governances or between specs.

| Act | Trigger | Station (`corpus/`) | Output |
|---|---|---|---|
| **Split a monolith** | a spec trips the spec-granularity heuristic | `split-spec` | a project spec + feature children |
| **Dedupe overlap** | two specs cover overlapping behavior | `dedupe-specs` | a finding naming the overlapping specs |
| **Reconcile a contradiction** | two governances (or two specs) contradict | `dedupe-specs` | a finding naming the contradicting artifacts |

A station is **not** a dependency — Formation depends on the corpus **structure** and **discovery**
(`corpus/`), not on any given station skill.

## Corpus-wide — DISTINCT from the per-spec gate judgment

This is the load-bearing distinction. The Architect appears in **two** places and they must
not be conflated:

| | **Formation loop** (this folder) | **The gate's Architect-backward face** (`design/`) |
|---|---|---|
| Scope | the **whole corpus** | **one spec** |
| Cadence | **continuous**, across missions | **point-in-time**, at one spec's gate |
| Question | is the corpus **organized** right? | does **this change** fit structurally? |
| Acts | dedupe, split, reconcile | one approve/pause/reject structural verdict |

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
- **Escalate** the narrowing, contested, or class-exceeding acts — deprecating a spec or dropping
  scenarios in a dedupe (**Clearance**), picking the winning claim in a reconciliation
  (**Conflict**), or a structural change whose **semver class** exceeds the ceiling
  (**Compatibility**). The escalated finding re-enters as a **new CR**
  (`intake/README.md`) naming the artifacts; it does not land until the Council
  ratifies.

It is **not** true that every act is proposed-and-ratified: the reversible/derivable acts
self-clear under the provisional marker; the narrowing/contested/class-exceeding ones emit a CR.

## Stations, not status — and the frozen-contract guard

The Warden runs stations in-session and **never** writes a spec's `status`. The frozen-contract
guard is keyed on **contract impact**, not the bare fact that the `.feature` is frozen:

- a split that **preserves every scenario verbatim narrows nothing** — it self-clears **even on
  a frozen `.feature`**, leaving the provisional marker; no freeze re-open needed;
- a split that **alters or drops scenario truth is a narrowing** — it shards a frozen contract only
  with a Council-ratified freeze re-open;
- **dedupe is destructive** (it deprecates a spec) — it **escalates regardless** of
  contract-impact class.

## Altitude discipline — route, do not decide

Formation owns corpus structure only and emits **no** out-of-loop decision:

- a **build-or-deprecate** request → routed to `campaign/` (Product);
- a **process lesson** → routed to `doctrine/` (Process);
- a **per-spec gate structural check** → **declined**; Formation does not run as the gate check.

Unit scenarios for the loop and the Warden's verdict are in
[`formation.feature`](./formation.feature); cross-capability outcome scenarios (a split or dedupe
end-to-end) live in [`../acceptance/`](../acceptance/README.md).
