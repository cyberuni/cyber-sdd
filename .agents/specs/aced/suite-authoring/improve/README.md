---
spec-type: behavioral
concept: [suite-authoring]
---

# improve — diagnose failures and propose fixes

Group failing cases by pattern and propose before/after config diffs; auto-run compare after edits.

## Use Cases

**Subject** — diagnosing a target configuration's failing evals, grouping them by failure pattern,
proposing concrete before/after edits, and verifying the change with `compare`.
**Non-goals** — authoring a brand-new case (`add-scenario`); scoring the suite (`run`); diffing two versions
on demand (`compare`); how a single case is scored (that is `aced-case-judge`).

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Trigger on a fix request | a request to diagnose / fix a config whose evals are failing, vs. a sibling intent (capture a new case, score, diff) carrying the same failing-case vocabulary | `improve` fires for a fix-the-config request and defers when the intent belongs to `add-scenario` / `run` / `compare` |
| Load the context | the eval config, the target configuration, and the latest results record | the target is read in full alongside the most recent results, or the user is pointed at `run` when no results exist |
| Identify the failures | the latest results | only the cases marked failing are collected, and nothing-to-propose is reported when none fail |
| Group by pattern | the collected failures | each failure is classified into a failure pattern and the groupings are reported before any fix |
| Propose edits | a pattern grouping | each pattern yields a concrete before/after diff rather than prose, no fix ever removes a test case, and a recommendation is given when no clean fix exists |
| Apply and verify | user-approved edits | edits are applied only after approval, then `compare` runs automatically over the before and after revisions |
