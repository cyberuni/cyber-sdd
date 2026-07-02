# lifecycle-governance

Internal SDD governance (`user-invocable: false`). The **lifecycle** contract — the state machine a
`spec.md` moves through: the root frontmatter schema, the `status` enum, the legal status
transitions, open-marker gating, and the per-file freeze state-transition.

A fixed-universal SDD governance, invariant per role (not face-split). Loaded by `sdd`,
`spec-gate`, `start-mission`, the conductor, and the spec-judge. Write-ownership of these fields
lives in `ownership-governance`; legality of field combinations and gate verdicts in
`gate-validation-governance`; the ledger shape in `combat-log-governance`. Not triggered by users
directly.
