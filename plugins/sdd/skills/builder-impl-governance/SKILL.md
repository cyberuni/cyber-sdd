---
name: builder-impl-governance
description: "Partial Skill: invoke by name only"
user-invocable: false
metadata:
  actor: builder
  gate: impl
  compose: union
---

# Builder-Impl Governance — the conformance & verification-level bar

The **Builder** bar at the **impl gate**: does the implementation meet the frozen suite, and is
each scenario verified at a level that earns confidence? Loaded by both faces. The SDD default for the
`builder` impl bar; a plugin may bind its own, and this loads when the registry leaves `builder`/`impl`
unbound.

## The bar

- **The bar is not self-set.** Each check derives from the frozen suite — one per scenario —
  never free-authored from the producer's sense of done. The cold impl-judge re-derives the oracle
  independently (ADR-0016).
- **Verify as high as it doesn't hurt.** Choose each scenario's verification **level** to maximize
  confidence until cost, fragility, or feasibility bites: a cheap base, a **thin e2e cap** on the
  paths that matter, **boundary** (the external mocked) as the honest substitute where e2e is
  infeasible or unsafe. **Record the level and why.** The suite's overall pyramid shape is the
  architect's call (`sdd:architect-impl-governance`).
- **A graded subject still yields a boolean.** Reach the per-scenario boolean through a rubric +
  threshold over N runs; the rubric stays out of the `.feature`.
- **No green-by-tampering.** Passing means the behavior holds, not that a check was edited to pass;
  the frozen suite is never modified to make the implementation conform.
- **Deterministic combinatorics go to units.** Where the domain has a deterministic inner layer, cover
  its combinatorial space (truth tables, matrices) with unit tests drawn from the inner rules — the
  pyramid's base, separate from the one-verification-per-scenario duty. Missing that coverage is its
  own finding and withholds the pass. A non-deterministic subject has no such layer — verify at the
  acceptance level only.

## Key points (read-check)

1. **The bar is not self-set** — checks derive from the frozen suite, one per scenario; the judge
   re-derives the oracle independently.
2. **Verify as high as it doesn't hurt** — cheap base, thin e2e cap, boundary as substitute where e2e
   is infeasible/unsafe; record level and why.
3. **No green-by-tampering** — passing is the behavior holding, never an edited check or a modified
   suite.
4. **Deterministic combinatorics go to units** (the pyramid base); missing that coverage withholds the
   pass; a non-deterministic subject verifies at the acceptance level only.
