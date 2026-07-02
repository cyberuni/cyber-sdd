---
name: builder-spec-governance
description: "Internal skill: the Builder actor bar at the spec gate — testability and coverage of the .feature. Loaded by the spec-producer to self-align and by the cold spec-judge to grade. The SDD default for the builder spec bar; a plugin may bind its own per artifact-type. Not triggered by users directly."
user-invocable: false
metadata:
  actor: builder
  gate: spec
  compose: union
---

# Builder-Spec Governance — the testability & coverage bar

The **Builder** bar at the **spec gate**: is the `.feature` a complete, testable contract? One
merged bar loaded by **both** faces — the **spec-producer** reads it forward (it writes the testable
`.feature`) and the **cold spec-judge** reads it backward (it grades coverage). `producer ≠ judge`
holds at the agent level.

The SDD default for the `builder` spec bar — a plugin may bind its own per artifact-type (governance resolution); this loads when the registry leaves `builder`/`spec` unbound. Conformance — does the *implementation* satisfy the contract — is the impl gate's
`builder-impl` bar.

## The bar

- **Every behavior is testable.** Each scenario asserts an observable outcome a check can confirm —
  boolean, no "sometimes". A behavior that cannot be observed cannot be specced.
- **Coverage is complete.** Every operation has a happy path and its error cases; no command-surface
  entry is unscenarioed.
- **A graded subject is still specced as a boolean.** For a non-deterministic subject, the contract
  reaches a per-scenario boolean through a rubric + threshold over N runs (`score ≥ threshold`); the
  rubric form itself stays out of the boolean `.feature` and is carried as a judge-only `@rubric`
  scenario (`sdd:suite-format-governance`).
