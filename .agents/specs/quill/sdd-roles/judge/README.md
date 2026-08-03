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
PASS / FAIL / SKIP per scenario, then the document-scoped integrity pass ([`../doc-impl-bar/`](../doc-impl-bar/))
once per document.
**Non-goals** — authoring the document or its checks (that is `doc-writer`); modifying `spec.md` or the
`.feature`; fixing a gap by editing (a behavior-changing gap is a `BLOCKER`, not an edit).

_The use-case table + the `judge.feature` are authored in per-unit explore._
