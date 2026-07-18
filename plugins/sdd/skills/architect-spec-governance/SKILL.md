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

The **Architect** bar at the **spec gate**: does the spec fit the existing structure, and is its
decision graph well-placed? The SDD default for the `architect` spec bar; a plugin may bind its own
per artifact-type, and this loads when the registry leaves `architect`/`spec` unbound.

## The bar

- **No duplication.** The contract reuses existing specs, concepts, and structures. A second copy of
  an existing concept is a defect.
- **No conflict.** It does not contradict established conventions, module boundaries, or an existing
  spec's contract.
- **Screaming placement.** The spec sections by **use-case group**, named by intent — never by layer
  or output format. **One capability per node**; a decision graph smeared across nodes is a placement
  defect.
- **A well-formed logic graph.** Each group's drawn graph connects — every decision reachable, no
  dangling branch — and the suite's sections mirror its groups.
- **An orthogonal axis.** Structural fit judges a property the builder was not optimizing — a real
  independent check even from the same hand.
- **Structural concerns are deferred.** A structural problem in another domain is an observation that
  spawns a new spec, never a marker in the spec being built.

## Faces — asymmetric loadout

The two faces read different inputs. **Forward (solution-producer):** self-aligns the ungated
`<unit>.solution.md`, where structure is chosen. **Backward (cold spec-judge):** grades structure
from `spec.md` + the `.feature` only — the solution is out of view (grader independence).

## Key points (read-check)

1. **No duplication, no conflict** with existing specs, concepts, conventions, or boundaries.
2. **Screaming placement** — section by use-case group named by intent; one capability per node; no
   graph smeared across nodes.
3. **A well-formed logic graph** whose groups the suite's sections mirror.
4. **Structural concerns in another domain are deferred** — an observation that spawns a new spec.
