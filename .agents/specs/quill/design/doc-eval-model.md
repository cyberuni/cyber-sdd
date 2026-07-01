---
model: true
concept: doc-eval
---

# The doc-eval model

Documentation is an implementation artifact with **verifiable structure**. Quill verifies a document by
**static inspection** against its frozen `.feature` — no runtime execution, no prose-wording or style/tone
assertions. Every scenario a doc `.feature` carries must be checkable by one of the four checks below.

## The four checks

| Check | What it verifies | Fail signal |
|---|---|---|
| **Existence** | the target file or directory exists at the declared project-root-relative path | `BLOCKER: file not found at <path>` |
| **Structure** | required headings / sections named by the scenario are present (case-insensitive) | missing heading |
| **Completeness** | no placeholder text (`TBD`, `TODO`, `FIXME`) and no empty section (heading immediately followed by the next heading or EOF) | placeholder / empty section found |
| **Reader-path** | a sequential flow reaches its stated outcome: every step has visible content, no step references an undeclared external prerequisite, the outcome is described at the end | gap in the flow; unverifiable conditions are `SKIP` |

## The independence anchor

The impl-producer (`quill-doc-writer`) authors both the documents **and** their per-scenario acceptance
checks; the impl-judge (`quill-judge`) only **runs** the checks against the **frozen** `.feature`. Independence
comes from the frozen anchor plus the separate-runner split — the judge never authors a document, and a
behavior-changing gap is a `BLOCKER`, never a judge edit (`../../sdd/design/ownership-governance` — the
write-ownership matrix).

## Fit

Quill applies to artifacts whose correctness is **structurally checkable** — a document with a declared path,
required sections, and (for a guide/tutorial) a reader flow. A subject with no inspectable document surface is
outside Quill's lens and recuses to the SDD-default builder.
