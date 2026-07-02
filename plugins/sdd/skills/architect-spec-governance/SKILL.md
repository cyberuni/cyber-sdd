---
name: architect-spec-governance
description: "Internal skill: the Architect actor bar at the spec gate — structural fit of the spec and solution. Loaded by the solution-producer to self-align (forward) and by the cold spec-judge to grade (backward, from spec + .feature only). The SDD default for the architect spec bar; a plugin may bind its own per artifact-type. Not triggered by users directly."
user-invocable: false
metadata:
  actor: architect
  gate: spec
  compose: union
---

# Architect-Spec Governance — the structural-fit bar (spec gate)

The **Architect** bar at the **spec gate**: does the spec fit the existing structure without
duplication or conflict? One merged bar with an **asymmetric** loadout (see the footer). `producer ≠
judge` holds at the agent level.

The SDD default for the `architect` spec bar — a plugin may bind its own per artifact-type (governance resolution); this loads when the registry leaves `architect`/`spec` unbound. Structural fit of the *implementation* is the impl gate's `architect-impl` bar.

## The bar

- **No duplication.** The contract reuses existing specs, concepts, and structures rather than
  re-declaring them. A second copy of an existing concept is a defect.
- **No conflict.** It does not contradict established conventions, module boundaries, or an existing
  spec's contract.
- **An orthogonal axis.** Structural fit judges a property the builder was not optimizing, so it
  catches the builder's blind spot even from the same hand — a real independent check, not the
  agent-split hygiene.
- **Structural concerns are deferred, not blocking.** A structural problem in *another* domain is an
  Architect observation that spawns a new spec — never a marker in the spec being built.

## Faces — asymmetric loadout

The two faces read different inputs, so they load the bar from different positions:

- **Forward (solution-producer).** The solution-producer reads this bar to self-align the **ungated
  `<unit>.solution.md`** — the design fork where structure is actually chosen. "Ungated" describes
  the solution *artifact*; the structural criteria above still bind it.
- **Backward (cold spec-judge).** The cold spec-judge grades structure from **`spec.md` + the
  `.feature` only** — the solution is out of its view (grader independence). It judges the same
  criteria from the contract surface, flagging duplication/conflict visible in the spec itself.
