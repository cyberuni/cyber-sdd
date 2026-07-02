---
name: aced-builder-impl
description: "Internal skill: the ACED Builder bar at the impl gate — the frozen .feature conformance criteria (each scenario's inline eval run, N-run scoring, score-vs-threshold collapse). Unions onto sdd:builder-impl-governance. Loaded by the ACED impl-producer to self-align and by the impl-judge to verify. Not triggered by users directly."
user-invocable: false
metadata:
  actor: builder
  gate: impl
  compose: union
---

# ACED Builder-Impl Governance — the eval-suite conformance bar

The **Builder** bar at the **impl gate**, specialized for agent-configuration artifact-types. It
**unions onto** `sdd:builder-impl-governance` — the generic conformance bar still applies (checks
derived from the frozen `.feature`, no green-by-tampering); this adds how an *agent-config* subject,
which has no deterministic test runner, reaches a per-scenario boolean through a scored eval read
**directly from the frozen `.feature`**. One merged bar loaded by **both** faces — the ACED
impl-producer (`define-agent` / `improve`, forward, which **builds the subject config**) and the cold
impl-judge (`aced-impl-judge`, backward, which **runs** the suite). `producer ≠ judge` holds at the
agent level.

## The bar

- **The eval is the frozen scenario.** The `.feature` is the single eval source: each scenario carries
  its own eval — a `@rubric` scenario's inline rubric docstring, a `@trigger` `Scenario Outline`'s
  `Examples`, or a boolean `Then`. The rubric was authored inline by `aced-scenario-writer` and frozen
  at the spec gate; the impl-judge **runs** it and never free-authors one. A `@rubric` scenario missing
  its inline rubric block is a `BLOCKER`.
- **Run policy is explicit — from `eval.md`.** Read the `eval:` block: `@trigger` scenarios run
  `eval.trigger.runs` against `eval.trigger.activation_threshold` (accuracy); `@behavior`/`@quality`
  scenarios run N times against the scenario's inline `threshold` (else `eval.judge.default_threshold`),
  scored by `eval.judge.model`. Defaults when omitted: model claude-sonnet-4-6, default_threshold 4,
  trigger activation_threshold 0.5, trigger runs 3.
- **Collapse to a boolean.** A scenario passes when its aggregate `score ≥ threshold` (trigger
  scenarios: accuracy ≥ activation_threshold); `IMPLEMENTATION_PASS` is true only when every frozen
  scenario passes.
- **The runner is separate from the author.** Independence comes from the frozen `.feature` anchor and
  from a runner (`aced-case-judge`) that is not the producer — the producer cannot declare its own pass.
