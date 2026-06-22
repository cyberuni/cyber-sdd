# lifecycle-governance

Non-user-invocable SDD skill holding the **spec lifecycle contract**: the frontmatter schema, the `status` enum, the status transitions (spec gate, impl gate, re-open, deprecate), open-marker gating, and the freeze *state transition* (`approved` freezes the `.feature`).

Loaded via the harness (`Skill`) by `sdd`, `validate-spec`, `create-spec`, `sdd-orchestrator`, and `sdd-spec-judge`.

It is one of three skills the SDD lifecycle/frontmatter contract was split into — `lifecycle-governance` (states), `ownership-governance` (who writes what + the freeze write-constraint), and `gate-validation-governance` (legality + gate verdicts). The split groups the knowledge by Reuse so each consumer loads only the bundle it needs; the full analysis and the consumer matrix are in [ADR-0014](../../../../artifacts/adr/0014-sdd-governance-split.md) (mechanism: [ADR-0013](../../../../artifacts/adr/0013-governance-skills.md)).
