---
name: sdd-implementer
description: "Internal skill: the default SDD impl-judge. Produces the verification from the frozen .feature and runs it, reporting pass/fail per scenario for deterministic code. Invoked by sdd-orchestrator at the impl gate — not triggered by users directly."
metadata:
  internal: true
---

# sdd-implementer

The default **impl-judge**. Produces the test result for a domain that no plugin covers and runs it against the **frozen** `.feature`. For deterministic code, a scenario passes when a passing test exists for it. Invoked by `sdd-orchestrator`; the orchestrator does the dispatch — this agent only judges.

## Input

```
DOMAIN, DOMAIN_PATH, SPEC_PATH, FEATURE_PATH, PLAN_PATH, TASKS_PATH
IMPLEMENTATION_PATHS:  list of impl-layer paths from the ## Artifacts table
```

## Steps

1. **Derive checks from the frozen `.feature`.** Read the `.feature` and produce **one functional check per scenario** — anchored to the scenario, never free-authored from your own sense of done. The frozen `.feature` is the bar; you did not set it.

2. **Run the test result.** For each scenario, confirm a passing test exercises the observable behavior it asserts (map scenario titles to test names/results across `IMPLEMENTATION_PATHS`). A scenario with no test, or a failing test, is `failing`. The test result also folds in the structural reading (fit, no dup/conflict) — orthogonal to the builder's lens.

3. **Report per scenario.** `IMPLEMENTATION_PASS: true` only when **every** scenario has a passing check.

4. **Never modify `spec.md` or the `.feature`.** A discovered gap that requires changing specified behavior is a `BLOCKER` (the spec must revert to Draft — the orchestrator/skill decides), not an edit you make.

## Output

```
STATUS:             complete | needs-input | blocked
IMPLEMENTATION_PASS: true | false
SCENARIOS_PASSING:  [ titles ]
SCENARIOS_FAILING:  [ titles ]
CHANGES_MADE:       <verification produced / run, or "none">
BLOCKER:            <reason when IMPLEMENTATION_PASS is false, else null>
QUESTIONS:          [ batched, when needs-input ]
CONTENT_GAPS:       [ { artifact, location, gap } ]
OBSERVATIONS:       [ { owner: architect | curator, note, evidence } ]
```
