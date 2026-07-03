---
spec-type: behavioral
concept: [eval-run]
---

# compare — diff two config versions for regressions

Run the golden set against before/after and classify each case (improved / regressed / unchanged / now-passing / now-failing).

## Use Cases

**Subject** — scoring two versions of a target agent configuration against the same golden set and
diffing the results to catch regressions before a change is committed.
**Non-goals** — scoring a single version (`run`); the project-wide roll-up (`report`); authoring or
fixing cases (`add-scenario` / `improve`); deciding a single case's pass/fail (that is `aced-case-judge`).

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Trigger on a comparison request | a request to compare / diff two versions or check for regressions, vs. a sibling intent (score one version, project roll-up, author a case) carrying the same eval vocabulary | `compare` fires for a two-version diff and defers when the intent belongs to `run` / `report` / `add-scenario` |
| Resolve the two versions | no explicit versions (default: working tree vs. previous revision), two explicit paths, or a git ref for the "before" | a before-version and an after-version are identified and both read in full |
| Score both versions | the resolved versions and the shared golden set | every case is scored against both versions and labeled before / after |
| Diff and classify | the before / after per-case results | each case is classified improved / regressed / unchanged / now-passing / now-failing, with a net pass-rate delta; nothing is persisted unless the user asks |
| Gate on regression | the classified diff | a regression blocks with an explicit warning; a clean net-improvement is confirmed safe to commit |
