# architect-spec-governance

This is an internal SDD governance about structural fit at the spec gate.

It is the **Architect** actor's bar — the question it answers is: does this **capability** fit the
project's structure, and is its decision graph well-placed? It judges the capability itself, read
from its spec and test suite — not the wording of the document. How the prose is written is a
different bar (`spec-format-governance`).

This is the SDD default for the `architect` bar at the spec gate: a plugin may bind its own version
per artifact-type, and this one loads whenever the registry leaves `architect`/`spec` unbound. Its
twin at the impl gate is **`architect-impl-governance`** — same actor, same structural-fit question,
asked of the implementation instead of the spec.

## What it requires — the bar

| Requirement | What it means |
| --- | --- |
| **No knowledge duplication** | A capability, concept, rule, or contract has **one home**; whatever needs it references that home. Two copies of one piece of knowledge drift — a change lands in one and misses the other. |
| **…but coincidental resemblance is not duplication** | Two capabilities that look alike yet change for different reasons stay separate — a premature shared abstraction couples them, and the wrong abstraction costs more than the repetition. The test: does a change to one force the same change to the other? Only then converge. |
| **No conflict** | The capability does not contradict established conventions, module boundaries, or an existing capability's contract. |
| **Placement matches the declared layout** | The project declares its layout strategy in its root `spec.md` placement map; placement is judged *within* that declaration, not against a preferred one. Under the screaming-architecture default a capability lives in a folder named for its intent; a project that declared `mirror-source` is correctly placed when it mirrors its source. |
| **…and the layout preserves the partition** | The declaration is not a licence. Layouts are ranked by whether they keep node ↔ capability one-to-one, because the mission scheduler cuts one mission per node and a scattered capability degrades the schedule toward serial (ADR-0025). **One capability per node, never smeared across nodes** holds under every strategy, and a layered / framework-first top level stays discouraged however it is declared. |
| **A well-formed logic graph** | The capability's decision graph connects — every decision reachable, no dangling branch — and the suite's sections mirror it. |
| **An orthogonal axis** | Structural fit judges a property the builder was not optimizing — a real independent check even from the same hand. |
| **Structural concerns are deferred** | A structural problem in *another* capability is an observation that spawns a new spec — never a marker in the one being built. |

## Usage

One merged bar with an **asymmetric loadout** — the two faces read different inputs:

- **solution-producer** (forward): self-aligns the ungated `<unit>.solution.md`, where structure is
  chosen.
- **cold spec-judge** (backward, at the **spec gate**): grades structure from `spec.md` + the suite
  only — the solution is out of view, which keeps the grader independent.

## Related governances

This bar owns the structural fit of the **capability**. Its neighbors own everything around that:

- **`architect-impl-governance`** — the same Architect bar at the **impl gate**: structural fit of
  the implementation, where this bar judges the spec and solution.
- **`spec-format-governance`** — the document's prose: sections, tables, the plain-language bar.
  This bar reads *through* the document at the capability; that one judges the document itself.
- **`spec-structure-governance`** — the layout law itself: the declared placement map this bar
  judges placement against.

Internal SDD governance (`user-invocable: false`). Not triggered by users directly.
