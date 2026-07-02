---
spec-type: behavioral
---

# judge — the internal scorer

Score simulated agent behavior against a rubric for a scenario and layer (1–5 + verdict).

## Use Cases

**Subject** — when `implementer` (or the `run` / `compare` reporting skills) invokes it, scoring one
simulated agent behavior against a rubric for a single scenario and layer, and emitting exactly
SCORE / PASS / WHAT WORKED / WHAT FAILED.
**Non-goals** — rolling up the gate verdict or `IMPLEMENTATION_PASS` (that is `implementer`);
aggregating across N runs; deciding which evals exist or authoring the rubric (the impl-producer);
running the suite (`implementer` / `run`).

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Score one case | invoked with a subject and one test case (scenario, layer, expected behaviors, must-not-do, rubric) | it emits the four-field result for that single case and nothing else |
| Score the trigger layer | a case carrying the trigger layer | it simulates whether the agent would invoke the subject and emits a pass/fail |
| Score the behavior layer | a case carrying the behavior layer | it walks the simulated steps against the expected and must-not-do lists and emits a verdict |
| Score the quality layer | a case carrying the quality layer | it evaluates the simulated output against the rubric criteria and emits a verdict |
| Honor the rubric over preference | a rubric that conflicts with the evaluator's own taste | it scores by the rubric, not its own preference |
| Withhold a top score on a violation | a simulation that triggers a must-not-do or misses an expected behavior | it does not award the maximum and emits a non-passing-or-lower verdict |
| Score conservatively under variance | a simulation whose outcome depends on how the prompt is phrased | it emits the lower verdict rather than the optimistic one |
| Emit the fixed output shape | any completed scoring | it emits exactly the four fields with no preamble or extra text |
