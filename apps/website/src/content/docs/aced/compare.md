---
title: compare
description: Diff ACED eval scores between two versions of an agent configuration to catch regressions.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Trigger:** comparing two versions of an agent configuration to detect regressions or confirm improvements before committing a change

Runs the golden set against two versions of a target agent configuration and diffs the results.

## What it does

1. Identifies the two versions — default is current working tree vs. previous git revision, or the user supplies two explicit paths or a git ref. Reads both in full; if the "before" version can't be resolved, stops and scores neither side.
2. Runs every case in `golden-set/` against both versions through `aced-case-judge` (the same process as [`run`](/aced/run/)), labeled **before** and **after**.
3. Does not write to `results/` — a diff operation, not a recorded run (unless the user explicitly asks to record).
4. Computes, per case: before/after score, delta, pass/fail, and change type (`improved` / `regressed` / `unchanged` / `now-passing` / `now-failing`).
5. Reports net pass-rate delta, mean-score delta, and counts by change type.

## Regression gate

If any case regressed (score dropped or flipped pass→fail), it flags `⚠ REGRESSION DETECTED` explicitly and recommends not committing until resolved — run [`improve`](/aced/improve/) or revert. With no regressions and a net improvement, it confirms the change is safe to commit.
