---
name: aced-fit
description: "Internal skill: the ACED fit classifier — strong | partial | wrong-squad, i.e. which of ACED's four eval layers carry real signal for a subject. Loaded by the ACED spec-producer (to classify + declare fit in explore) and the spec-judge (to enforce it at the gate). Not triggered by users directly."
user-invocable: false
metadata:
  type: governance
---

# ACED Fit Governance — does this config benefit from ACED?

Not every agent configuration benefits from ACED. **Fit** is ACED's self-assessment of a subject,
**decided early** — in explore by `aced-scenario-writer`, before any scenario is authored — and only
**enforced** at the gate by `aced-spec-validator` (which reads the declared tier, never re-decides
it). Fit is a **judgment**, so it lives here as a governance, not a `.mts` engine.

## The diagnostic

**FIT = which of ACED's four eval layers carry real signal for this subject.** The layers:
**Structural** (fields/format — already covered by `improve-skill`'s `validate.mts` engine), **Trigger** (fires at the
right times), **Behavior** (follows the steps/rules when invoked), **Quality** (output is good). A
subject with signal **only** at Structural is not an ACED subject.

## The three tiers

| Tier | The subject… | Layers with signal | ACED applies |
|---|---|---|---|
| **strong** | makes a genuine **activation decision** (fuzzy/confusable trigger) **and** has non-deterministic judgment branches | all four | the **full bar** — trigger-context **and** trigger-balance (near-misses) **required** |
| **partial** | is a real config but **mechanically executes** a predetermined path — no activation choice, behavior still LLM-run/graded | Structural + Behavior (+ Quality) | rule-coverage + edge-coverage + boolean-form; **trigger-balance / near-miss is N/A** (absence is **not** a failure); trigger-context only on scenarios that assert firing |
| **wrong-squad** | is a **deterministic** script / engine whose output is **assertable, not graded** | Structural only | **recuse** — author **no `.feature`**; the conductor falls back to the SDD-default builder + a script / `node:test` harness (the `sdd:` recuse→fallback seam) |

The `partial ↔ wrong-squad` boundary is **graded-vs-assertable output** (does judging it need an LLM,
or does a `node:test` assert it), not merely "has a trigger."

## How each role uses it

- **`aced-scenario-writer` (producer, explore) — decides.** Classify fit **first**; declare it as a
  `**Fit:** strong | partial` line in the subject `spec.md` `## Use Cases`. Then author to the tier:
  `strong` → author should-trigger + same-keyword near-miss; `partial` → author behavior/edge/rule,
  **no fabricated near-miss**; `wrong-squad` → **recuse**, produce nothing, recommend the SDD default.
- **`aced-spec-validator` (judge, gate) — enforces.** Read the declared tier; apply trigger-context /
  trigger-balance **only where the tier carries signal**; a **missing** `**Fit:**` declaration is a
  `CONTENT_GAP` (never default to `strong`); a subject determined wrong-squad is **recused**, not
  graded.

## References

- `design/fit.md` (`.agents/specs/aced/design/fit.md`) — the normative model + ADR 0001.
- `aced:aced-builder-spec` — the spec bar whose trigger-context / trigger-balance criteria this
  governance makes conditional.
- `aced:aced-builder-impl` — the impl bar (which eval layers get evals follows the tier).
