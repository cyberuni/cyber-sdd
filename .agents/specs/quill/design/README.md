# design/ — the Quill doc-eval model

The rules/model: the [doc-eval model](./doc-eval-model.md) — the four scenario-scoped
static-inspection checks (existence, structure, completeness, reader-path) every documentation artifact is
verified against, the document-scoped integrity pass that catches what a scenario's scope cannot, and the
frozen-`.feature` anchor that keeps the impl-judge independent of the impl-producer. Behaviors live in the
capability folders; decisions live in [`decisions/`](./decisions/README.md).
