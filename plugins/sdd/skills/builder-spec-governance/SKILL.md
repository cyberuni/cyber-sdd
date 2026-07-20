---
name: builder-spec-governance
description: "Partial Skill: invoke by name only"
user-invocable: false
metadata:
  actor: builder
  gate: spec
  compose: union
---

# Builder-Spec Governance — the testability & coverage bar

The **Builder** bar at the **spec gate**: is this **capability** fully and testably specified? Judges
the capability's contract (read from its spec + suite), not the document's prose — that is
`sdd:spec-format-governance`. Loaded by both faces. The SDD default for the `builder` spec bar; a
plugin may bind its own, and this loads when the registry leaves `builder`/`spec` unbound.

## The bar

- **Every branch of the capability is covered.** Each edge of its control-flow graph (CFG) has its
  scenario, and every guard/negative edge is paired with a positive companion. The **scenario map
  is 1:1** — no orphan scenario, no uncovered edge (`sdd:suite-format-governance`).
- **Every scenario is testable.** Each asserts an observable outcome a check can confirm — a boolean,
  no "sometimes". A behavior the capability cannot expose cannot be specced.
- **A graded subject is still a boolean.** For a non-deterministic capability the contract reaches a
  per-scenario boolean through a rubric + threshold over N runs; the rubric form stays out of the
  boolean `.feature`, carried as a judge-only `@rubric` scenario.

## Key points (read-check)

1. **Every branch of the capability is covered** — every edge has its scenario, guards paired with
   positives, the scenario map 1:1.
2. **Every scenario is testable** — an observable boolean outcome; behavior the capability cannot
   expose cannot be specced.
3. **A graded subject still reaches a per-scenario boolean** via rubric + threshold; the rubric stays
   out of the `.feature`.
