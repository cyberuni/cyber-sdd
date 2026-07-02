# architect-impl-governance

Internal SDD governance (`user-invocable: false`). The **Architect** actor bar at the **impl gate** —
structural fit of the implementation: no duplication, no conflict, contained complexity (cyclomatic /
coupling), an orthogonal axis; structural problems in another domain are deferred (spawn a new spec),
not blocking.

One merged bar loaded by **both** faces — the **impl-producer** (self-align) and the **impl-judge**
(verify); `producer ≠ judge` holds at the agent level. Structural fit of the spec/solution is the
spec gate's `architect-spec` bar. The SDD default for the `architect` impl bar; a plugin may bind its
own per artifact-type. Not triggered by users directly.
