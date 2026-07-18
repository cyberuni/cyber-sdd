# architect-impl-governance

Internal SDD governance (`user-invocable: false`). The **Architect** actor bar at the **impl gate** —
structural fit of the implementation: no knowledge duplication (one home per rule, but coincidental
resemblance is not duplication — two units that change for different reasons stay separate); no
conflict with conventions, module boundaries, or a spec's contract; contained complexity (cyclomatic
/ coupling — a unit hard to test is usually mis-structured); a **sound verification pyramid** across
the suite (a broad cheap base under a thin e2e cap — neither all-e2e nor capless; the per-scenario
level is the builder's call, this bar judges the shape); an orthogonal axis; structural problems in
another capability are deferred (spawn a new spec), not blocking.

One merged bar loaded by **both** faces — the **impl-producer** (self-align) and the **impl-judge**
(verify); `producer ≠ judge` holds at the agent level. Structural fit of the spec/solution is the
spec gate's `architect-spec` bar. The SDD default for the `architect` impl bar; a plugin may bind its
own per artifact-type. Not triggered by users directly.
