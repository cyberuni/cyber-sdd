# dedupe-specs

SDD Formation-loop station that resolves **overlap** between specs and **contradictions** between artifacts. The structural counterpart to `split-spec`: where `split-spec` decomposes a monolith, `dedupe-specs` merges overlapping behavior into a single home and reconciles contradicting artifacts so no contradiction stands.

It produces a **dedupe-or-reconciliation proposal naming the artifacts**, paired with two human confirmation checkpoints (plan, then result) mirroring `split-spec`'s confirm-plan-and-result discipline — the Council owns where each behavior lives and which claim wins.

Run by the Warden (`sdd-warden`) as the home for the Formation loop's dedupe and reconcile acts. Named as a gap in `artifacts/specs/sdd-formation-loop/spec.md`.
