---
name: architect-spec-governance
description: "Partial Skill: invoke by name only"
user-invocable: false
metadata:
  actor: architect
  gate: spec
  compose: union
---

# Architect-Spec Governance — the structural-fit bar (spec gate)

The **Architect** bar at the **spec gate**: does this **capability** fit the project's structure, and
is its decision graph well-placed? Judges the capability (read from its spec + suite), not the
document's prose — that is `sdd:spec-format-governance`. The SDD default for the `architect` spec bar;
a plugin may bind its own per artifact-type, and this loads when the registry leaves `architect`/`spec`
unbound.

## The bar

- **No knowledge duplication.** A capability, concept, rule, or contract has **one home**; whatever
  needs it references that home. Two copies of one piece of knowledge drift — a change lands in one
  and misses the other. But **coincidental resemblance is not duplication**: two capabilities that
  look alike yet change for different reasons stay separate — a premature shared abstraction couples
  them, and the wrong abstraction costs more than the repetition. Test: does a change to one force the
  same change to the other? Only then converge.
- **No conflict.** The capability does not contradict established conventions, module boundaries, or
  an existing capability's contract.
- **Placement matches the declared layout — and the layout preserves the partition.** Judge
  *placement within* the strategy the project **declared** in its root `spec.md` placement map
  (`sdd:spec-structure-governance`): under the screaming-architecture default a capability lives in a
  folder named for its intent, while a project that declared `mirror-source` is correctly placed when
  it mirrors its source. But the declaration is **not** a licence — layouts are ranked by whether
  they keep **node <-> capability 1:1**, because the mission scheduler cuts one mission per node and a
  scattered capability degrades the schedule toward serial (ADR-0025). **One capability per node,
  never smeared across nodes**, holds under every strategy, and a layered / framework-first *top*
  level stays discouraged however it is declared.
- **A well-formed logic graph.** Its decision graph connects — every decision reachable, no dangling
  branch — and the suite's sections mirror it.
- **An orthogonal axis.** Structural fit judges a property the builder was not optimizing — a real
  independent check even from the same hand.
- **Structural concerns are deferred.** A structural problem in another capability is an observation
  that spawns a new spec, never a marker in the one being built.

## Faces — asymmetric loadout

The two faces read different inputs. **Forward (solution-producer):** self-aligns the ungated
`<unit>.solution.md`, where structure is chosen. **Backward (cold spec-judge):** grades structure
from `spec.md` + the suite only — the solution is out of view (grader independence).

## Key points (read-check)

1. **No knowledge duplication** — one home per concept; but coincidental resemblance is not
   duplication (don't merge things that change for different reasons). No conflict with conventions or
   boundaries.
2. **Placement matches the *declared* layout** (`sdd:spec-structure-governance`), not a preferred
   one; one capability per node either way, never smeared across nodes.
3. **A well-formed logic graph** the suite's sections mirror.
4. **Structural concerns in another capability are deferred** — an observation that spawns a new spec.
