# ownership-governance

Non-user-invocable SDD skill holding the **write-ownership contract**: who may write each `spec.md` frontmatter field and each artifact, the spec-producer write boundary, and the freeze *write-constraint* ("never write a frozen `.feature`").

Loaded via the harness (`Skill`) by every SDD producer and judge (`sdd-scenario-writer`, `sdd-planner`, `sdd-implementer`, and the plugin producers/judges in `aces`/`quill`), by `sdd-operator`, and by the `create-spec` / `validate-spec` skills. It is the most broadly loaded of the lifecycle skills — most producers need only this bundle.

One of three skills the SDD lifecycle/frontmatter contract was split into by Reuse — see [ADR-0014](../../../../artifacts/adr/0014-sdd-governance-split.md) for the analysis and consumer matrix, and [ADR-0013](../../../../artifacts/adr/0013-governance-skills.md) for the governance-skill mechanism. The freeze rule is split by face: the *write-constraint* is here; the *state transition* is in `lifecycle-governance`.
