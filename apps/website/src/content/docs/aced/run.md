---
title: run
description: Score an ACED golden set against the current agent configuration and report results.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Trigger:** run after editing a skill, `AGENTS.md` section, subagent, or command, to score its current behavior against its golden set

Runs the frozen `.feature` suite for a target agent configuration and reports pass rate and per-layer results. The `.feature` is the single eval source — boolean scenarios, inline `@rubric` criteria, and the `@trigger` `Scenario Outline` all live in it; `eval.md` carries only the subject binding and run policy.

## What it does

1. Locates the target's node in the project spec — `.agents/specs/<project>/…/<node>/`, discovered through the SDD spec tree (the node's `eval.md` names the subject) — which holds the frozen `<node>.feature` and its colocated `eval.md` (asks if multiple nodes carry an `eval.md`; stops and reports if no suite is initialized).
2. Reads the run policy from `eval.md` — `subject`, `eval.layers`, `eval.judge.{model, default_threshold}`, and `eval.trigger.{activation_threshold, runs}` — then reads the current subject agent configuration in full.
3. For each scenario in the frozen `.feature`, invokes the `aced-case-judge` subagent **blind** — passing only the `.feature` path and the scenario name, never the `Then` or the rubric — skipping any layer not enabled in `eval.md`. A `@rubric` scenario carries its rubric inline; a `@trigger` `Scenario Outline` runs one case per `Examples` row.
4. Runs every scenario before reporting (does not stop on first failure).
5. Writes results to `.agents/aced/results/<target-slug>/<ISO8601-timestamp>.json` — the shared, git-ignored ACED results directory at the repo root, keyed by the target — recording each scenario's per-dimension scores, total against its own maximum, threshold, and pass/fail.
6. Reports pass rate, per-layer breakdown, and failing scenarios sorted worst-first by margin.

## Next step

If cases fail, run [`improve`](/aced/improve/) to diagnose the pattern. If pass rate is 100%, run [`add-scenario`](/aced/add-scenario/) to expand edge-case coverage.
