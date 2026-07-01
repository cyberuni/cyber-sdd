# SDD terminology — old → new

> **TEMPORARY — delete when old SDD is erased.** This maps terms between the **old SDD**
> (`plugins/sdd/`, the reference baseline) and the **new SDD** (`.agents/specs/sdd/` +
> `plugins/sdd-new/`). It exists only to keep the two vocabularies from colliding during the
> migration; once `plugins/sdd/` is retired, this file goes with it. Where a term has a real
> design change behind the rename, the **new** column is canonical — the spec tree wins.

## `plan` — the load-bearing collision

The word **plan** means two different things, and they must never be conflated:

The old `plan.md` + `tasks.md` split **two ways** in new SDD — by scope and lifetime:

| Old SDD | New SDD | Scope · lifetime |
|---|---|---|
| `plan.md` — the **functional spec** (domain approach, key structures, chosen design + **rejected alternatives**) | `<unit>.solution.md` — the **solution**, a per-unit decision record beside the unit's spec + suite | **per-unit · durable** (in the spec tree) |
| `tasks.md` — the **task DAG** (build tasks traced to scenarios + file paths) | the execution `.plan.md` `todos` — the task DAG flattened to an ordered list, **conductor**-filled | **per-CR · transient** (deleted at retro) |

So "plan" in **old SDD** = functional spec (analogy: spec = PRD, suite = test plan, **plan = functional spec**); "plan" in **new SDD** = `.agents/plans/<cr-ref>.plan.md`, the **execution** plan / handoff brief (`todos` + working method + `## NEXT`, the state `resume-mission` / `pause-mission` operate on) — *not* a contract layer.

**DECIDED (2026-06-27): the functional spec is SEPARATED from the CR execution plan.** New
SDD's `provenance-model.md` had *folded* the old `plan.md` + `tasks.md` roles into the one
`.plan.md`. That fold is **reversed** — folding durable design rationale into a retro-deleted
file loses it. The functional spec is now the per-unit **solution** (`<unit>.solution.md`):
**optional** (written only when a unit has a real design fork worth preserving — it never
restates the code or the suite), boundary-aligned (not coverage-aligned), **not frozen**, and
**ungated** (validated transitively at the impl gate). It is written by the **`solution-producer`**
role. Model: `design/spec-structure.md` (the third unit facet) + `design/specialists-and-squads.md`
(the role). Impl (`solution-producer-governance` + per-unit spec/suite) is built in
`sub-mission` / `sub-deliver`.

## Other old → new renames

| Old SDD | New SDD | Note |
|---|---|---|
| `spec-governance` | `spec-format` | the required `## Use Cases` + `spec.md` enrichment bar; reference artifact under `authoring/spec-format/` |
| `design/suite-style.md` | `authoring/suite-format/` | Gherkin form + `@rubric` + scenario ordering + the `@frozen` marker, now a reference artifact |
| `type` (single) | `artifact-types` (plural) | a project spans many artifact-types; squads resolve **per file**, not one spec-`type` |
| `sdd-planner` (spawned agent) | `solution-producer` role (run **inline** by the conductor) | same procedure, conducted warm, not spawned; was briefly `plan-producer` |
| spec **fleet** (one frozen spec per feature) | **one project spec** (folders, not sibling specs) | one spec / one suite / one gate-freeze baseline |
| `gate/` station | folded into `mission/` + `authoring/` | the gate dissolves into the autonomy bar; the judge stays a distinct cold actor |

## `bar` vs `lens` — one concept, two design-layer words

Not an old→new rename — both old and new SDD say "lens." This is a **within-new-SDD** vocabulary
split worth pinning so readers don't take them for different things:

| Word | Used in | Means |
|---|---|---|
| **bar** | design docs (`design/actors-governance.md`, `governance-resolution.md`) | the criteria an actor *owns* — Oracle (scope), Builder (coverage), Architect (structure) |
| **lens** | loop / conductor docs (`loops.md`, `lifecycle-model.md`, `mission/conductor/`) | that **same** bar in *applied* form: the criteria a delegate looks *through* — a producer self-aligns forward, a judge grades backward |

Same concept; "bar" is ownership-side, "lens" is application-side. Canonical definition:
`design/actors-governance.md`. (Maps to the motive-model's **Bar** —
`motive-model/glossary.md`.)

## `corpus` vs `project-spec` vs `node` — three nested levels

Not an old→new rename — a **within-new-SDD** vocabulary split, pinned so the three are never
conflated (the old "one frozen spec per feature" fleet blurred them):

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
