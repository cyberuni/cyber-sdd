---
spec-type: behavioral
concept: [sdd-roles]
---

# impl-judge — the impl-judge role

Run the frozen .feature suite (inline @rubric + @trigger cases) over N runs and collapse score-vs-threshold to a boolean per frozen scenario.

## Use Cases

**Subject** — when the conductor dispatches it at the impl gate, running the frozen `.feature` suite
(reading each `@rubric` scenario's inline rubric, scored by `judge` over N runs) and collapsing
score-vs-threshold to a boolean per scenario, then reporting whether every frozen scenario passed.
**Non-goals** — authoring the `.feature` or its inline rubric (that is `scenario-writer` at explore);
grading the spec `.feature` (`spec-validator`); scoring one simulated case itself (it delegates that to
`judge`); editing the `spec.md` or `.feature`.

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Run the frozen suite at the impl gate | dispatched as the impl-judge with the subject and its frozen `.feature` | it exercises each frozen scenario and reports a pass/fail per scenario |
| Honor the run policy | a `@trigger` scenario vs. a `@behavior`/`@quality` scenario | trigger scenarios run the trigger-run policy, behavior scenarios run N runs, each collapsing to one verdict |
| Collapse to a per-scenario boolean | the aggregated runs for a scenario | the scenario is reported passing or failing, never as a raw number |
| Roll up the gate verdict | the per-scenario booleans | it reports the implementation passing only when every frozen scenario passes |
| Guard a missing rubric | a `@rubric` scenario whose inline rubric block is absent | it reports a blocker rather than free-authoring the rubric |
| Guard against editing | a behavior-changing gap discovered during the run | it reports a blocker instead of editing the spec or feature |
