# design/ — the ACED eval model

The rules/model: the four eval layers (structural, trigger, behavior, quality), the LLM-eval → agent-config mapping (test case → scenario, golden set → suite, rubric → criteria, LLM-as-judge → aced-case-judge), the regression-gate model, and the **test-level** doctrine (`test-levels.md`: agent config has no deterministic inner layer, so it surfaces at the boundary with `@rubric` for the graded space). Behaviors live in the capability folders.

Beside the four simulated layers sits the **measured** layer (`../eval-run/bench/`) — real runs, not simulation. Whether a subject is worth measuring is fit's second axis (`fit.md`, ADR 0003).
