# doctrine-loop

Internal, non-user-invocable SDD skill holding the **outer loop** — the Strategist's **doctrine
loop**, run by its delegate the Scanner (`sdd-scanner`) parallel to the conductor's mission loop.
It encodes the **six lifecycle-grained use cases** (ship, kill, milestone retro, recurring
pattern, drift, token-waste), the **detect-and-draft vs keep-or-cut** split, and the
**combat-log-vs-transcript** input model.

The Scanner is the **sole writer** of `strategy` entries; it fires at lifecycle granularity (never
per-gate), reads persisted artifacts post-hoc, and drafts **unratified** strategy to its own shard in
the one project `ledger/` directory. The entry **shape** and the matchable `cause` enum are owned by
`sdd:combat-log-governance` (deferred, never restated). The Council holds keep-or-cut; the `sdd`
gateway surfaces the count of pending unratified strategy when the Council re-enters.

Plan retirement (doctrine's last retro step) is the sibling `sdd:plan-retirement` skill.
