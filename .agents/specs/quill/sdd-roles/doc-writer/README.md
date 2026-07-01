---
spec-type: behavioral
concept: production-chain
---

# doc-writer — the impl-producer role

Write the documentation against the frozen `.feature` and co-produce its per-scenario acceptance checks
(`quill-doc-writer`).

## Use Cases

**Subject** — when the conductor dispatches it in deliver, writing the actual document so it satisfies every
frozen scenario, **and** recording the per-scenario acceptance checks (paths, headings, no placeholders,
reader-path continuity) the judge will run.
**Non-goals** — running the checks (that is `judge`); modifying `spec.md` or the frozen `.feature`; authoring
the behavior contract (`spec-writer`).

_The use-case table + the `doc-writer.feature` are authored in per-unit explore._
