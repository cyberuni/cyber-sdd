---
model: true
concept: doc-eval
---

# The doc-eval model

Documentation is an implementation artifact with **verifiable structure**. Quill verifies a document by
**static inspection** — no runtime execution, no prose-wording or style/tone assertions. It inspects at two
scopes: **four scenario-scoped checks** against the frozen `.feature`, and **one document-scoped check**
against the impl bar. Every scenario a doc `.feature` carries must be checkable by one of the four below.

## The four scenario-scoped checks

| Check | What it verifies | Fail signal |
|---|---|---|
| **Existence** | the target file or directory exists at the declared project-root-relative path | `BLOCKER: file not found at <path>` |
| **Structure** | required headings / sections named by the scenario are present (case-insensitive) | missing heading |
| **Completeness** | no placeholder text (`TBD`, `TODO`, `FIXME`) and no empty section (heading immediately followed by the next heading or EOF) | placeholder / empty section found |
| **Reader-path** | a sequential flow reaches its stated outcome: every step has visible content, no step references an undeclared external prerequisite, the outcome is described at the end | gap in the flow; unverifiable conditions are `SKIP` |

## The document-scoped check

The four checks above each read only the passage its scenario names. Four defect classes are invisible to
every one of them, because each occurrence is well-formed on its own and it is the **pair** that fails:

| Defect | Why scenario scope misses it | Fail signal |
|---|---|---|
| **Restatement** | a claim asserted in two passages satisfies its scenario twice, so the suite scores redundancy higher than concision | the two locations quoted, both landing the same claim |
| **Term drift** | a term applied to a subject that cannot take it still asserts the claim the scenario asked for | the term, plus two uses whose subjects belong to different classes |
| **Skipped option** | a routing scenario asserting a destination passes whether or not that destination is the right one, so the suite ratifies the draft's route | the passage enumerating the set, and the routing that omits a member |
| **Contradiction** | each claim is present as its own scenario requires; only the pair is impossible | both passages, and which claim the rest of the document depends on |

**Integrity** therefore runs **once per document**, and is anchored to the impl bar
(`quill-builder-impl`) rather than to a scenario — the frozen `.feature` cannot hold it, since a relation
between passages is not a property of either one.

It stays inside the no-style boundary by **requiring evidence**: a failure must quote both locations,
and each citation must name **where** it came from rather than only what it said — a quote can be
accurate and misattributed, which reads as verified precisely because the words check out. The two
locations must also be confirmed distinct, since a relation between passages cannot be evidenced by
one passage read twice.
*"This reads redundant"* is a judgment and out of scope; *"these two sentences land the same claim, here
they are"* is an inspection. Tone, register, length, and word choice remain unassertable.

## The independence anchor

The impl-producer (`quill-doc-writer`) authors both the documents **and** their per-scenario acceptance
checks; the impl-judge (`quill-judge`) only **runs** the checks — against the **frozen** `.feature` per
scenario, and against the **frozen bar** for the document-scoped pass. Two anchors, both artifacts the judge
did not write, and no third: an impression matching neither is not a finding. Where they collide the
scenario wins, since the suite was ratified at the spec gate and the impl gate does not re-open it. Independence
comes from the frozen anchor plus the separate-runner split — the judge never authors a document, and a
behavior-changing gap is a `BLOCKER`, never a judge edit (`../../sdd/common-governances/ownership/` — the
write-ownership matrix).

## Fit

Quill applies to artifacts whose correctness is **structurally checkable** — a document with a declared path,
required sections, and (for a guide/tutorial) a reader flow. A subject with no inspectable document surface is
outside Quill's lens and recuses to the SDD-default builder.
