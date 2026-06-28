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
