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

For each version, run every scenario in the frozen `artifacts/specs/<feature-name>/<feature-name>.feature` through `aced-case-judge` (same process as `run`) — passing the `.feature` path and the scenario name, never the scenario body. The judge blinds its own simulating context; handing it the `Then` or the rubric would defeat that.

Label results as **before** and **after**.

Do not write to `results/` during compare — this is a diff operation, not a recorded run. Only write if the user explicitly asks to record.

## Compute the diff

For each scenario, record:
- Before and after **per dimension** (`score`/`max`), plus each side's total against the same maximum
- Before pass/fail, after pass/fail
- Change type: `improved` | `regressed` | `unchanged` | `now-passing` | `now-failing`

Both sides are scored against the **same frozen scenario**, so their maxima match and their totals
are comparable to each other. Totals are **not** comparable across different scenarios — maxima
differ per scenario, so never average raw totals into a headline number. Aggregate instead:
- Net pass rate delta (e.g., +3 scenarios passing)
- Count by change type
- The per-dimension deltas, which are what say *where* the change landed

A dimension delta is the useful signal: a total that holds steady while one dimension drops and
another rises is a real change the total hides.

## Report

```
ACED Compare — <name>
──────────────────────────────
Before: 18/22 passing (82%)
After:  21/22 passing (95%)

Net change: +3 passing

IMPROVED (now passing, or a dimension gained):
  ✓ no trigger for an audit request   invoked no → yes (expected yes)   now passing
  ✓ stages only related files         3/5 → 4/5  correctness 2/3 → 3/3   now passing
  ✓ red tests block the commit        3/5 → 5/5  correctness 1/3 → 3/3, completeness 2/2 → 2/2  now passing

REGRESSED (now failing, or a dimension lost):
  none

UNCHANGED: 18 scenarios
```

## Regression gate

If any scenario regressed (a dimension dropped, the total dropped, or it flipped from pass to fail), warn explicitly:

```
⚠ REGRESSION DETECTED
  ✗ trigger on skill creation  5 → 3  (was passing, now failing)

Do not commit this change until the regression is resolved.
Run improve to address it, or revert and try a different edit.
```

If no regressions and net improvement: confirm the change is safe to commit.
