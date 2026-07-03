---
spec-type: behavioral
concept: [suite-authoring]
---

# add-scenario — add a test case to the golden set

Scaffold a scenario + expected-behaviors + must-not-do + rubric from a failure, edge case, or gap.

## Use Cases

**Subject** — adding one new test case to a target configuration's golden set, drawn from a real
failure, a production edge case, or a noticed coverage gap.
**Non-goals** — fixing the configuration when cases fail (`improve`); scoring the suite (`run`);
diffing two versions (`compare`); how a single case is scored (that is `aced-case-judge`).

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Trigger on a capture request | a request to capture a new case from a failure / edge / gap, vs. a sibling intent (fix the failing config, score, diff) carrying the same eval vocabulary | `add-scenario` fires for a capture request and defers when the intent belongs to `improve` / `run` / `compare` |
| Locate the eval suite | the user names or implies a feature; its eval config may or may not exist | the suite's target and scoring bar are read, or the user is asked when no suite is found |
| Capture the input | a pasted transcript, an edge-case description, a gap, or a must-not-do behavior | the input is decomposed into said / state / did / should, and a must-not-do becomes a guard |
| Determine the layer | the captured input | the trigger / behavior / quality layer is inferred, the user is asked when ambiguous, and a layer absent from the suite config is flagged |
| Scaffold the case | a captured input and a resolved layer | a draft carrying a scenario, expected-behaviors, must-not-do, and a scoring guide is shown for confirmation before anything is written |
| Write the case | a confirmed draft | the case is written as the next `NNN-<slug>` under `golden-set/`, the path is reported, and `run` is suggested |
