# gate-validation-governance

Internal SDD governance (`user-invocable: false`). The **gate-legality** contract — what makes a
spec's state legal and how a gate records its verdict: the legal `(status, markers,
.feature, approval)` tuples, the per-node `spec-type` checks, derived sync (no stored flag), approval
attribution, and the no-resolvable-producer fail-closed rule.

A fixed-universal SDD governance, invariant per role. Loaded by spec-gate, the conductor, and the
spec-judge. It carries **no leash** — the self-clear-vs-escalate bar is the conductor's autonomy bar
(baked into `start-mission`). The field schema/transitions are `sdd:lifecycle-governance`;
write-ownership is `sdd:ownership-governance`; the mechanical authority is the `check-spec-state`
script in `spec-gate`. Not triggered by users directly.
