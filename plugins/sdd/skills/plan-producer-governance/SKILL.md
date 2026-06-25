---
name: plan-producer-governance
description: "Internal skill: the SDD default plan-producer procedure — how to author plan.md and tasks.md (a dependency DAG) for a domain no plugin covers. Loaded in-session by sdd-operator when it runs the plan-producer role inline (produced-by sdd:sdd-operator); not triggered by users directly."
metadata:
  user-invocable: false
---

# Plan-Producer Governance — the default planning procedure

The procedure the **Operator** follows when it runs the **plan-producer** role from the SDD default — no plugin covers the domain and no model-tuned producer agent is named, so the Operator **loads this governance and authors inline** in its own warm context (recorded `produced-by.plan-producer: sdd:sdd-operator`). This is the relocation of the former `sdd-planner` agent: same procedure, run inline by the conductor rather than spawned.

Load alongside this governance: the resolved **architect** actor bar (structural fit — no duplication or conflict with existing code/conventions) to self-align before writing, and `sdd:ownership-governance` for the write-ownership matrix — the plan-producer must not modify `spec.md` or the `.feature`; a behavior gap discovered during planning is a `CONTENT_GAP` / `OBSERVATIONS`, never an in-place edit.

## Inputs (folded in by the Operator)

```
DOMAIN, DOMAIN_PATH, SPEC_PATH, FEATURE_PATH, PLAN_PATH, TASKS_PATH
MODE: explore | implement
```

## Procedure

1. **Read the contract.** Read `spec.md` and the `.feature`. In `implement` mode the `.feature` is **frozen** — plan against it as the fixed bar. In `explore` mode it is a **draft** — the plan is throwaway scaffolding co-delivered with the spec to probe it; a discovery (the chosen solution needs a behavior the `.feature` omits) returns as a `CONTENT_GAP` / `OBSERVATIONS`, never written into `spec.md` or the `.feature`.

2. **Write `plan.md`** — the solution: domain approach, key structures, the chosen design and rejected alternatives, and how each `.feature` scenario is satisfied. Apply the **architect** bar (structural fit — no duplication or conflict with existing code/conventions).

3. **Write `tasks.md` as a DAG**, not a flat todo. Each task carries: an `id`, dependency edges (enabling parallel waves), traceability to the `.feature` scenario it serves, and target file paths. Order is **emergent** from the graph — never author a priority field. `tasks.md` is the **live** end of the chain: regenerate it as the plan changes; do not hard-freeze it.

4. **Never modify `spec.md` or the `.feature`** — four-eyes (the builder does not set its own bar).

## Output (the Operator collects)

```
STATUS:       complete | needs-input | blocked
PLAN_SUMMARY: <the solution in brief + task count>
QUESTIONS:    [ batched, when needs-input ]
CONTENT_GAPS: [ { artifact, location, gap } ]
OBSERVATIONS: [ { owner: architect | strategist, note, evidence } ]
```
