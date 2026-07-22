---
title: compare
description: Diff ACED eval scores between two versions of an agent configuration to catch regressions.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Trigger:** comparing two versions of an agent configuration to detect regressions or confirm improvements before committing a change

Runs the golden set against two versions of a target agent configuration and diffs the results.

## What it does

1. Identifies the two versions — default is current working tree vs. previous git revision, or the user supplies two explicit paths or a git ref. Reads both in full; if the "before" version can't be resolved, stops and scores neither side.
2. Runs every scenario in the node's frozen `<node>.feature` against both versions through `aced-case-judge` (the same process as [`run`](/aced/run/), passing the `.feature` path and scenario name, never the scenario body), labeled **before** and **after**.
3. Does not write to `results/` — a diff operation, not a recorded run (unless the user explicitly asks to record).
4. Computes, per scenario: before/after **per dimension** (`score`/`max`) plus each side's total against the same maximum, before/after pass/fail, and change type (`improved` / `regressed` / `unchanged` / `now-passing` / `now-failing`).
5. Reports net pass-rate delta, counts by change type, and the per-dimension deltas — which are what say *where* the change landed.

## Regression gate

If any scenario regressed (a dimension dropped, the total dropped, or it flipped pass→fail), it flags `⚠ REGRESSION DETECTED` explicitly and recommends not committing until resolved — run [`improve`](/aced/improve/) or revert. With no regressions and a net improvement, it confirms the change is safe to commit.
