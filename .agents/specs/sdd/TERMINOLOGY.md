# SDD terminology — old → new

> **TEMPORARY — delete when old SDD is erased.** This maps terms between the **old SDD**
> (`plugins/sdd/`, the reference baseline) and the **new SDD** (`.agents/specs/sdd/` +
> `plugins/sdd-new/`). It exists only to keep the two vocabularies from colliding during the
> migration; once `plugins/sdd/` is retired, this file goes with it. Where a term has a real
> design change behind the rename, the **new** column is canonical — the spec tree wins.

## `plan` — the load-bearing collision

The word **plan** means two different things, and they must never be conflated:

| | Old SDD | New SDD |
|---|---|---|
| **Term** | `plan.md` + `tasks.md` | `.agents/plans/<cr-ref>.plan.md` |
| **What it is** | the **functional spec** — the *solution design* | the **execution plan** — the mission's working state / handoff brief |
| **Holds** | domain approach, key structures, chosen design + **rejected alternatives**, how each `.feature` scenario is satisfied (`plan.md`); a dependency DAG of build tasks traced to scenarios + file paths (`tasks.md`) | `todos` + status, working method, `## NEXT`, resolved decisions — the state `resume-mission` / `pause-mission` operate on |
| **Lifetime / audience** | durable design rationale (ADR-like) | transient mission scratch — tracked per-worktree, distilled then **deleted at retro** |
| **Analogy** | spec = PRD, suite = test plan, **plan = functional spec** | not in the PRD/spec/test analogy — it is *execution*, not a contract layer |

**DECIDED (2026-06-27): the functional spec is SEPARATED from the CR execution plan.** New
SDD's `provenance-model.md` had *folded* the old `plan.md` + `tasks.md` roles into the one
`.plan.md` ("prose brief = plan.md role; todos = tasks.md role"). That fold is **reversed**:
folding durable design rationale into a file deleted at retro loses it. The functional spec
becomes its own durable artifact; `.plan.md` carries only execution state. The functional
spec's **home, lifecycle, and producer are still to be designed** in the `sub-mission` /
`sub-deliver` work (`plan-producer-governance` is reworked there).

## Other old → new renames

| Old SDD | New SDD | Note |
|---|---|---|
| `spec-governance` | `spec-format` | the required `## Use Cases` + `spec.md` enrichment bar; reference artifact under `authoring/spec-format/` |
| `design/suite-style.md` | `authoring/suite-format/` | Gherkin form + `@rubric` + scenario ordering + the `@frozen` marker, now a reference artifact |
| `type` (single) | `artifact-types` (plural) | a project spans many artifact-types; squads resolve **per file**, not one spec-`type` |
| `sdd-planner` (spawned agent) | `plan-producer` role (run **inline** by the operator) | same procedure, conducted warm, not spawned |
| spec **fleet** (one frozen spec per feature) | **one project spec** (folders, not sibling specs) | one spec / one suite / one gate-freeze baseline |
| `gate/` station | folded into `mission/` + `authoring/` | the gate dissolves into the autonomy bar; the judge stays a distinct cold actor |
