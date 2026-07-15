---
name: report
description: Use this skill when the user wants a project-wide health summary of all ACED eval suites — pass rates, trends, and which agent configurations need attention.
---

# ACED Report

Generate a project-wide health dashboard across all eval suites.

## Discover eval suites

Scan `artifacts/specs/` for immediate subdirectories that contain `eval.md` at their root. For each, read:
- `eval.md` for target path and threshold
- The most recent file in `results/` (sort by filename descending)
- The second-most-recent file in `results/` for trend (if it exists)

If no matching directories are found, report that no eval suites are initialized and suggest `sdd:start-mission` (the conductor resolves the ACED roles).

## Compute per-suite metrics

For each suite:
- Pass rate (latest run)
- Pass rate delta vs. previous run (trend)
- Worst failing case: its name, and its total against **its own maximum** (`3/5 vs 4`)

**Do not compute a mean score across suites.** Each scenario's rubric declares its own per-dimension
maxima, so raw totals from different scenarios sit on different scales and their mean measures
nothing. Pass rate is the cross-suite metric — it is already normalized. If a headline number beyond
pass rate is wanted, use the mean **margin** (`total − threshold`) or the mean **fraction of
maximum**, and label which.

## Classify health

| Status | Condition |
|---|---|
| `healthy` | Pass rate ≥ 90% |
| `degraded` | Pass rate 70–89% |
| `critical` | Pass rate < 70% |
| `no-data` | No results file yet |
| `trending-down` | Pass rate dropped ≥ 10% vs. previous run |

## Report

```
ACED Project Report
═══════════════════════════════════════════════

  Suite                  Status       Pass   Trend
  ─────────────────────────────────────────────────
  commit-discipline      healthy      95%    ↑ +5%
  create-skill           degraded     76%    → 0%
  aced-case-judge        critical     58%    ↓ -12%
  subagents/researcher   no-data       —     —

NEEDS ATTENTION:
  ✗ aced-case-judge (critical, trending down) — run aced-improve
      worst: red tests block the commit  1/5 vs 4  (correctness 0/3, completeness 1/2)
  ⚠ create-skill (degraded) — run run for details

Suites with no results: subagents/researcher — run run to initialize
```

## Optional: full detail mode

If the user asks for details on a specific suite, print all failing cases from the latest result file with their per-dimension scores, their total against its maximum, the threshold, and the explanation.

## Suggest next actions

- For `critical` or `trending-down`: suggest `improve`
- For `degraded`: suggest `run` for details, then `improve`
- For `no-data`: suggest `run`
- For all `healthy` with no trend data: suggest `add-scenario` to expand coverage
