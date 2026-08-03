# design/ — the Quill doc-eval model

The rules/model: the [doc-eval model](./doc-eval-model.md) — the **two instruments** a document is verified
by, split by how a verdict is reached. **Inspection**: the four scenario-scoped static checks (existence,
structure, completeness, reader-path) plus the one document-scoped enumeration rule a comparison settles.
**Judgment**: the defect catalog, run by simulating a reader on a declared path. Plus the frozen anchors —
`.feature`, bar, and catalog — that keep the impl-judge independent of the impl-producer. Behaviors live in the
capability folders; decisions live in [`decisions/`](./decisions/README.md).
