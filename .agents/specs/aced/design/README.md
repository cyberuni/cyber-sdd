# design/ — the ACED eval model

The rules/model: the four eval layers (structural, trigger, behavior, quality), the LLM-eval → agent-config mapping (test case → scenario, golden set → suite, rubric → criteria, LLM-as-judge → aced-case-judge), the regression-gate model, and the **test-level** doctrine (`test-levels.md`: agent config has no deterministic inner layer, so it surfaces at the boundary with `@rubric` for the graded space). Behaviors live in the capability folders.
