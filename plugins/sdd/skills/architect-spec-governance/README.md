# architect-spec-governance

Internal SDD governance (`user-invocable: false`). The **Architect** actor bar at the **spec gate** —
structural fit: no duplication, no conflict with conventions / module boundaries / an existing spec's
contract; an orthogonal axis; structural problems in another domain are deferred (spawn a new spec),
not blocking.

One merged bar with an **asymmetric** loadout: the **solution-producer** reads it forward to
self-align the ungated `<unit>.solution.md`; the **cold spec-judge** reads it backward but sees
`spec.md` + `.feature` only (the solution is out of view). `producer ≠ judge` holds at the agent
level. Structural fit of the implementation is the impl gate's `architect-impl` bar. The SDD default
for the `architect` spec bar; a plugin may bind its own per artifact-type. Not triggered by users
directly.
