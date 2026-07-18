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
- **rubric-structure** *(`@rubric` scenarios)* — a `@rubric` scenario is well-formed: named dimensions, a per-dimension `max`, exactly one `threshold`, a collapsing `Then` (`the rubric score is at least the threshold`), and **no double-barreled dimension** (two criteria joined by *and*, e.g. `harness_agnostic_and_mcp_free` — a config satisfying one half and failing the other makes every awardable number report something false). A malformed one fails this check *before* any scoring; a well-formed one passes **this check** (its rubric lingo is sanctioned, not a leak). Passing rubric-structure is **not acceptance** — the scenario is still checked for selection, then discrimination. Scoring itself is the impl-judge's job.
- **selection** *(all tiers; every `@rubric` dimension — **runs BEFORE discrimination**)* — a `@rubric` is a **compensatory** model: the sum lets strength on one dimension pay for weakness on another, so every dimension must be **substitutable**: you must accept that strength elsewhere pays for weakness here. Fail a `@rubric` that sums a criterion whose trade nobody would accept (*"great scope makes up for shipping an npx dependency"*) — it belongs in a boolean `Then`, not in the sum, and graded as a dimension it becomes **tradeable**, which no threshold repairs. Fail a **double-barreled** dimension (`harness_agnostic_and_mcp_free`) — two criteria joined by *and* have no honest score and hide a selection decision. Do **not** demand a per-dimension minimum instead — that is **conjunctive** scoring, which is less reliable, not safer: the least-reliable subscore controls the outcome and it yields more **false negative classification errors**. A criterion that does not belong in the sum needs no discrimination analysis, so every dimension reaching discrimination has already cleared selection. **Rule when you can; escalate only when you cannot** — a trade you **can rule that you reject** is a **fail**, not an escalation, **however arguable it is**; escalate only the trade you can rule **neither** way on. Arguable is not the trigger, unrulable is. **Re-derive the trade; never grade the producer's account of it:** a dimension may record the trade it accepts and what pays for it, but that record is for the **owner**, not for you — do not grade it, do not fail a dimension over it, and do not report one that is missing. Judge the **dimensions**. Selection has **no second reader** — discrimination cannot back it up, since the subject that would expose a smuggled criterion is a blemished good subject the miss test bars, and selection runs first, so nothing downstream re-asks. **Fail a dimension that re-grades a property a boolean scenario in the same suite already decides** — that boolean is an untradeable rule, and scoring it as a dimension smuggles it into the compensatory sum (the boolean-smuggling tell: if ACED rubrics begin restating booleans, the boundary was set too high). Classify by **same-object**, never same-criterion: fail a dimension only when a boolean scenario in the same suite decides that **exact property**; two dimensions that merely **share a criterion**, with no boolean twin deciding either, do not fail selection for sharing it — comparing two dimensions to each other is the twin-scan SDD issue #280 rejected. #280's discrimination verdict (noise, not a hole) and this Selection verdict (a smuggled boolean, out of the sum) are orthogonal reads of one dimension.
- **discrimination** *(all tiers; every scenario and every `@rubric` dimension)* — each must be able to **register a miss**: name a **plausible wrong config** that fails it, or that scores below the dimension's `max`. If you can name none, fail the scenario on discrimination. The wrong config must be plausible — an empty file fails everything and clears nothing. For an agent-config the default wrong subject is the **config-quoting memorizer** (the subject is a document you also read), so fail a dimension that grades **presence** (a line is emitted), **restatement** (the config's own words), or **procedure** (the steps, not the judgment), and fail a dimension whose terms are lifted from the config's own vocabulary. Sum what the memorizer **banks** across the rubric — never zero a dimension to make a point — and that sum must sit **strictly under** the threshold (a tie passes). **Never fail a rubric for clearing by "only one point"**: how far under is the judge's noise at the cut (**cSEM**), a measured property of the instrument, not a constant this bar decrees. Well-formed is never acceptance; a green mechanical check never clears this. **Escalate a scenario you cannot classify rather than passing it.**
- **pairwise-consistency** *(all tiers; the suite, not a scenario)* — no two scenarios sharing a `When` demand opposite verdicts on one constructible snapshot. `Given`s may overlap when the `Then`s agree — the check is the contradiction, never the overlap; two scenarios whose `When`s name different operations do not contradict. **Specialization is not contradiction:** a general scenario and a specific sibling whose narrower `Given` carves out an exception do not contradict, even when the general `Given` does not literally exclude it — read every pair as generic/specific *before* reading it as a contradiction, and never demand the exclusion be retrofitted into a frozen `Given`. A contradiction is a pair with **no intended winner**. Fail the **suite** on pairwise-consistency and name both scenarios.

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
