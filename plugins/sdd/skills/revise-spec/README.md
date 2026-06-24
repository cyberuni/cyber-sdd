# revise-spec

Internal SDD skill: the **Revise spec** / draft re-open station. Revises an existing `spec.md` and its `.feature` by **grilling** — pressure-testing what is already written for weak, missing, or stale content and tightening it — rather than scaffolding from scratch (that is `create-spec`).

Two phases, in order: grill the **spec** (scope, use cases, design decisions, open markers) to settle the contract's intent, then grill the **features** to bring the boolean layer back into line. A revision is also the moment to catch a monolith and recommend a **split** per the `spec-governance` granularity heuristic.

Run by `sdd-operator` as a station; routed to by the `sdd` gateway for the Revise spec path. Not triggered by users directly.
