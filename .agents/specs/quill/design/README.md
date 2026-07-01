# design/ — the Quill doc-eval model

The rules/model: the [doc-eval model](./doc-eval-model.md) — the four static-inspection checks
(existence, structure, completeness, reader-path) every documentation artifact is verified against, and the
frozen-`.feature` anchor that keeps the impl-judge independent of the impl-producer. Behaviors live in the
capability folders; decisions live in [`decisions/`](./decisions/README.md).
