---
name: builder-impl-governance
description: "Internal skill: by name only — the Builder actor bar at the impl gate — does the implementation meet the frozen contract. Loaded by the impl-producer and the impl-judge, not user-triggered."
user-invocable: false
metadata:
  actor: builder
  gate: impl
  compose: union
---

# Builder-Impl Governance — the conformance bar

The **Builder** bar at the **impl gate**: does the implementation meet the frozen `.feature`? One
merged bar loaded by **both** faces — the **impl-producer** reads it forward (it builds to the bar)
and the **impl-judge** reads it backward (it verifies). `producer ≠ judge` holds at the agent level.

The SDD default for the `builder` impl bar — a plugin may bind its own per artifact-type (governance resolution); this loads when the registry leaves `builder`/`impl` unbound. Testability and coverage of the contract itself are the spec gate's `builder-spec` bar.

## The bar

- **The bar is not self-set.** The impl-judge's functional checks are **derived from the frozen
  `.feature`** — one check per scenario — never free-authored from the producer's own sense of done.
  The producer does not grade its own understanding.
- **A graded subject still yields a boolean.** For a non-deterministic subject, reach the
  per-scenario boolean through rubric + threshold over N runs (`score ≥ threshold`); the rubric form
  stays out of the `.feature` (`sdd:suite-format-governance`).
- **No green-by-tampering.** Passing a scenario means the behavior holds, not that a check was edited
  to pass. The frozen `.feature` is never modified to make the implementation conform.
