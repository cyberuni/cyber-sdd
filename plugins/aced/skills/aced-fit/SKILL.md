---
name: aced-fit
description: "Partial Skill: invoke by name only — the ACED fit classifier — which of ACED's eval layers carry real signal for a subject. Loaded by the ACED spec-producer and the spec-judge. Not triggered by users directly."
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

## The measured axis — a second, orthogonal question

The tier says which **simulated** layers carry signal. A separate axis says whether the **measured**
layer (real headless runs graded by a shell `check`, `eval-run/bench/`) is worth paying for:
**`measured: worth | not-worth`**. Never derive one axis from the other — a `strong` skill whose
change only rewords its trigger is `not-worth`; a `partial` procedure driving multi-step work can be
`worth`.

`worth` only when **all four** hold:

1. **Work, not words** — the change moves how real work turns out (pass rate, turns, tokens); a
   trigger-only or wording-only change is `not-worth`.
2. **Shell-checkable** — a deterministic `check` decides pass/fail; rubric-only outcomes stay
   simulated.
3. **A decision hinges on the delta** — merge/revert, calibrate a weight, gate a release.
4. **Detectable at a run count someone will approve.** Under 4 runs per arm no single task's
   test can reach p < 0.05; real effects usually need about 10. If the question needs more runs than anyone will
   approve, it is `not-worth`. The plan's "too few to call" warning reports on this criterion; it does
   not satisfy it.

**Dollars never decide a result** — cost is recorded and compared, never a gate input; willingness
to pay bounds only criterion 4.

**Declared** in the subject's `eval.md` under `bench:` (beside `eval:`): `measured`, plus `suite` and
a one-line `why` when `worth`. **Absent `bench:` = `not-worth`** — the axis is opt-in, so its absence
is **not** a `CONTENT_GAP` (unlike the tier's).

- **`aced-scenario-writer` — decides**, in explore, after the tier: declare `bench:` when the
  subject is `worth`; an explicit `measured: not-worth` with a `why` is legal to record a considered
  no, and needs no `suite`; never put the task set in `eval.md`.
- **`aced-spec-validator` — enforces**: a `bench:` declaring `worth` with no `suite` or no `why` is a
  `CONTENT_GAP`; it reads `worth`, never re-decides it.
- **The `bench` skill — re-asks** criteria 1–2 for the change in hand before any plan; the engine's
  plan checks criterion 4's floor. A `worth` subject can still meet a change that is not.

## References

- `design/fit.md` (`.agents/specs/aced/design/fit.md`) — the normative model + ADR 0001 (tier) and
  ADR 0003 (measured axis).
- `aced:aced-builder-spec` — the spec bar whose trigger-context / trigger-balance criteria this
  governance makes conditional.
- `aced:aced-builder-impl` — the impl bar (which eval layers get evals follows the tier).
