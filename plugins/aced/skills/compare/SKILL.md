---
name: compare
description: Use this skill when comparing two versions of an agent configuration to detect regressions or confirm improvements before committing a change.
---

# ACED Compare

Run the frozen `.feature` suite against two versions of a target agent configuration and diff the results.

## Identify the two versions

Default: current working tree vs. previous git revision.

```bash
git show HEAD:<relative-path-to-agent-config> > /tmp/aced-compare-before.md
```

The user may also provide:
- Two explicit file paths
- A git ref (branch, commit SHA, tag) for the "before" version

Read both versions in full before proceeding. **If the "before" version cannot be read (an unresolvable git ref or a missing path), report that the version cannot be resolved and stop — score neither side.**

## Run evals on both versions

For each version, run every scenario in the frozen `artifacts/specs/<feature-name>/<feature-name>.feature` through `aced-case-judge` (same process as `run`).

Label results as **before** and **after**.

Do not write to `results/` during compare — this is a diff operation, not a recorded run. Only write if the user explicitly asks to record.

## Compute the diff

For each scenario, record:
- Before score, after score, delta
- Before pass/fail, after pass/fail
- Change type: `improved` | `regressed` | `unchanged` | `now-passing` | `now-failing`

Aggregate:
- Net pass rate delta (e.g., +3 scenarios passing)
- Mean score delta (e.g., +0.4)
- Count by change type

## Report

```
ACED Compare — <name>
──────────────────────────────
Before: 18/22 passing (82%)  mean 3.9
After:  21/22 passing (95%)  mean 4.3

Net change: +3 passing, mean +0.4

IMPROVED (now passing or higher score):
  ✓ no trigger for an audit request   2 → 5  (+3)
  ✓ stages only related files         3 → 4  (+1)  now passing
  ✓ red tests block the commit        3 → 5  (+2)  now passing

REGRESSED (now failing or lower score):
  none

UNCHANGED: 18 scenarios
```

## Regression gate

If any scenario regressed (score dropped or flipped from pass to fail), warn explicitly:

```
⚠ REGRESSION DETECTED
  ✗ trigger on skill creation  5 → 3  (was passing, now failing)

Do not commit this change until the regression is resolved.
Run improve to address it, or revert and try a different edit.
```

If no regressions and net improvement: confirm the change is safe to commit.
