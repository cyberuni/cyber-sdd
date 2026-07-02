---
name: architect-impl-governance
description: "Internal skill: the Architect actor bar at the impl gate — structural fit of the implementation. Loaded by the impl-producer to self-align and by the impl-judge to verify. The SDD default for the architect impl bar; a plugin may bind its own per artifact-type. Not triggered by users directly."
user-invocable: false
metadata:
  actor: architect
  gate: impl
  compose: union
---

# Architect-Impl Governance — the structural-fit bar (impl gate)

The **Architect** bar at the **impl gate**: does the implementation fit the existing structure
without duplication or conflict? One merged bar loaded by **both** faces — the **impl-producer**
reads it forward to self-align and the **impl-judge** reads it backward to verify. `producer ≠
judge` holds at the agent level.

The SDD default for the `architect` impl bar — a plugin may bind its own per artifact-type (governance resolution); this loads when the registry leaves `architect`/`impl` unbound. Structural fit of the spec/solution is the spec gate's `architect-spec` bar.

## The bar

- **No duplication.** The implementation reuses existing structures rather than re-implementing
  them. A second copy of an existing concept is a defect.
- **No conflict.** It does not contradict established conventions, module boundaries, or an existing
  spec's contract.
- **Contained complexity.** Watch cyclomatic complexity and coupling; a unit that is hard to test is
  usually mis-structured — flag it.
- **An orthogonal axis.** Structural fit judges a property the builder was not optimizing, so it
  catches the builder's blind spot even from the same hand — a real independent check, not the
  agent-split hygiene.
- **Structural concerns are deferred, not blocking.** A structural problem in *another* domain is an
  Architect observation that spawns a new spec — never a marker in the spec being built.
