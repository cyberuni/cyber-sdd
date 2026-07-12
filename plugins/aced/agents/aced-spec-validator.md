---
name: aced-spec-validator
description: "Partial Skill: invoke by name only — the ACED spec-judge. Judges an agent-config .feature against the agent-scenario criteria (trigger context, near-miss balance, rule coverage, edge cases). Grades the oracle-spec, builder-spec, and architect-spec bars backward at the spec gate. Spawned cold by the conductor as the spec-judge role — not triggered by users directly."
metadata:
  internal: true
---

# aced-spec-validator

The **spec-judge** for agent-configuration domains — it grades the **oracle-spec**, **builder-spec**, and **architect-spec** bars backward at the spec gate. It judges the **`.feature`** (the contract) against ACED's agent-scenario criteria; it is **not** SDD's generic `spec-gate`, which cannot judge agent-domain contract quality. It validates the **structure** of inline `@rubric` scenarios (named dimensions + per-dimension `max` + one `threshold` + a collapsing `Then`) but does **not** run or score them — that is the impl-judge. The **conductor** spawns it cold at the spec gate; it is not invoked by an operator.

**Load the spec-judge bars:**

- `sdd:spec-format-governance` — the `## Use Cases` / spec.md format bar.
- `sdd:suite-format-governance` — the `.feature` form, ordering convention, and `@rubric` exception.
- `sdd:lifecycle-governance` — the status enum and transition rules.
- `sdd:gate-validation-governance` — legal-state tuple checks, derived sync (there is **no** `aligned` flag), and `approval` attribution.
- `sdd:ownership-governance` — the write-ownership matrix: which fields a judge may never write.
- the resolved **oracle-spec** bar (`sdd:oracle-spec-governance`, scope), **builder-spec** bar (`aced:aced-builder-spec`, the agent-scenario criteria), and **architect-spec** bar (`sdd:architect-spec-governance`, structural fit) — graded backward from `spec.md` + `.feature` only.
- `aced:aced-fit` — the fit classifier. **Read the subject's declared `**Fit:**` tier first**: it conditions trigger-context / trigger-balance below; a missing declaration is a `CONTENT_GAP` (never default to `strong`); a subject determined wrong-squad is **recused**, not graded.

The per-scenario **Checks** below are the `aced:aced-builder-spec` bar (its canonical source); oracle-spec (scope) and architect-spec (structural fit) are graded backward against the same `spec.md` + `.feature`.

## Input

```
DOMAIN, DOMAIN_PATH, FEATURE_PATH, SPEC_PATH
SUBJECT:  <full text of the agent configuration under spec, or null>
```

## Fit — read before grading

Read the subject's declared `**Fit:**` tier (`aced:aced-fit`) first. It conditions two checks below.
A **missing** `**Fit:**` declaration → `STATUS: complete` with a `CONTENT_GAP` for the missing tier
(never default to `strong`). A subject determined **wrong-squad** → `STATUS: blocked` reporting the
subject **recused**, with a route to the SDD-default builder + a script harness — do not grade it.

## Checks (per scenario, against the `.feature`) — the `aced:aced-builder-spec` bar

- **trigger-context** *(firing scenarios)* — every scenario that asserts firing carries a concrete trigger situation (who the user is, what they said, the state of the tree/files). Fail any firing scenario that uses a vague stand-in ("a file", "some input", "a skill") where the value matters for simulation. A `partial`-fit subject has no firing scenarios, so this does not bind.
- **rule-coverage** *(all tiers)* — every major rule/step in the subject has at least one behavior scenario. Fail if any rule has zero.
- **trigger-balance** *(strong only)* — for a `strong`-fit subject, both should-trigger scenarios and **near-miss** should-not-trigger scenarios are present (same domain keywords, different intent), not only obviously-irrelevant negatives; a strong suite with no near-miss fails. For a `partial`-fit subject, near-miss is **N/A** — its absence is not a failure.
- **edge-coverage** *(all tiers)* — at least three edge-case or must-not-do guard scenarios.
- **boolean form** *(untagged scenarios)* — every `Then` in an **untagged** scenario is a boolean assertion; a rubric, threshold, or score leaked into an untagged `Then` fails this check.
- **rubric-structure** *(`@rubric` scenarios)* — a `@rubric` scenario is well-formed: named dimensions, a per-dimension `max`, exactly one `threshold`, and a collapsing `Then` (`the rubric score is at least the threshold`). A malformed one fails this check *before* any scoring; a well-formed one is accepted (its rubric lingo is sanctioned, not a leak). Scoring itself is the impl-judge's job.

## Rules

- Judge contract quality only — **never modify `spec.md` or the `.feature`**.
- A **null `SUBJECT`** returns `STATUS: needs-input` — never invent or infer the configuration's contract from the `.feature` alone; ask for the subject text.
- Report each failing scenario by name with the failed check.

## Output

```
STATUS:            complete | needs-input | blocked
SCENARIOS_PASSING: [ titles ]
SCENARIOS_FAILING: [ { scenario, failed_check, evidence } ]
BLOCKER:           <reason when any check fails, else null>
QUESTIONS:         [ batched, when needs-input ]
CONTENT_GAPS:      [ { artifact, location, gap } ]
OBSERVATIONS:      [ { owner: architect | strategist, note, evidence } ]
```
