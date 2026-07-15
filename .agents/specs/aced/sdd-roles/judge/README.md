---
spec-type: behavioral
concept: [sdd-roles]
---

# judge — the internal scorer

Score a blind simulation of agent behavior against a rubric for a scenario and layer, emitting a
score per named rubric dimension collapsed to one verdict against the threshold.

## Use Cases

**Fit:** partial — `judge` is invoked by name by `implementer` / `run` / `compare` and makes no
activation decision, so the trigger layer carries no signal for it (trigger-balance / near-miss is
N/A); its behavior and output remain LLM-graded.
**Subject** — when `implementer` (or the `run` / `compare` reporting skills) invokes it, producing one
simulated agent behavior **blind** (in a context shown the situation but not the rubric or the
expected outcome), scoring that simulation against the rubric for a single scenario and layer, and
emitting a score per named dimension plus PASS / WHAT WORKED / WHAT FAILED. The asymmetry is the
design: the simulating context is blind, while the scoring context reads the whole scenario — `Then`
steps included — because the guards and expected behaviors it gates on live only there.
**Non-goals** — rolling up the gate verdict or `IMPLEMENTATION_PASS` (that is `implementer`);
aggregating across N runs; deciding which evals exist or authoring the rubric (that is `scenario-writer`, inline in the frozen `.feature`);
running the suite (`implementer` / `run`).

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Score one rubric case | invoked with a subject and one test case (scenario, layer, expected behaviors, must-not-do, rubric) | it emits one score per named dimension plus PASS / WHAT WORKED / WHAT FAILED for that single case and nothing else |
| Simulate blind | any test case carrying a name, `Then`, and rubric alongside its `Given`/`When` | the simulating context receives the subject and the `Given`/`When` only; the name, `Then`, and rubric are withheld |
| Extract the brief mechanically | any test case | the `extract-situation` engine composes the brief; `judge` never decides by its own judgment what to withhold |
| Dispatch the simulator blind | any dispatch of a simulating context | the dispatch intent requires a context that cannot read the frozen suite; `judge` never passes it the suite path |
| Separate the two passes | any invocation | the simulation is produced in one context and scored in a different one, both inside a single caller-facing invocation |
| Score the returned transcript | a blind context has returned its simulation transcript | every dimension's verdict derives from that transcript; the scoring context never simulates on its own |
| Read the outcome when scoring | a case whose must-not-do guards and expected behaviors live in its `Then` steps | the scoring context reads those `Then` steps — the simulating context never does |
| Fail closed on an empty brief | the extractor emits an empty brief while reporting success | it reports a blocker and scores nothing |
| Fail closed on a dead dispatch | the dispatched context returns no transcript | it reports a blocker and scores nothing, never simulating in the scoring context |
| Score one outline row | a trigger `Scenario Outline` row | the invoke decision for that row alone; rows never collapse into one verdict |
| Score a boolean case | boolean `Then` assertions, no rubric, no trigger tag | it reports whether every boolean `Then` held, guards included, with no dimension scores |
| Score the trigger layer | a case carrying the trigger layer and no rubric | it reports the simulated invoke decision against the expected one, with no dimension scores |
| Score the behavior layer | a case carrying the behavior layer | it walks the simulated steps against the expected and must-not-do lists and emits a verdict |
| Score the quality layer | a case carrying the quality layer | it evaluates the simulated output against the rubric criteria and emits a verdict |
| Score each dimension on its own scale | a rubric whose dimensions declare different maxima | each dimension is bounded by its own `max`, never a scale shared across dimensions |
| Collapse to one verdict | a scored rubric case carrying exactly one threshold whose simulation trips no must-not-do | PASS reports the total across dimensions measured against that threshold |
| Honor the rubric over preference | a rubric that conflicts with the evaluator's own taste | it scores by the rubric, not its own preference |
| Fail a must-not-do outright | a simulation that triggers a must-not-do guard | it withholds the top score and emits a non-passing verdict — regardless of whether the total clears the threshold |
| Cost points for a missed behavior | a simulation that misses an expected behavior but trips no must-not-do | the dimensions covering that behavior lose points, putting the top score out of reach; PASS is still decided by the threshold alone |
| Score conservatively under variance | a simulation whose outcome depends on how the prompt is phrased | it emits the lower verdict rather than the optimistic one |
| Emit the fixed rubric output shape | any completed scoring of a rubric case | it emits one line per named dimension (its name and its score against its own max), a TOTAL, a THRESHOLD, a PASS, a WHAT WORKED, and a WHAT FAILED, with no preamble or extra text |
| Emit the fixed trigger output shape | any completed scoring of a trigger case | it emits an INVOKE, an EXPECTED, a PASS, a WHAT WORKED, and a WHAT FAILED, with no preamble or extra text |
| Report a clean simulation | a simulation meeting every expected behavior and tripping no must-not-do | its WHAT FAILED field reads "nothing" |
| Define the top score | a rubric case earning every dimension's max | its TOTAL is the sum of every dimension's max — the maximum a must-not-do violation withholds |
