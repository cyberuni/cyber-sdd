---
name: architect-impl-governance
description: "Partial Skill: invoke by name only"
user-invocable: false
metadata:
  actor: architect
  gate: impl
  compose: union
---

# Architect-Impl Governance — the structural-fit bar (impl gate)

The **Architect** bar at the **impl gate**: does the implementation fit the existing structure, and
is the suite's verification pyramid sound? Loaded by both faces. The SDD default for the `architect`
impl bar; a plugin may bind its own, and this loads when the registry leaves `architect`/`impl`
unbound.

## The bar

- **No duplication, no conflict.** The implementation reuses existing structures; it does not
  contradict conventions, module boundaries, or a spec's contract.
- **Contained complexity.** Watch cyclomatic complexity and coupling; a unit hard to test is usually
  mis-structured — flag it.
- **A sound verification pyramid.** Across the suite the verification levels form a pyramid — a broad
  cheap base under a **thin e2e cap** that keeps the end-to-end path honest. An **all-e2e** suite is
  fragile and slow; a **capless** suite has no honesty check. The per-scenario level is the builder's
  call (`sdd:builder-impl-governance`); this bar judges the shape.
- **An orthogonal axis.** Structural fit judges a property the builder was not optimizing.
- **Structural concerns are deferred.** A structural problem in another domain spawns a new spec.

## Key points (read-check)

1. **No duplication, no conflict; contained complexity.**
2. **A sound verification pyramid** — cheap base, thin e2e cap; neither all-e2e nor capless.
3. **Per-scenario level is the builder's call; this bar judges the shape.**
4. **Structural concerns in another domain are deferred.**
