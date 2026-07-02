---
name: run
description: Use this skill when running ACED evals to score agent configuration behavior against its frozen .feature suite — after editing a skill, AGENTS.md section, subagent, or command.
---

# ACED Run

Run the frozen `.feature` suite for a target agent configuration and report results. The `.feature`
is the single eval source — scenarios, inline `@rubric` criteria, and `@trigger` `Examples` all live
in it. `eval.md` carries only the subject binding and run policy.

## Locate the suite

If the user specifies a target, find `artifacts/specs/<feature-name>/` — it holds `eval.md` and the
frozen `<feature-name>.feature`. If no target is specified and only one `artifacts/specs/` directory
with an `eval.md` exists, use it. If multiple exist, ask which to run. **If no suite exists at all,
report that no eval suite is initialized and stop — do not run.**

Read `eval.md` for the **measurement policy** (two-level shape):

- `subject` — the agent configuration under test.
- `eval.layers` — which layers run (`trigger` / `behavior` / `quality`).
- `eval.judge.model` and `eval.judge.default_threshold` — the scoring engine + fallback threshold.
- `eval.trigger.{activation_threshold, runs}` — the trigger-layer run policy.

Read the `subject` agent configuration in full before evaluating — the judge needs the current version.

## Run each scenario

Enumerate the scenarios of `<feature-name>.feature` **in file order**. For each scenario:

1. Determine its layer from its tag (`@trigger` / `@behavior` / `@quality`); a scenario with no layer
   tag defaults to `behavior`.
2. **Skip** the scenario if its layer is not listed in `eval.layers`.
3. Extract the eval from the scenario itself:
   - `@rubric` scenario → the inline rubric docstring (dimensions + per-dimension `max` + `threshold`);
     an inline `threshold` overrides `eval.judge.default_threshold`.
   - `@trigger` `Scenario Outline` → each `Examples` row is one `{query, should_trigger}` case.
   - a deterministic boolean scenario → its boolean `Then` assertions.
4. Invoke `aced-case-judge` with the `subject`, the scenario, and its inline rubric/threshold, over the
   run count for its layer (`eval.trigger.runs` for trigger; else a single behavior/quality run unless
   the caller sets N).
5. Collect: score (1–5), pass/fail (pass = score ≥ threshold; trigger pass = activation accuracy ≥
   `eval.trigger.activation_threshold`), explanation.

Run all scenarios before reporting. Do not stop on first failure.

## Invoking aced-case-judge

Pass this context block to the judge:

```
SUBJECT:
<full agent configuration text>

SCENARIO: <scenario name>
LAYER: <layer>
GIVEN/WHEN/THEN: <the scenario steps>
RUBRIC: <the inline @rubric docstring, or the boolean Then assertions>
THRESHOLD: <inline threshold, else eval.judge.default_threshold>

Score this 1–5 using the rubric. Then state PASS or FAIL. Then explain in 2–3 sentences what the agent did well and what it missed.
```

## Compute results

After all scenarios:

- Pass rate = passing scenarios / total scenarios
- Mean score ± standard deviation across all scenarios
- Per-layer breakdown (trigger pass rate, behavior pass rate)
- Failing scenarios sorted by score ascending (worst first)

## Write results

Write to `artifacts/specs/<feature-name>/results/<ISO8601-timestamp>.json`:

```json
{
  "timestamp": "<ISO8601>",
  "target": "<agent configuration path>",
  "pass_rate": 0.82,
  "mean_score": 3.9,
  "std_dev": 0.8,
  "threshold": 4,
  "scenarios": [
    {
      "name": "<scenario name>",
      "layer": "behavior",
      "score": 3,
      "pass": false,
      "explanation": "..."
    }
  ]
}
```

## Report to user

```
ACED Run — <name>
──────────────────────────
Pass rate:  18/22 (82%)
Mean score: 3.9 ± 0.8

Trigger layer:  8/10 (80%)
Behavior layer: 10/12 (83%)

FAILING SCENARIOS (worst first):
  ✗ no trigger for an audit request   [score 2] — <explanation>
  ✗ stages only related files         [score 3] — <explanation>
  ✗ trigger on skill creation         [score 3] — <explanation>
  ✗ red tests block the commit        [score 3] — <explanation>

Run improve to address failing scenarios.
Run compare after editing the agent configuration.
```

If pass rate is 100%, say so and suggest running `add-scenario` to expand edge case coverage.
