# architect-impl-governance

This is an internal SDD governance about structural fit at the impl gate.

It is the **Architect** actor's bar — the question it answers is: does the implementation fit the
existing structure, and is the suite's verification pyramid sound? Where its spec-gate twin judges
how a capability sits in the project, this bar judges how the code that realizes it sits in the
codebase.

This is the SDD default for the `architect` bar at the impl gate: a plugin may bind its own version,
and this one loads whenever the registry leaves `architect`/`impl` unbound. Its twin at the spec
gate is **`architect-spec-governance`** — same actor, same structural-fit question, asked of the
spec and solution instead of the implementation.

## What it requires — the bar

| Requirement | What it means |
| --- | --- |
| **No knowledge duplication** | A rule, contract, or piece of logic has **one home** in the implementation; whatever needs it calls that home. Two copies of one piece of knowledge drift — a change lands in one and misses the other. |
| **…but coincidental resemblance is not duplication** | Two units that look alike yet change for different reasons stay separate — a premature shared abstraction couples them, and the wrong abstraction costs more than the repetition. The test: does a change to one force the same change to the other? Only then converge. |
| **No conflict** | The implementation does not contradict conventions, module boundaries, or a spec's contract — including the project's **declared** layout, judged as declared (`spec-structure-governance`). The declaration is not a licence: node ↔ capability stays one-to-one under every strategy, because the scheduler cuts one mission per node (ADR-0025). |
| **Contained complexity** | Watch cyclomatic complexity and coupling; a unit that is hard to test is usually mis-structured — flag it. |
| **A sound verification pyramid** | Across the suite, the verification levels form a pyramid — a broad cheap base under a **thin e2e cap** that keeps the end-to-end path honest. An **all-e2e** suite is fragile and slow; a **capless** suite has no honesty check. The level of any *one* scenario is the builder's call (`builder-impl-governance`); this bar judges the overall shape. |
| **An orthogonal axis** | Structural fit judges a property the builder was not optimizing. |
| **Structural concerns are deferred** | A structural problem in *another* capability spawns a new spec — it does not block this one. |

## Usage

One merged bar loaded by **both faces** at the **impl gate**:

- **impl-producer:** reads it forward to self-align while building.
- **impl-judge:** reads it backward to verify.

## Related governances

This bar owns the structural fit of the **implementation**. Its neighbors own everything around
that:

- **`architect-spec-governance`** — the same Architect bar at the **spec gate**: structural fit of
  the capability as specified, where this bar judges the code that realizes it.
- **`builder-impl-governance`** — the per-scenario verification level is the builder's call under
  that bar; this bar judges only the pyramid's overall shape.
- **`spec-structure-governance`** — the declared layout law the no-conflict requirement judges
  against.

Internal SDD governance (`user-invocable: false`). Not triggered by users directly.
