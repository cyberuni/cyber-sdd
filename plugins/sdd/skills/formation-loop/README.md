# formation-loop

Non-user-invocable SDD skill holding the **outer loop** that keeps the spec **corpus** structurally coherent — the Architect's formation loop run by the Warden (`sdd-warden`). It encodes the four corpus-wide acts (dedupe overlap, split monoliths, keep the graph sound, reconcile contradictions), the load-bearing distinction from the per-spec gate structural verdict, the spec-granularity split trigger, graph soundness via `render-spec-graph`, and the dedupe/reconciliation proposal shape via `dedupe-specs`.

It is the runnable surface parallel to the mission loop: the Operator (`sdd-operator`) runs the middle loop per segment; the Warden runs this outer loop corpus-wide and continuously. The Warden produces a finding set over every spec plus proposals; structural change is ratified by the Council.

Altitude-disciplined to corpus organization alone — it routes build-or-deprecate to the Campaign loop and process lessons to the Doctrine loop, and never runs as the per-spec gate structural check.

Implements `artifacts/specs/sdd-formation-loop/spec.md`.
