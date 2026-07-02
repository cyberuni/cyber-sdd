---
name: aced-builder-spec
description: "Internal skill: the ACED Builder bar at the spec gate — the agent-configuration contract criteria (trigger context, near-miss balance, rule coverage, edge coverage, boolean form). Unions onto sdd:builder-spec-governance. Loaded by the ACED spec-producer to self-align and by the spec-judge to grade. Not triggered by users directly."
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
- **Edge coverage** *(all tiers).* At least three edge-case or must-not-do guard scenarios.
- **Boolean form** *(all tiers).* Every `Then` is a boolean assertion; no rubric, threshold, or score
  appears in the `.feature` — that detail belongs to the impl-judge's eval suite (`aced-builder-impl`),
  surfaced only as a judge-only `@rubric` scenario per `sdd:suite-format-governance`.

## References

- `aced:aced-fit` — the fit classifier this bar loads to make trigger-context / trigger-balance
  conditional.
