---
spec-type: behavioral
concept: production-chain
---

# judge — the impl-judge role

Run one static-inspection check per frozen `.feature` scenario against the authored docs and report pass/fail
(`quill-judge`).

## Use Cases

**Subject** — when the conductor spawns it cold at the impl gate, running the four scenario-scoped doc-eval
checks (existence, structure, completeness, reader-path) anchored to each **frozen** scenario and reporting
PASS / FAIL / SKIP per scenario, then the document-scoped pass ([`../doc-impl-bar/`](../doc-impl-bar/)) once
per document — its inspection rule as a boolean, and its defect catalog as a graded pass whose reader
simulation runs in a **separate context blind to the catalog**.
**Non-goals** — authoring the document or its checks (that is `doc-writer`); modifying `spec.md` or the
`.feature`; fixing a gap by editing (a behavior-changing gap is a `BLOCKER`, not an edit).

_The use-case table + the `judge.feature` are authored in per-unit explore._
