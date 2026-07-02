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
- Mean score (latest run)
- Pass rate delta vs. previous run (trend)
- Worst-scoring failing case name and score

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

  Suite                  Status       Pass    Mean  Trend
  ─────────────────────────────────────────────────────
  commit-discipline      healthy      95%     4.6   ↑ +5%
  create-skill           degraded     76%     3.7   → 0%
  aced-case-judge             critical     58%     3.1   ↓ -12%
  subagents/researcher   no-data       —       —    —

NEEDS ATTENTION:
  ✗ aced-case-judge (critical, trending down) — run aced-improve
  ⚠ create-skill (degraded) — run run for details

Suites with no results: subagents/researcher — run run to initialize
```

## Optional: full detail mode

If the user asks for details on a specific suite, print all failing cases with scores and explanations from the latest result file.

## Suggest next actions

- For `critical` or `trending-down`: suggest `improve`
- For `degraded`: suggest `run` for details, then `improve`
- For `no-data`: suggest `run`
- For all `healthy` with no trend data: suggest `add-scenario` to expand coverage
