---
spec-type: behavioral
---

# run — score the current config against its frozen .feature suite

Run every scenario of the frozen .feature via aced-case-judge over N runs and report pass rate + per-layer breakdown.

## Use Cases

**Subject** — scoring a target agent configuration against its frozen `.feature` suite (and its
`eval.md` run policy) over N runs and reporting the outcome.
**Non-goals** — authoring or fixing scenarios (`add-scenario` / `improve`); diffing two versions (`compare`);
the project-wide health roll-up (`report`); how a single case is scored (that is `aced-case-judge`).

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Trigger on a scoring request | a request to score / run evals for a config, vs. a sibling intent (diff two versions, project-wide roll-up, author a case) carrying the same eval vocabulary | `run` fires for a scoring request and defers when the intent belongs to `compare` / `report` / `add-scenario` |
| Resolve the suite to run | the user runs evals, optionally naming a target; zero, one, or several `.feature` suites exist | the one matching suite is selected, or the user is asked when several match, or a no-suite message when none exist |
| Score the suite | a resolved frozen `.feature` + its `eval.md`, and the target config | every scenario is judged by `aced-case-judge` and collapsed to a pass/fail; all scenarios run in `.feature` order before any report |
| Report the outcome | the collected per-scenario results | a pass rate, per-layer breakdown, and the failing scenarios worst-first are reported |
| Persist the run | the computed results | a timestamped results record is written under the suite's `results/` |
| Guide the next step | an all-passing run | the user is pointed at `add-scenario` to widen coverage |
