# gate-validation-governance

Non-user-invocable SDD skill holding the **gate-legality contract**: the legal `(status, aligned, markers, .feature, approval)` tuples, the two gates, `aligned` layer-scoping, and `approval` attribution.

Loaded via the harness (`Skill`) by `validate-spec`, `sdd-orchestrator`, and `sdd-spec-judge` (and the plugin judges in `aces`/`quill`).

The legal-tuple and `approval` rules **reference** `validate-spec/scripts/check-spec-state.mts` as the mechanical authority rather than re-prosing the logic — the prose here is the readable mirror of the script, not a third copy. `aligned` layer-scoping is prose-only (not encoded in the script).

One of three skills the SDD lifecycle/frontmatter contract was split into by Reuse — see [ADR-0014](../../../../artifacts/adr/0014-sdd-governance-split.md) for the analysis and consumer matrix, and [ADR-0013](../../../../artifacts/adr/0013-governance-skills.md) for the governance-skill mechanism.
