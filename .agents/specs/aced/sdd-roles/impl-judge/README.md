---
spec-type: behavioral
---

# impl-judge — the impl-judge role

Run the scenario→rubric eval suite over N runs and collapse score-vs-threshold to a boolean per frozen scenario.

## Use Cases

**Subject** — when the conductor dispatches it at the impl gate, running the eval suite the
impl-producer authored (one rubric per frozen `.feature` scenario, scored by `judge` over N runs)
and collapsing score-vs-threshold to a boolean per scenario, then reporting whether every frozen
scenario passed.
**Non-goals** — authoring the evals, rubrics, or golden set (the impl-producer does that); grading
the spec `.feature` (`spec-validator`); scoring one simulated case itself (it delegates that to
`judge`); editing the `spec.md` or `.feature`.

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Run the eval suite at the impl gate | dispatched as the impl-judge with the subject and the eval suite keyed to frozen scenarios | it runs each scenario's eval and reports a pass/fail per frozen scenario |
| Honor the run policy | a trigger-layer scenario vs. a behavior/quality scenario | trigger scenarios run the trigger-run policy, behavior scenarios run N runs, each collapsing to one verdict |
| Collapse to a per-scenario boolean | the aggregated runs for a scenario | the scenario is reported passing or failing, never as a raw number |
| Roll up the gate verdict | the per-scenario booleans | it reports the implementation passing only when every frozen scenario passes |
| Guard a missing eval | a frozen scenario with no eval authored for it | it reports a blocker rather than free-authoring the eval |
| Guard against editing | a behavior-changing gap discovered during the run | it reports a blocker instead of editing the spec or feature |
