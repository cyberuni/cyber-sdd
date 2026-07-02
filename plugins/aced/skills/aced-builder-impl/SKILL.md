---
name: aced-builder-impl
description: "Internal skill: the ACED Builder bar at the impl gate — the scenario→rubric eval-suite conformance criteria (one eval per frozen scenario, N-run scoring, score-vs-threshold collapse). Unions onto sdd:builder-impl-governance. Loaded by the ACED impl-producer to self-align and by the impl-judge to verify. Not triggered by users directly."
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
which has no deterministic test runner, reaches a per-scenario boolean through a scored eval suite.
One merged bar loaded by **both** faces — the ACED impl-producer (`define-agent` / `improve`, forward,
which **authors** the eval suite) and the cold impl-judge (`aced-impl-judge`, backward, which
**runs** it). `producer ≠ judge` holds at the agent level.

## The bar

- **One eval per frozen scenario.** The impl-producer authors a scenario→rubric eval suite (`eval.md`
  thresholds + `golden-set/` cases) keyed by name to each **frozen** `.feature` scenario. A frozen
  scenario with no eval is a `BLOCKER` — the judge runs evals, it never free-authors one.
- **Run policy is explicit.** Trigger-layer scenarios run `trigger_runs` against `trigger_threshold`
  (accuracy); behavior/quality scenarios run N times against the per-scenario `threshold` (defaults:
  `judge_model` claude-sonnet-4-6, threshold 4, trigger_threshold 0.5, trigger_runs 3 — overridable).
- **Collapse to a boolean.** A scenario passes when its aggregate `score ≥ threshold` (trigger
  scenarios: accuracy ≥ trigger_threshold); `IMPLEMENTATION_PASS` is true only when every frozen
  scenario passes. The rubric (1–5) and threshold are evaluation detail — they live in the eval suite,
  never in the `.feature`.
- **The runner is separate from the author.** Independence comes from the frozen `.feature` anchor and
  from a runner (`aced-case-judge`) that is not the producer — the producer cannot declare its own pass.
