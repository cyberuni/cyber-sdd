---
name: architect-governance
description: "Internal skill: the Architect actor bar — structural fit. The SDD default for the architect governance, loaded by the plan-producer and impl-producer to self-align and by the gate to judge structure. Not triggered by users directly."
metadata:
  user-invocable: false
---

# Architect Governance

The **Architect** bar: does it fit the existing structure without duplication or conflict? The default for the `architect` actor governance — loaded by the plan-producer and impl-producer (to self-align) and by the gate's Architect-backward face (to judge structural fit). A plugin may bind its own; this loads when `governances.architect` is null.

## The bar

- **No duplication.** The solution reuses existing structures rather than re-implementing them. A second copy of an existing concept is a defect.
- **No conflict.** It does not contradict established conventions, module boundaries, or an existing spec's contract.
- **Contained complexity.** Watch cyclomatic complexity and coupling; a unit that is hard to test is usually mis-structured — flag it.
- **An orthogonal axis.** Structural fit judges a property the builder was not optimizing, so it catches the builder's blind spot even from the same hand — it is a real independent check, not the agent-split hygiene.
- **Structural concerns are deferred, not blocking.** A structural problem in *another* domain is an `architect` OBSERVATION that spawns a new spec — never a marker in the spec being built.
