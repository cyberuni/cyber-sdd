---
name: builder-governance
description: "Internal skill: the Builder actor bar — testability and coverage. The SDD default for the builder governance, loaded by the spec-producer and impl-producer to self-align and by the impl-judge to verify. Not triggered by users directly."
metadata:
  user-invocable: false
---

# Builder Governance

The **Builder** bar: is it a complete, testable contract, and does the artifact meet it? The default for the `builder` actor governance — loaded by the spec-producer (it writes the testable `.feature`), the impl-producer (it builds to the bar), and the impl-judge (it verifies). A plugin may bind its own; this loads when `governances.builder` is null.

## The bar

- **Every behavior is testable.** Each scenario asserts an observable outcome a check can confirm — boolean, no "sometimes". A behavior that cannot be observed cannot be specced.
- **Coverage is complete.** Every operation has a happy path and its error cases; no command-surface entry is unscenarioed.
- **The bar is not self-set.** The impl-judge's functional checks are **derived from the frozen `.feature`** — one check per scenario — never free-authored from the builder's own sense of done. The builder does not grade its own understanding.
- **A graded subject still yields a boolean.** For a non-deterministic subject, reach the per-scenario boolean through rubric + threshold over N runs (`score ≥ threshold`); keep the rubric out of the `.feature`.
- **No green-by-tampering.** Passing a scenario means the behavior holds, not that a test was edited to pass.
