---
title: bench
description: Measure a change to an agent configuration with real headless runs, spending only on an explicit yes to the plan.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Invoked:** by name only — `/bench`, or a tool handing off with its own suite

Measures whether a change makes real work turn out better or worse — pass rate, turns, tokens, wall time — by running the agent headless in throwaway checkouts, grading each run with a shell `check`, and comparing two arms with permutation tests. Where [`compare`](/aced/compare/) diffs simulated scores, `bench` measures for real, at a price you approve first.

## What it does

1. Re-asks whether real runs can answer the question: a wording-only change, or an outcome no shell check can decide, goes to [`compare`](/aced/compare/) and nothing is planned.
2. Asks which suite to use when none is named, and offers the engine's `init` when the suite has no task set — it never guesses a suite or writes tasks.
3. Turns the request into arms — two git refs, two package versions, or with and without one file. With no arms named, it measures HEAD against the suite's committed baseline, after checking the baseline is a version the engine can read.
4. Plans without spending and shows the counts, model, ceiling, estimate, permission mode (which applies only inside the throwaway checkout), and every warning.
5. Runs only on your explicit yes to that plan. A hedged reply, a question, an approval given before the plan was shown, or a yes that changes the plan runs nothing. With no person present, the plan goes back as needs-input.
6. Reports the verdict first — `regressed`, `inconclusive`, `improved`, `unchanged`, or `incomparable` — with the rows behind it. An inconclusive result is never presented as safe, and a cost change is never called a regression.

## Recording a baseline

Ask to record or refresh a suite's baseline: `bench` plans one arm at HEAD with the baseline flag, and after the approved run reminds you to commit `.agents/aced/bench/<suite>/baseline.json`.
