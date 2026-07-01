---
spec-type: behavioral
concept: production-chain
---

# spec-writer — the spec-producer role

Author `spec.md` + a boolean `.feature` of doc behavior for a documentation artifact (`quill-spec-writer`).

## Use Cases

**Subject** — when the conductor dispatches it in explore, authoring the `spec.md` body and a boolean
`.feature` (document path, audience, observable reader outcome) for one documentation artifact (`documentation`,
`guide`, `tutorial`, `article`, or `reference`).
**Non-goals** — running the checks (that is `judge`); authoring the actual document (`doc-writer`); writing the
control frontmatter (`status`, `project-path`); asserting prose wording, style, or tone.

_The use-case table + the `spec-writer.feature` are authored in per-unit explore._
