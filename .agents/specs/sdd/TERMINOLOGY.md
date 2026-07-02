# SDD terminology — vocabulary pins

> Distinctions between SDD terms that are easy to conflate. Each entry pins one concept against a
> near-neighbor and names its canonical definition. Not a glossary — only the collision-prone pairs.

## `plan` vs `solution` — two artifacts that both sound like "the plan"

The word **plan** is load-bearing and must never be conflated with the **solution**:

| Term | Is | Scope · lifetime | Filesystem |
|---|---|---|---|
| execution **`.plan.md`** | the mission handoff brief — `todos` + working method + `## NEXT`, the state `resume-mission` / `pause-mission` operate on; *not* a contract layer | **per-CR · transient** (deleted at retro) | `.agents/plans/<cr-ref>.plan.md` |
| **`<unit>.solution.md`** | the per-unit decision record beside the unit's spec + suite — chosen design + **rejected alternatives**; **optional** (written only when a unit has a real design fork worth preserving — it never restates the code or the suite), boundary-aligned, **not frozen**, **ungated** (validated transitively at the impl gate), written by the **`solution-producer`** role | **per-unit · durable** (in the spec tree) | `…/<unit>/<unit>.solution.md` |

Canonical model: `design/spec-structure.md` (the third unit facet) + `design/specialists-and-squads.md`
(the role). Impl (`solution-producer-governance` + per-unit spec/suite) is built in `sub-mission` /
`sub-deliver`.

## `bar` vs `lens` — one concept, two design-layer words

A vocabulary split worth pinning so readers don't take them for different things:

| Word | Used in | Means |
|---|---|---|
| **bar** | design docs (`design/actors-governance.md`, `governance-resolution.md`) | the criteria an actor *owns* — Oracle (scope), Builder (coverage), Architect (structure) |
| **lens** | loop / conductor docs (`loops.md`, `lifecycle-model.md`, `mission/conductor/`) | that **same** bar in *applied* form: the criteria a delegate looks *through* — a producer self-aligns forward, a judge grades backward |

Same concept; "bar" is ownership-side, "lens" is application-side. Canonical definition:
`design/actors-governance.md`. (Maps to the motive-model's **Bar** —
`motive-model/glossary.md`.)

## `corpus` vs `project-spec` vs `node` — three nested levels

Pinned so the three are never conflated:

| Level | Is | Filesystem |
|---|---|---|
| **corpus** | the *collection* of project-specs in a repo (**NOUN only**) | `.agents/specs/` |
| **project-spec** | one project's whole durable spec — one `spec.md`, one suite, one gate/freeze | `.agents/specs/<project>/` |
| **node** | one unit's `spec.md` (+ `.feature`) inside a project-spec | `…/<capability>/<unit>/` |

`corpus ⊃ project-spec ⊃ node`. **Operations are named by the level they act upon** — an op over one
project-spec is *project-spec-level*, an op across projects is *corpus-level*; "corpus" never becomes
a verb or an operation prefix. This is why `corpus/discovery` (ranges across projects) keeps its name
while the intra-spec engines live under `project-spec/`. Canonical definition:
`design/spec-structure.md`. Decision: [ADR-0019](../../../artifacts/adr/0019-name-the-three-spec-levels.md).
