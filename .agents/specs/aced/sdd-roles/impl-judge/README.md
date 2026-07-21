---
spec-type: behavioral
concept: [sdd-roles]
---

# impl-judge — the impl-judge role

Run the frozen `.feature` suite (inline `@rubric` + `@trigger` cases) over N runs, delegating each
case's scoring to `judge`, then collapse score-vs-threshold to a boolean per frozen scenario and roll
up the gate verdict. It **runs** the suite; it never authors it and never edits the spec.

## Use Cases

**Fit:** partial — `impl-judge` is dispatched by name by the conductor at the impl gate and makes no
activation decision, so the trigger layer carries no signal for it (trigger-balance / near-miss is
N/A); its run/collapse/rollup behavior and its verdict output remain LLM-graded.
**Subject** — when the conductor dispatches it at the impl gate with a subject and its frozen
`.feature`, it enumerates every frozen scenario, sets each scenario's run policy, invokes `judge` per
case **blind to the scenario body** over the configured run count, collapses each scenario to a
boolean against its threshold, and rolls up `IMPLEMENTATION_PASS` — reporting a pass/fail per scenario
and naming (with per-dimension scores) any that failed.
**Non-goals** — authoring the `.feature` or its inline rubric (that is `scenario-writer` at explore);
grading the spec `.feature` (`spec-validator`); scoring one simulated case itself (it delegates that to
`judge`); editing the `spec.md` or the `.feature` (a behavior-changing gap is a blocker, not an edit).

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Run the frozen suite at the impl gate | dispatched as the impl-judge with the subject and its frozen `.feature` | it exercises each frozen scenario once and reports a pass/fail per scenario |
| Delegate scoring, blind | a frozen scenario to score | it invokes `judge` with the `.feature` path, scenario name, and threshold — never the scenario's steps, `Then`, or rubric |
| Honor the run policy | a `@trigger` scenario vs. a `@behavior`/`@quality` scenario | trigger scenarios run once per `Examples` row; behavior scenarios run N runs; an inline `@rubric` threshold overrides the run-policy default |
| Collapse to a per-scenario boolean | the aggregated runs for a scenario | the scenario is reported passing or failing (trigger: on activation accuracy; a tripped must-not-do fails outright), never as a raw number |
| Roll up the gate verdict | the per-scenario booleans | it reports the implementation passing only when every frozen scenario passes; a failing gate names each failing scenario with its per-dimension scores |
| Guard a missing rubric | a `@rubric` scenario whose inline rubric block is absent | it reports a blocker rather than free-authoring the rubric |
| Guard against editing | a behavior-changing gap discovered during the run | it reports a blocker instead of editing the spec or feature |

## Control Flow

Load the frozen `.feature` as the eval source (enumerate in file order; an absent inline rubric on a
`@rubric` scenario is a blocker). Set each scenario's run policy (trigger vs. behavior source; an
inline `@rubric` threshold overrides the default). Run each scenario by invoking `judge` **blind** —
path + name + threshold only, never the body — once per `Examples` row for a trigger outline, N times
for a behavior case. Collapse each to a boolean (total ≥ threshold; trigger on activation accuracy; a
tripped must-not-do fails outright). Roll up `IMPLEMENTATION_PASS`, naming failing scenarios with their
per-dimension scores. Never edit the spec or feature; a behavior-changing gap is a blocker.

```mermaid
flowchart TD
  A[Conductor dispatches cold: SUBJECT + frozen .feature] --> B[Load .feature: enumerate scenarios in file order, read each scenario's own inline criteria]
  B --> C{@rubric scenario missing its inline rubric?}
  C -- yes --> X1[BLOCKER: do not free-author the rubric]
  C -- no --> D[Set run policy per scenario]
  D --> E{scenario tag?}
  E -- @trigger --> F1[trigger-run policy: runs + activation_threshold]
  E -- @behavior/@quality --> F2[judge model + default_threshold]
  F2 --> G{inline @rubric threshold present?}
  G -- yes --> H1[use the inline threshold]
  G -- no --> H2[use the run-policy default]
  F1 --> I[Run: invoke judge BLIND\npath + scenario name + threshold only,\nnever steps / Then / rubric]
  H1 --> I
  H2 --> I
  I --> J{trigger Scenario Outline?}
  J -- yes --> K1[invoke once per Examples row, passing zero-based ROW;\naggregate invoke decisions across rows]
  J -- no --> K2[invoke over N runs; aggregate totals]
  K1 --> L{collapse}
  K2 --> L
  L -- trigger --> M1[PASS = activation accuracy >= trigger_threshold]
  L -- behavior --> M2{must-not-do tripped?}
  M2 -- yes --> N1[FAIL outright, whatever the total]
  M2 -- no --> N2[PASS = aggregate total >= threshold]
  M1 --> O[Roll up]
  N1 --> O
  N2 --> O
  O --> P{every scenario passing?}
  P -- yes --> Q1[IMPLEMENTATION_PASS = true]
  P -- no --> Q2[IMPLEMENTATION_PASS = false;\nname each failing scenario with its per-dimension scores]
  Q1 --> R[Never edit spec.md or .feature; a behavior-changing gap is a BLOCKER]
  Q2 --> R
```

## Scenario map

Every scenario binds 1:1 to a CFG edge.

| Edge | Path (Given) | Scenario |
|---|---|---|
| dispatched → runs the evals | the conductor dispatches impl-judge with a subject and its frozen suite | `dispatched as the impl-judge it runs the evals` |
| does not author | the frozen suite was authored by scenario-writer | `it does not author the evals` |
| never edits spec/feature | impl-judge is running the eval suite | `it never edits the spec or the feature` |
| delegates scoring to judge | a frozen @rubric scenario | `it delegates per-case scoring to judge` |
| exercise once, read own criteria | a frozen .feature suite | `every frozen scenario is exercised once` |
| trigger runs trigger policy | a frozen trigger-layer case | `a trigger-layer scenario runs the trigger policy` |
| behavior runs N runs | a frozen behavior scenario with a run count | `a behavior scenario runs N runs` |
| collapse to a boolean | the aggregated runs for a scenario | `each scenario collapses to one boolean` |
| blind the judge to the body | impl-judge invokes judge to score a scenario | `it blinds the judge to the scenario body` |
| trigger outline once per row | a trigger Scenario Outline with several Examples rows | `a trigger Scenario Outline is run once per Examples row` |
| inline threshold overrides default | a @rubric scenario with its own inline threshold | `an inline rubric threshold overrides the run-policy default` |
| no inline threshold → default | a @rubric scenario declaring no threshold of its own | `a scenario with no inline threshold collapses against the run-policy default` |
| all passing → passing gate | every scenario collapsed to passing | `all scenarios passing rolls up to a passing gate` |
| any failing → failing gate + names | at least one scenario collapsed to failing | `any scenario failing rolls up to a failing gate` |
| absent inline rubric → blocker | a @rubric scenario whose inline rubric is absent | `a @rubric scenario with no inline rubric is a blocker` |
| gap is a blocker not an edit | impl-judge finds a behavior-changing gap | `a behavior-changing gap is a blocker not an edit` |
| trigger collapses on accuracy | the aggregated invoke decisions across a trigger scenario's rows | `a trigger scenario collapses on activation accuracy` |
| must-not-do fails outright | a run trips a must-not-do while the total still meets threshold | `a triggered must-not-do fails the scenario outright` |
| failing reports per-dimension | a @rubric scenario that collapsed to failing | `a failing scenario is reported with its per-dimension scores` |
