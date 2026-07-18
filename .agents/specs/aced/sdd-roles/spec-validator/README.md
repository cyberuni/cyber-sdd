---
spec-type: behavioral
concept: [sdd-roles]
---

# spec-validator — the spec-judge role

Judge an agent-config .feature against the agent-scenario criteria (trigger context, near-miss balance, coverage, edges).

## Use Cases

**Subject** — when the conductor dispatches it as the spec-judge at the spec gate, grading an
agent-config `.feature` against the agent-scenario criteria (trigger context, near-miss balance,
rule coverage, edge coverage, boolean form, rubric structure, selection, discrimination, pairwise
consistency) and reporting a per-scenario verdict.
**Non-goals** — writing or fixing the `spec.md` or `.feature` (that is `scenario-writer`); running
or scoring the eval suite (`implementer` / `judge`); the generic SDD `spec-gate` gate check.

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Judge a .feature at the spec gate | dispatched as the spec-judge with the `.feature` and the subject text | it reports a pass/fail verdict per scenario and never edits the spec or feature |
| Check trigger context | a scenario built on a vague stand-in where the value matters for simulation | that scenario is reported failing on trigger-context |
| Check rule coverage | a subject rule with no behavior scenario | the suite is reported failing on rule-coverage |
| Read fit before grading | a subject whose `spec.md` declares a `**Fit:**` tier | it reads the tier and applies only the criteria that tier carries; a missing declaration is a `CONTENT_GAP` (never default to strong) |
| Recuse a wrong-squad subject | a subject determined wrong-squad for ACED | it reports the subject recused rather than a per-scenario verdict |
| Check trigger balance (tier-conditional) | a **strong-fit** suite with only obviously-irrelevant negatives and no near-miss | the suite is reported failing on trigger-balance; a **partial-fit** suite with no near-miss **passes** (near-miss N/A) |
| Check edge coverage | fewer than three edge-case or must-not-do guard scenarios | the suite is reported failing on edge-coverage |
| Check boolean form | an **untagged** `Then` that embeds a rubric, threshold, or score | that scenario is reported failing on boolean-form |
| Check rubric structure | a `@rubric` scenario | a well-formed one (dimensions + per-dimension max + one threshold + collapsing `Then`) is accepted **on rubric-structure**; a malformed one is reported failing on rubric-structure before scoring. Structure is checked independently of discrimination below — passing it is never acceptance of the scenario |
| Check selection | a `@rubric` dimension scoring a criterion no strength elsewhere pays for — including one re-grading a property a **boolean scenario in the same suite** already decides (an untradeable boolean smuggled into the compensatory sum) | that scenario is reported failing on **selection**; the smuggling is classified by whether a boolean in the suite decides the property (**same object**), never by comparing two dimensions for a shared criterion (SDD #280) — two dimensions sharing only a criterion, with no boolean twin, pass (`../../design/decisions/0002-boundary-vs-surface-more.md`) |
| Check discrimination | a scenario, or a `@rubric` dimension, that no plausible wrong subject fails. For an agent-config the default wrong subject is the **config-quoting memorizer**: the subject is a document the case-judge also reads, so a dimension drawn from the subject's own vocabulary grades recall | that scenario is reported failing on discrimination; a well-formed rubric passing rubric-structure is no defense |
| Check pairwise consistency | two scenarios in one suite sharing a `When`, whose `Given`s both hold of one constructible snapshot and whose `Then`s demand opposite verdicts | the suite is reported failing on pairwise-consistency |
| Pass a clean suite | a `.feature` meeting every criterion | every scenario is reported passing with no blocker |
| Guard on missing subject | the subject text is null or unreadable | it returns needs-input rather than inventing the contract |
