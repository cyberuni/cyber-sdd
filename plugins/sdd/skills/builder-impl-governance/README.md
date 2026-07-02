# builder-impl-governance

Internal SDD governance (`user-invocable: false`). The **Builder** actor bar at the **impl gate** —
conformance: impl-judge checks derived from the frozen `.feature` (one per scenario), graded
subjects reduced to a boolean over N runs, no green-by-tampering.

One merged bar loaded by **both** faces — the **impl-producer** (it builds to the bar) and the
**impl-judge** (it verifies); `producer ≠ judge` holds at the agent level. Testability and coverage
of the contract are the spec gate's `builder-spec` bar. The SDD default for the `builder` impl bar;
a plugin may bind its own per artifact-type. Not triggered by users directly.
