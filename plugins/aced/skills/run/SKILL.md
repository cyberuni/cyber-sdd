---
name: run
description: Use this skill when running ACED evals to score agent configuration behavior against its frozen .feature suite — after editing a skill, AGENTS.md section, subagent, or command.
---

# ACED Run

Run the frozen `.feature` suite for a target agent configuration and report results. The `.feature`
is the single eval source — scenarios, inline `@rubric` criteria, and `@trigger` `Examples` all live
in it. `eval.md` carries only the subject binding and run policy.

## Locate the suite

If the user specifies a target, find the target's node in the project spec —
`.agents/specs/<project>/…/<node>/` (discovered through the SDD spec tree; the node's `eval.md` names
the subject) — which holds the frozen `<node>.feature` and its colocated `eval.md` (subject + run
policy). If no target is specified and only one node in the project spec carries an `eval.md`, use it.
If multiple exist, ask which to run. **If no suite exists at all, report that no eval suite is
initialized and stop — do not run.**

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
   - `@trigger` `Scenario Outline` → each `Examples` row is one case; invoke the judge **once per row**, passing its zero-based `ROW`.
   - a deterministic boolean scenario → its boolean `Then` assertions.
4. Invoke `aced-case-judge` with the `subject`, the **`.feature` path and the scenario name** (plus the
   `ROW` for a trigger outline), and its threshold, over the run count for its layer
   (`eval.trigger.runs` for trigger; else a single behavior/quality run unless the caller sets N).
5. Collect, by shape: a `@rubric` case returns a score per named dimension against that dimension's
   own `max`, plus the total and pass/fail (pass = total ≥ threshold; a triggered must-not-do is a
   fail outright). A trigger row returns its invoke decision against the expected one — accuracy is
   yours to aggregate across rows and runs, against `eval.trigger.activation_threshold`. A boolean
   scenario returns pass/fail with no dimension scores. Every shape also returns `WHAT WORKED` and
   `WHAT FAILED` — those two are the whole explanation the judge emits, and it emits nothing else.

Run all scenarios before reporting. Do not stop on first failure.

## Invoking aced-case-judge

Pass this context block to the judge:

```
SUBJECT:
<full agent configuration text>

FEATURE_PATH: <path to the frozen .feature>
SCENARIO: <exact scenario name>
ROW: <zero-based Examples row — trigger outlines only>
LAYER: <layer>
THRESHOLD: <inline threshold, else eval.judge.default_threshold>
```

**Pass the path and the name — never the steps, the `Then`, or the rubric.** The judge simulates and
scores in two separate contexts and composes the simulating context's brief with the
`extract-situation` engine; handing it the scenario body would put the answer key back in the
context that has to reach the answer. One invocation covers both passes — never sequence them here.

## Compute results

After all scenarios:

- Pass rate = passing scenarios / total scenarios
- Per-layer breakdown (trigger pass rate, behavior pass rate)
- Failing scenarios sorted by **margin** (`total − threshold`) ascending, worst first

Report each scenario's total **against its own maximum** (`4/5`), never as a bare number. Maxima
differ per scenario, so a mean taken across raw totals compares scales that do not line up — if you
report a headline number, report the mean **margin** or the mean **fraction of maximum**, and say
which.

## Write results

Write to the node's `results/<ISO8601-timestamp>.json` under its project-spec directory:

```json
{
  "timestamp": "<ISO8601>",
  "target": "<agent configuration path>",
  "pass_rate": 0.82,
  "scenarios": [
    {
      "name": "<scenario name>",
      "layer": "behavior",
      "dimensions": [
        { "name": "correctness", "score": 2, "max": 3 },
        { "name": "completeness", "score": 1, "max": 2 }
      ],
      "total": 3,
      "max": 5,
      "threshold": 4,
      "pass": false,
      "what_worked": "...",
      "what_failed": "..."
    }
  ]
}
```

A `@trigger` row carries `"row"`, `"invoke"`, `"expected"`, and `"pass"` instead of `"dimensions"`; a
boolean scenario carries `"pass"` alone.

## Report to user

```
ACED Run — <name>
──────────────────────────
Pass rate:  18/22 (82%)

Trigger layer:  8/10 (80%)
Behavior layer: 10/12 (83%)

FAILING SCENARIOS (worst first):
  ✗ no trigger for an audit request   [invoked: no, expected: yes] — <what failed>
  ✗ stages only related files         [3/5 vs 4: correctness 2/3, completeness 1/2] — <what failed>
  ✗ trigger on skill creation         [invoked: yes, expected: no] — <what failed>
  ✗ red tests block the commit        [3/5 vs 4: correctness 1/3, completeness 2/2] — <what failed>

Run improve to address failing scenarios.
Run compare after editing the agent configuration.
```

If pass rate is 100%, say so and suggest running `add-scenario` to expand edge case coverage.
