# oracle-spec-governance

Internal SDD governance (`user-invocable: false`). The **Oracle** actor bar at the **spec gate** —
scope and kill-or-ship: one coherent intent, bounded scope, worth shipping, kill-or-revert, no
premature commitment.

One merged bar loaded by **both** faces — the **spec-producer** (self-align on scope) and the **cold
spec-judge** (grade kill-or-ship); `producer ≠ judge` holds at the agent level. Oracle has no impl
face, so it ships as the single `oracle-spec` bar. The SDD default for the `oracle` bar; a
plugin may bind its own per artifact-type. Not triggered by users directly.
