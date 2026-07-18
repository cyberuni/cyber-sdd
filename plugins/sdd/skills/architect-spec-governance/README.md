# architect-spec-governance

Internal SDD governance (`user-invocable: false`). The **Architect** actor bar at the **spec gate** —
structural fit of the **capability**: no knowledge duplication (one home per concept, but
coincidental resemblance is not duplication — two things that change for different reasons stay
separate); no conflict with conventions, module boundaries, or an existing capability's contract;
screaming placement (one capability per node, in a folder named for its intent, never smeared across
nodes); a well-formed logic graph the suite's sections mirror; an orthogonal axis; structural
problems in another capability are deferred (spawn a new spec), not blocking.

It judges the **capability**, read from its spec + suite — not the document's prose, which is
`spec-format-governance`.

One merged bar with an **asymmetric** loadout: the **solution-producer** reads it forward to
self-align the ungated `<unit>.solution.md`; the **cold spec-judge** reads it backward but sees
`spec.md` + the suite only (the solution is out of view). `producer ≠ judge` holds at the agent
level. Structural fit of the implementation is the impl gate's `architect-impl` bar. The SDD default
for the `architect` spec bar; a plugin may bind its own per artifact-type. Not triggered by users
directly.
