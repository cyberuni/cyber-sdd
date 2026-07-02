---
spec-type: behavioral
---

# report — project-wide eval health

Aggregate all suites into pass rates, trends, and attention flags.

## Use Cases

**Subject** — rolling every eval suite in the project into one health dashboard: per-suite pass
rate, trend versus the previous run, a health classification, and what needs attention.
**Non-goals** — scoring a single suite (`run`); diffing two versions (`compare`); authoring or
fixing cases (`add-scenario` / `improve`); deciding a single case's pass/fail (that is `aced-case-judge`).

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Trigger on a health-summary request | a request for the project-wide eval health / which configs need attention, vs. a sibling intent (score one suite, diff two versions, author a case) carrying the same eval vocabulary | `report` fires for a project-wide roll-up and defers when the intent belongs to `run` / `compare` / `add-scenario` |
| Discover the suites | the project's `artifacts/specs/` tree, or none | every suite with an `eval.md` is discovered, reading its latest and previous results; a no-suite message when none exist |
| Classify each suite's health | the latest and previous results per suite | each suite is classified healthy / degraded / critical / no-data / trending-down |
| Render the dashboard | the per-suite metrics | a dashboard of pass rate, mean, and trend per suite, plus a needs-attention list, is rendered |
| Suggest the next action | each suite's health | the matching next skill is suggested per health (improve / run / add) |
