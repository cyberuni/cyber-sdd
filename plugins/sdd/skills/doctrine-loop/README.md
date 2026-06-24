# doctrine-loop

Non-user-invocable SDD skill holding the **outer loop** — the Strategist's doctrine loop run by the Scanner (`sdd-scanner`). It encodes the six lifecycle-grained use cases (ship, kill, milestone retro, recurring pattern, drift, token-waste), the detect-and-draft vs keep-or-cut split, where each `strategy` entry lands, and the combat-log-vs-transcript input model.

It is the runnable surface parallel to the mission loop: the Operator (`sdd-orchestrator`) runs the middle loop per segment; the Scanner runs this outer loop at lifecycle granularity. The Scanner is the **sole writer** of `strategy` log entries.

The **shape** of a `strategy` entry is owned by `combat-log-governance` and deferred to, not restated here. The Council holds keep-or-cut; the `sdd` gateway surfaces the count of pending unratified strategy when the Council re-enters.

Implements `artifacts/specs/sdd-doctrine-loop/spec.md`.
