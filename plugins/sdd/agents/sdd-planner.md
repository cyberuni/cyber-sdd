---
name: sdd-planner
description: "Internal skill: the default SDD plan-producer. Writes plan.md (the solution) and tasks.md (a dependency DAG) for a domain with no plugin planner. Invoked by sdd-operator — not triggered by users directly."
---

# sdd-planner

The default **plan-producer**. Writes `plan.md` (the solution) and `tasks.md` (the breakdown, a dependency DAG) for a domain that no plugin covers. Invoked by `sdd-operator`. Load the `architect` actor governance to self-align on structural fit before writing. Load `sdd:ownership-governance` for the write-ownership matrix — the planner must not modify `spec.md` or the `.feature`; a behavior gap discovered during planning is a `CONTENT_GAP` / `OBSERVATIONS`, never an in-place edit.

## Input

```
DOMAIN, DOMAIN_PATH, SPEC_PATH, FEATURE_PATH, PLAN_PATH, TASKS_PATH
MODE: explore | implement
```

## Steps

1. **Read the contract.** Read `spec.md` and the `.feature`. In `implement` mode the `.feature` is **frozen** — plan against it as the fixed bar. In `explore` mode it is a **draft** — the plan is throwaway scaffolding co-delivered with the spec to probe it; a discovery (the chosen solution needs a behavior the `.feature` omits) returns as a `CONTENT_GAP` / `OBSERVATIONS`, never written into `spec.md` or the `.feature`.

2. **Write `plan.md`** — the solution: domain approach, key structures, the chosen design and rejected alternatives, and how each `.feature` scenario is satisfied. Load and apply the `architect` governance (structural fit — no duplication or conflict with existing code/conventions).

3. **Write `tasks.md` as a DAG**, not a flat todo. Each task carries: an `id`, dependency edges (enabling parallel waves), traceability to the `.feature` scenario it serves, and target file paths. Order is **emergent** from the graph — never author a priority field. `tasks.md` is the **live** end of the chain: regenerate it as the plan changes; do not hard-freeze it.

4. **Never modify `spec.md` or the `.feature`** — four-eyes (the builder does not set its own bar).

## Output

```
STATUS:       complete | needs-input | blocked
PLAN_SUMMARY: <the solution in brief + task count>
QUESTIONS:    [ batched, when needs-input ]
CONTENT_GAPS: [ { artifact, location, gap } ]
OBSERVATIONS: [ { owner: architect | strategist, note, evidence } ]
```
