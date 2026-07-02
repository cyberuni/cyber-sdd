---
name: run
description: Use this skill when running ACED evals to score agent configuration behavior against its golden set — after editing a skill, AGENTS.md section, subagent, or command.
---

# ACED Run

Run the eval suite for a target agent configuration and report results.

## Locate the eval suite

If the user specifies a target, find `artifacts/specs/<feature-name>/eval.md`. If no target is specified and only one `artifacts/specs/` directory with an `eval.md` exists, use it. If multiple exist, ask which to run. **If no eval suite exists at all, report that no eval suite is initialized and stop — do not run.**

Read `eval.md` for: `target`, `judge_model`, `threshold`, `layers`.

Read the target agent configuration in full before evaluating — the judge needs the current version.

## Run each test case

For each file in `artifacts/specs/<feature-name>/golden-set/`, sorted by filename:

1. Read the test case
2. Skip layers not listed in `eval.md`'s `layers` field
3. Invoke `aced-case-judge` subagent with:
   - The full text of the target agent configuration
   - The test case scenario, expected behaviors, must-not-do list, and rubric
   - The layer (trigger / behavior / quality)
4. Collect: score (1–5), pass/fail (pass = score ≥ threshold), explanation

Run all cases before reporting. Do not stop on first failure.

## Invoking aced-case-judge

Pass this context block to the judge:

```
SUBJECT:
<full agent configuration text>

TEST CASE: <name>
LAYER: <layer>
SCENARIO: <scenario text>
EXPECTED BEHAVIORS: <list>
MUST NOT DO: <list>
RUBRIC: <rubric text>
THRESHOLD: <threshold>

Score this 1–5 using the rubric. Then state PASS or FAIL. Then explain in 2–3 sentences what the agent did well and what it missed.
```

## Compute results

After all cases:

- Pass rate = passing cases / total cases
- Mean score ± standard deviation across all cases
- Per-layer breakdown (trigger pass rate, behavior pass rate)
- Failing cases sorted by score ascending (worst first)

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
  "cases": [
    {
      "name": "<slug>",
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

FAILING CASES (worst first):
  ✗ 003-no-trigger-for-audit-request  [score 2] — <explanation>
  ✗ 015-stages-only-related-files     [score 3] — <explanation>
  ✗ 008-trigger-on-skill-creation     [score 3] — <explanation>
  ✗ 020-red-tests-block-commit        [score 3] — <explanation>

Run improve to address failing cases.
Run compare after editing the agent configuration.
```

If pass rate is 100%, say so and suggest running `add-scenario` to expand edge case coverage.
