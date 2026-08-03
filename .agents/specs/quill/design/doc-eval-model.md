---
model: true
concept: doc-eval
---

# The doc-eval model

Documentation is an implementation artifact with **verifiable structure**. Quill verifies a document
with **two instruments**, split by how a verdict is reached:

| | **Inspection** | **Judgment** |
|---|---|---|
| Decides by | comparing two structured artifacts, or matching a pattern | simulating a reader |
| Verdict | boolean | graded |
| Anchor | the frozen `.feature`, and the enumeration rule in the impl bar | the defect catalog in the impl bar |
| Scope | four checks per scenario; one check per document | per document |

Neither instrument asserts wording, style, or tone. Every scenario a doc `.feature` carries must be
checkable by one of the four scenario-scoped checks below.

## The four scenario-scoped checks

| Check | What it verifies | Fail signal |
|---|---|---|
| **Existence** | the target file or directory exists at the declared project-root-relative path | `BLOCKER: file not found at <path>` |
| **Structure** | required headings / sections named by the scenario are present (case-insensitive) | missing heading |
| **Completeness** | no placeholder text (`TBD`, `TODO`, `FIXME`) and no empty section (heading immediately followed by the next heading or EOF) | placeholder / empty section found |
| **Reader-path** | a sequential flow reaches its stated outcome: every step has visible content, no step references an undeclared external prerequisite, the outcome is described at the end | gap in the flow; unverifiable conditions are `SKIP` |

## The document-scoped check

The four checks above each read only the passage its scenario names. Defect classes that hold
*between* passages survive that scope intact, because each occurrence is well-formed on its own and
it is the **pair** that fails. Exactly one of them is decidable by comparison, and it is the one this
check keeps:

| Defect | Why scenario scope misses it | Fail signal |
|---|---|---|
| **Skipped option** | a routing scenario asserting a destination passes whether or not that destination is the right one, so the suite ratifies the draft's route | the passage enumerating the set, and the routing that omits a member |

This is inspection because both sides are **structured and enumerable**: the document names a set,
and a later passage routes across it. Comparing the two is set difference, not reading.

The remaining inter-passage defects — a term predicated of a subject class that cannot take it, two
passages whose claims cannot both hold, a passage presupposing what the reader cannot retrieve —
read as inspection but are not. Deciding any of them requires reading *as a reader*, so they belong
to the judged instrument below. They were classed as inspection because evidence-with-citation made
them feel mechanical; the citation requirement disciplines a finding, it does not decide one.

## The judged instrument

Craft is **judged, not linted**. Gopen & Swan disclaim rule status for their own principles on two
grounds; one — that a reader weighing many expectations at once cannot apply them as a procedure —
is a claim about a decision procedure's capacity and does not bind a reader-simulating judge. The
other — that any expectation may be violated to good effect — transfers intact, and becomes a
process requirement rather than a reason not to judge.

- **Anchor.** A **defect catalog** in `quill-builder-impl`: named prose defects, each carrying what
  the judge must quote and a **near-miss** that must not fire. The near-miss is what keeps an entry
  from being a style opinion with a rubric attached.
- **It detects bad writing; it does not certify good writing.** Good prose is unbounded and cannot be
  enumerated; bad prose recurs in a small number of nameable shapes. A document with zero findings is
  **not** thereby certified well written.
- **Blind two-pass.** Pass 1 simulates a reader on one declared control-flow path, blind to the
  catalog; pass 2 scores that transcript against it. A judge shown the catalog before reading finds
  what it was told to find, and its finding is an opinion about prose rather than evidence about a
  reader (the asymmetry `aced-case-judge` establishes).
- **Deliberate violation.** The producer may mark a finding as intentional with a rationale the judge
  must weigh. This is the concession Gopen & Swan's surviving argument requires.
- **Advisory until calibrated.** A catalog entry does not block until it has been run against
  documents this repo already accepts and already considers weak, with its false-positive rate
  reported. Once calibrated, it blocks on **confirmed and undefended** only. The asymmetry is
  deliberate: a miss ships a weak paragraph, while a false positive teaches the producer to route
  around the judge.

## Evidence, at both instruments

An inspection failure must quote both locations, and each citation must name **where** it came from
rather than only what it said — a quote can be accurate and misattributed, which reads as verified
precisely because the words check out. The two locations must also be confirmed distinct, since a
relation between passages cannot be evidenced by one passage read twice.

A judged finding carries the same location requirement and is **more** exposed to it, since its
findings are arguments rather than conditions. Tone, register, length, and word choice remain
unassertable at both instruments.

## Recurrence is not a defect

An earlier revision of this model held **restatement** — a claim landed in two passages — as an
integrity defect, on the reasoning that an unquantified suite scores redundancy above concision. It
has no empirical warrant and is retracted.

Haviland & Clark's controlled replication holds the critical noun repeated in *both* conditions while
only one posits an antecedent; the comprehension cost survives at **Δ137 ms, p<.001**, and a
within-condition check finds repetition itself buys nothing (`.research/documentation-craft/`, E03).
The measured cost attaches to a passage whose given information has **no retrievable antecedent** —
not to the claim appearing twice.

Two consequences, and they run opposite to the retracted rule:

- A claim may recur freely. What it may not do is arrive where the reader cannot retrieve it.
- The **bare cross-reference** — a pointer standing where the reader needs the content now — is the
  worse defect, because it *guarantees* the bridging cost the retracted rule's prescribed fix
  (anaphora) was introducing.

The right amount of redundancy is also **audience-relative and reverses**: low-knowledge readers gain
from explicit, redundant text where high-knowledge readers do better with gaps. There is no
audience-independent setting, so the checkable question is **agreement with the spec's declared
audience and prerequisites**, never quantity.

## The independence anchor

The impl-producer (`quill-doc-writer`) authors both the documents **and** their per-scenario acceptance
checks; the impl-judge (`quill-judge`) only **runs** the checks — against the **frozen** `.feature` per
scenario, against the **frozen bar** for the document-scoped pass, and against the **frozen catalog**
for the judged pass. Three anchors, all artifacts the judge did not write, and no fourth: an
impression matching none of them is not a finding.

The judged instrument needs one guarantee the other two get for free. Its anchor is a list of shapes
to look for, so a judge holding it while reading will find them; the blind first pass is what keeps
its findings anchored to a reader rather than to the catalog. Where they collide the
scenario wins, since the suite was ratified at the spec gate and the impl gate does not re-open it. Independence
comes from the frozen anchor plus the separate-runner split — the judge never authors a document, and a
behavior-changing gap is a `BLOCKER`, never a judge edit (`../../sdd/common-governances/ownership/` — the
write-ownership matrix).

## Fit

Quill applies to artifacts whose correctness is **structurally checkable** — a document with a declared path,
required sections, and (for a guide/tutorial) a reader flow. A subject with no inspectable document surface is
outside Quill's lens and recuses to the SDD-default builder.
