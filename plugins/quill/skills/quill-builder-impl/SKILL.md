---
name: quill-builder-impl
description: "Partial Skill: invoke by name only — the Quill Builder bar at the impl gate — the document-scoped inspection rule and the judged defect catalog a per-scenario check cannot reach. Loaded by the Quill impl-producer to self-align and by the impl-judge to verify. Not triggered by users directly."
user-invocable: false
metadata:
  actor: builder
  gate: impl
  compose: union
---

# Quill Builder-Impl Governance — the document-integrity bar

The **Builder** bar at the **impl gate**, specialized for documentation artifact-types
(`documentation`, `guide`, `tutorial`, `article`, `reference`). It **unions onto**
`sdd:builder-impl-governance` — the generic conformance bar still applies (checks derived from the
frozen `.feature`, no green-by-tampering); this adds the criteria a per-scenario check
**structurally cannot** reach. One merged bar read by **both** faces: `quill-doc-writer` forward
while authoring, `quill-judge` backward while running. `producer ≠ judge` holds at the agent level.

## Why the frozen `.feature` cannot carry these

A doc scenario names a passage and asserts a claim is present in it. Every defect below is a
relation **between** passages: every occurrence is well-formed against its own scenario, and only
the pair fails. A scenario per pair does not scale and would freeze the structure
`quill:quill-builder-spec` forbids freezing. So they are graded against this bar, once per document
(`.agents/specs/quill/design/doc-eval-model.md`).

## Two instruments, split by how a verdict is reached

|  | **Inspection** | **Judgment** |
|---|---|---|
| Decides by | comparing two structured artifacts | simulating a reader |
| Verdict | boolean `BLOCKER` | graded finding |
| Holds | the enumeration rule | the defect catalog |

The split is **not** by which file a criterion lives in — both live here. An earlier revision of this
bar classed every criterion as inspection because requiring evidence-with-citation made them all feel
mechanical. It does not: the citation requirement *disciplines* a finding, it does not *decide* one.
Deciding that a term has changed subject class, or that two claims cannot both hold, means reading as
a reader.

## Inspection — the enumeration rule

**A route reaches every option the document named.** Where the document enumerates a set — its
mechanisms, its arrangements, its kinds — and a later passage routes a case across that set, an
option silently absent is a defect. The dropped option is usually the one introduced *between* the
two the routing keeps, because the routing was drafted from the passage before the set was complete.
Cite the enumeration and the routing that skips it.

This is the one criterion a comparison settles: the set is enumerable, the routing is enumerable, and
the finding is their difference. No reading is required.

## Judgment — the defect catalog

Craft is judged, not linted. The catalog names prose defects; each entry carries what the judge must
quote and a **near-miss** that must *not* fire. The near-miss is what keeps an entry from being a
style opinion with a rubric attached.

**It detects defects; it never certifies quality.** Good prose is unbounded and cannot be enumerated;
bad prose recurs in a small number of nameable shapes. A document with zero findings is **not**
thereby certified well written, and a green judged pass is not an endorsement.

| Defect | Fires on | Near-miss that must not fire |
|---|---|---|
| **Term drift** | a term introduced for one kind of subject predicated of another — a verb of holding is sound of a container (*a file carries a field*) and unsound of an act (*a matching carries the target*) | a second class the document **explicitly extends the term to**, at the point of extension. Consistent term reuse is a virtue in agent-facing prose, and is exactly what produces this defect in reader-facing prose: the term propagates past the class it was coined for, silently |
| **Contradiction** | two passages whose claims cannot both hold — the document establishes *X reaches what Y cannot*, then routes a case away from X on the grounds that only Y is available. The second passage is usually the older one | two claims **scoped to different conditions**, each stating its condition. Contradictory values on *different* targets genuinely coexist; only the same target makes them a conflict |

The catalog is incomplete: seven further entries — unresolvable presupposition, bare cross-reference,
re-presented as new, declaration mismatch, claim without mechanism, orphan claim, and undefined term
at first use — are specified but not yet authored here.

**Claim without mechanism** returns deliberately. It was ruled out of this bar earlier on the grounds
that *no citation settles it*, and routed writer-side. That was the right call for a lint and the
wrong one for a judge.

### How a judged pass runs — blind, then scored

Pass 1 simulates a reader on one declared control-flow path, **blind to this catalog**. Pass 2 scores
that transcript against it. A judge holding the catalog while reading finds what it was told to find,
and its finding is then an opinion about prose rather than evidence about a reader. The asymmetry is
the design, not an optimization (`aced:aced-case-judge` establishes it for agent behavior).

### Deliberate violation

The producer may mark any judged finding as **intentional**, with a rationale the judge must weigh
before reporting. Any expectation about prose can be violated to good effect, so a catalog with no
defense path would be a style guide with a gate attached.

### Advisory until calibrated

A catalog entry does **not** block until it has been run against documents this repo already accepts
and already considers weak, with its false-positive rate reported rather than asserted. An entry that
fires on an accepted document is miscalibrated and stays advisory.

Once calibrated, an entry blocks on **confirmed and undefended** only. The asymmetry is deliberate: a
miss ships a weak paragraph, while a false positive teaches the producer to route around the judge —
and a judge that gets routed around catches nothing at all.

## Evidence — required at both instruments

- **Evidence, or it does not fail.** A failure must quote **both** locations — the enumeration and
  the routing that skips a member, the two uses whose subjects differ in class, or the two
  incompatible claims. An unevidenced finding is not reportable.
- **A citation names where it came from, not only what it said.** Each quote carries its **location**
  — heading, and line number where the artifact has them. A quote alone can be transcribed perfectly
  and attributed to the wrong passage, and the reader of the finding has no way to tell: the words
  are right, so the finding looks verified. Requiring the location is what makes a finding
  *checkable*, and therefore refutable. A judged finding needs this **more** than an inspection does,
  since it argues rather than reports a condition.
- **The two locations must be distinct, and the judge must confirm they are.** Every criterion here
  is a relation between passages, so a finding whose two quotes resolve to the same place has not
  found a pair — it has read one passage twice. Compare the locations before reporting; that check
  is the cheapest way to catch a fabricated relation.
- **The producer runs both instruments before the judge does.** `quill-doc-writer` reads this bar
  forward, over the whole document and with no scenario list in hand — the reading position the
  per-scenario pass cannot occupy. Sentences written to satisfy individual scenarios are written to
  stand alone, so they arrive without the context their neighbors established; this pass is where
  that is caught.

## What this bar does not reach

Out of scope here, and not reportable at either instrument: tone, register, length, word choice, and
section order.

**Recurrence is not a defect.** An earlier revision of this bar required a claim to appear *in
exactly one place*, later passages referring back. It has no empirical warrant and is retracted: the
measured comprehension cost attaches to a passage whose given information has **no retrievable
antecedent**, not to a claim appearing twice (`.research/documentation-craft/`). A claim may recur
freely. Its prescribed fix — replace the second passage with a pointer — is the worse defect, since a
bare cross-reference *guarantees* the bridging cost that recurrence only risked.

## Precedence — a frozen scenario outranks this bar

Where a scenario requires what a criterion here would fail, the **scenario wins and the bar yields**:
the suite was ratified at the spec gate, and a bar that could veto a frozen scenario would make the
impl gate a second spec gate. Report the collision as an architect `OBSERVATIONS` entry so the
scenario is fixed where it lives, in the spec.

## Fail handling

An **inspection** failure is a `BLOCKER` carrying its two citations, returned for the conductor to
re-run `quill-doc-writer`. A **judged** finding is advisory until its entry is calibrated, and
blocks thereafter only when confirmed and undefended. The impl-judge never edits the document to
resolve either (`sdd:ownership-governance`).

## Key points (read-check)

1. **Two instruments, split by how a verdict is reached** — inspection compares two structured
   things; judgment simulates a reader. Both live in this bar.
2. **Inspection holds one criterion** — a route reaches every option the document named. It is the
   only one a comparison settles.
3. **Judgment holds the defect catalog** — currently term drift and contradiction, each with a
   near-miss. It detects defects and never certifies quality.
4. **They are relations between passages**, so no frozen scenario can hold them — the bar does.
5. **A judged pass runs blind, then scores** — a judge holding the catalog while reading finds what
   it was told to find.
6. **Advisory until calibrated**, then blocking on confirmed-and-undefended; the producer may defend
   a finding as a deliberate violation.
7. **Evidence or no finding** — quote both locations, or it is a style opinion and out of scope.
   A citation carries *where*, not just *what*; two quotes resolving to one place are not a pair.
8. **The producer reads it whole and checklist-free**, which is the position that sees the pair.
9. **Tone, length, word choice, and section order are out of scope — and so is recurrence**, which
   is retracted rather than relocated.
10. **A frozen scenario outranks the bar** — on a collision the scenario wins and the finding is an
    architect observation, not a `BLOCKER`.
