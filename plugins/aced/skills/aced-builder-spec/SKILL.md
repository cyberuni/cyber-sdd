---
name: aced-builder-spec
description: "Partial Skill: invoke by name only — the ACED Builder bar at the spec gate — the agent-configuration contract criteria. Loaded by the ACED spec-producer to self-align and by the spec-judge to grade. Not triggered by users directly."
user-invocable: false
metadata:
  actor: builder
  gate: spec
  compose: union
---

# ACED Builder-Spec Governance — the agent-config contract bar

The **Builder** bar at the **spec gate**, specialized for agent-configuration artifact-types
(`skill`, `subagent`, `command`, `agents-section`). It **unions onto** `sdd:builder-spec-governance`
— the generic testability/coverage bar still applies; this adds what makes an *agent-config*
`.feature` a complete, simulable contract. One merged bar loaded by **both** faces — the ACED
spec-producer (`aced-scenario-writer`) reads it forward, the cold spec-judge (`aced-spec-validator`)
reads it backward. `producer ≠ judge` holds at the agent level.

## Fit gate — load first

Load **`aced:aced-fit`** and read the subject's declared `**Fit:**` tier **before** applying the
bar. Two criteria below are **conditional on tier**; a **missing** `**Fit:**` declaration is a
`CONTENT_GAP` (never default to `strong`); a **wrong-squad** subject is **recused**, not graded
(`aced:aced-fit`).

## The bar (per scenario, against the `.feature`)

- **Trigger context** *(scenarios that assert firing).* Every firing scenario carries a concrete
  trigger situation — who the user is, what they said, the state of the tree/files. A firing
  scenario that uses a vague stand-in ("a file", "some input", "a skill") where the value matters for
  simulation fails. A `partial`-fit subject has no firing scenarios, so this does not bind.
- **Rule coverage** *(all tiers).* Every major rule/step in the subject has at least one behavior
  scenario. A rule with zero scenarios fails.
- **Trigger balance** *(strong only).* For a **`strong`**-fit subject, both should-trigger scenarios
  **and near-miss should-not-trigger** scenarios are present (same domain keywords, different intent)
  — not only obviously-irrelevant negatives; a strong suite with no near-miss fails. For a
  **`partial`**-fit subject (a mechanical procedure with no activation decision), near-miss is
  **N/A** — its absence is **not** a failure.
- **Edge coverage** *(all tiers).* At least three edge-case or must-not-do guard scenarios. A
  must-not-do guard is a boolean `Then` asserting the agent *does not* do the prohibited action.
- **Boolean form** *(untagged scenarios).* Every `Then` in an **untagged** scenario is a boolean
  assertion; a rubric, threshold, or score leaked into an untagged `Then` fails.
- **Rubric-structure** *(`@rubric` scenarios).* Graded behavior is authored as a `@rubric` scenario
  with the rubric **inline** (named dimensions + per-dimension `max` + one `threshold` + a collapsing
  `Then`), per `sdd:suite-format-governance`. A malformed `@rubric` fails before scoring; a well-formed
  one passes **rubric-structure** (its rubric lingo is the sanctioned form). Structure passing is
  **not acceptance** — the scenario is still checked for discrimination below. The rubric is
  spec-owned and frozen with the scenario — the impl-judge *runs* it, it does not author it.
- **Discrimination** *(all tiers; every scenario and every `@rubric` dimension).* Each must be able
  to **register a miss** — a plausible wrong config must fail it, or score below the dimension's
  `max` — per the miss test in `sdd:suite-format-governance`, whose **presence / restatement /
  procedural** anti-patterns and under-threshold floor arithmetic apply unchanged. An agent-config
  binds it tighter on two counts:
  - **The memorizer is the default wrong subject.** The subject is a *document the case-judge also
    reads*, so restatement is the dominant failure mode. Name what a **config-quoting memorizer**
    scores on each dimension before accepting the rubric.
  - **Rubric vocabulary is not the subject's vocabulary.** A dimension whose terms are lifted from
    the config's own prose grades recall of that prose — the memorizer scores it max. Draw the
    dimension's terms from the behavior under test, not from the artifact that describes it.
- **Pairwise consistency** *(all tiers; the suite, not a scenario).* No two scenarios sharing a
  `When` demand opposite verdicts on one constructible snapshot, per `sdd:suite-format-governance`.

## References

- `aced:aced-fit` — the fit classifier this bar loads to make trigger-context / trigger-balance
  conditional.
- `sdd:suite-format-governance` — the miss test, the wrong-subject table, the three anti-patterns,
  and the pairwise-consistency rule this bar specializes.
