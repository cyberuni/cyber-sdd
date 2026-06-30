---
spec-type: behavioral
concept: spec-authoring
---

# solution-producer — record the per-unit solution

The **solution-producer** procedure: when a unit carries a real design fork, record the **chosen
approach and the rejected alternatives** as a durable `<unit>.solution.md` beside that unit's spec
+ suite. This is the default `solution-producer-governance` the **conductor** runs **in-session**
for the solution-producer role (the live grill surface, like the spec-producer); a plugin may
resolve a more capable solution-producer for its domain
(`../../design/governance-resolution.md`).

The solution is the unit's **third facet** (spec = *what*, suite = *proof*, solution = *why this
shape*). It is **optional** — most units have none — and **ungated**: it gets no judge of its own
and stays out of the spec-judge's view; the implementation's test result validates it transitively
(`../../design/spec-structure.md`).

## Use Cases

**Subject** — the solution-producer procedure: turning a unit's durable design rationale into a
`<unit>.solution.md` record.

**Non-goals** — it renders no verdict and freezes nothing (there is **no solution gate**); it does
**not** write `spec.md` prose, the `.feature`, or any control frontmatter; it never restates the
code or the suite; and it is **not** the transient execution plan (the conductor-filled `.plan.md`
`todos`, `../../intake/`).

The procedure runs in the cases below; every scenario in
[`solution-producer.feature`](./solution-producer.feature) maps to one of these cases or to a cross-cutting guarantee (the record-content rules, the producer surface):

| Trigger | Inputs | Outcome |
|---|---|---|
| **a unit has a real design fork** — a non-obvious approach chosen over plausible alternatives | the unit's spec + suite + the design reasoning from the grill | `<unit>.solution.md` recording the chosen approach **and** the rejected alternatives with why |
| **a unit has no durable rationale** — the shape follows directly from the spec | the unit's spec + suite | **no** solution file is written (the optional facet stays absent) |
| **a revise touches a unit whose solution already exists** | the existing solution + the new reasoning | the solution is tightened in place; it is never frozen and carries no gate |

## What the solution records — and what it must not

- **Boundary-aligned, not coverage-aligned.** The solution maps to the unit's design boundary, not
  one entry per scenario. It explains *why this shape* — the fork, the trade-offs, the rejected
  alternatives — at the granularity of a decision, not a test.
- **Never a restatement.** It does not paraphrase the spec's *what* or the suite's *proof*; a
  solution that only restates the contract is noise and should not be written.
- **Durable, beside the unit.** It lives at `<unit>.solution.md` next to the unit's `README.md` +
  `.feature`, travels with the unit, and persists (unlike the per-CR execution `.plan.md`).
- **Ungated and unfrozen.** No judge grades it, the spec gate does not see it, and the freeze never
  touches it. The impl gate validates it transitively: if the chosen approach was wrong, the
  implementation fails its frozen scenarios.

## Producer surface

Like the spec-producer, the solution-producer is a **live-grill** producer: the conductor runs it
**in-session** (SDD default = governance loaded inline, recorded `produced-by.solution-producer:
sdd:automaton`; a plugin specialist = persona-loaded). It is **never spawned** — it keeps the
user channel. It co-delivers with the other producers, not in a separate gated phase
(`../conductor/README.md`).
