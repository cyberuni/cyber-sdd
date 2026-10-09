---
"cyber-aced": patch
---

Resolve the contradictions a prompt audit found in the shipped skills. Eval results are read from the shared `.agents/aced/results/<target-slug>/` directory everywhere, lowering a per-scenario threshold goes through the spec gate, name-only skills carry exactly `By name only` (the `improve-skill` Q3 check accepts it). `init-aced` registers `architect-impl`, the judge model defaults to the session's current model, the `cyberplace` version is resolved instead of pinned, and issue and ADR references are gone from the skill bodies.
