# plugin-contract-governance

Non-user-invocable SDD skill documenting the **SDD plugin contract**: the five delegate roles a plugin implements (`spec-producer`, `plan-producer`, `spec-judge`, `impl-producer`, `impl-judge`), which governances each role loads, and the `.agents/universal-plugin.json` registry shape the orchestrator resolves against.

Loaded via the harness (`Skill`) by `sdd-orchestrator` (delegate resolution) and consulted by anyone authoring a new SDD plugin (e.g. `aces`, `quill`). It is the SDD-role layer on top of the universal plugin format (`plugin-design`, via `governance show universal-plugin`).

Added alongside the lifecycle/ownership/gate-validation split so there is one place that answers "what does an SDD plugin implement and load" — see [ADR-0014](../../../../artifacts/adr/0014-sdd-governance-split.md) (governance-skill mechanism: [ADR-0013](../../../../artifacts/adr/0013-governance-skills.md)).
