---
title: report
description: Project-wide health dashboard across all ACED eval suites — pass rates, trends, and what needs attention.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Trigger:** the user wants a project-wide health summary of all ACED eval suites — pass rates, trends, and which agent configurations need attention

Generates a project-wide health dashboard across all eval suites.

## What it does

1. Scans `artifacts/specs/` for subdirectories containing `eval.md`. If none are found, reports that no eval suites are initialized and suggests `sdd:start-mission`.
2. For each suite, reads `eval.md` (target, threshold), the most recent `results/` file, and the second-most-recent for trend.
3. Computes pass rate, mean score, pass-rate delta vs. previous run, and the worst-scoring failing case.
4. Classifies each suite's health:

| Status | Condition |
|---|---|
| `healthy` | Pass rate ≥ 90% |
| `degraded` | Pass rate 70–89% |
| `critical` | Pass rate < 70% |
| `trending-down` | Pass rate dropped ≥ 10% vs. previous run |
| `no-data` | No results yet |

5. Reports a table of all suites plus a "needs attention" list, and can print full failing-case detail for a specific suite on request.

## Next actions suggested

- `critical` / `trending-down` → run [`improve`](/aced/improve/)
- `degraded` → run [`run`](/aced/run/) for details, then [`improve`](/aced/improve/)
- `no-data` → run [`run`](/aced/run/)
- `healthy` with no trend data → run [`add-scenario`](/aced/add-scenario/) to expand coverage
