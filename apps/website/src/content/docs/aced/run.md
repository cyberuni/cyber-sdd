---
title: run
description: Score an ACED golden set against the current agent configuration and report results.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Trigger:** run after editing a skill, `AGENTS.md` section, subagent, or command, to score its current behavior against its golden set

Runs the eval suite for a target agent configuration and reports pass rate, mean score, and per-layer results.

## What it does

1. Locates `artifacts/specs/<feature-name>/eval.md` (asks if multiple suites exist; stops and reports if none exist).
2. Reads the target, judge model, threshold, and enabled layers from `eval.md`, then reads the current target agent configuration in full.
3. For each case in `golden-set/`, invokes the `aced-case-judge` subagent with the target's full text, the scenario, expected behaviors, must-not-do list, and rubric — skipping layers not enabled in `eval.md`.
4. Runs every case before reporting (does not stop on first failure).
5. Writes results to `artifacts/specs/<feature-name>/results/<ISO8601-timestamp>.json` with pass rate, mean score ± standard deviation, and per-case results.
6. Reports pass rate, per-layer breakdown, and failing cases sorted worst-first.

## Next step

If cases fail, run [`improve`](/aced/improve/) to diagnose the pattern. If pass rate is 100%, run [`add-scenario`](/aced/add-scenario/) to expand edge-case coverage.
