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

The nine entries are grouped by **what the defect does to a reader**, and each group has its own
citation rule because each fails in a different way. Throughout, *the reader* means a reader on one
**declared control-flow path**, and the spec's audience table, prerequisites, and doc type are the
catalog's **input** — most near-misses are decided by them.

### A. The reader cannot retrieve what the passage assumes

| Defect | Fires on | Near-miss that must not fire |
|---|---|---|
| **Unresolvable presupposition** | a passage treats X as **given** — presupposing it rather than asserting it — when nothing the reader's path traverses before that passage establishes X | a presupposition licensed by a **declared prerequisite**, or by an earlier passage **on that same path**. Content elsewhere in the document licenses nothing if the path does not reach it |
| **Bare cross-reference** | a pointer stands where the reader needs the content **now** — they cannot complete the decision the passage is asking of them without leaving | a pointer to depth genuinely outside the document's scope, carrying a forwarding address. The discriminator is whether the reader can **proceed to the next step of the declared path** without following it — the passage's own local ask is not the test, since a passage may legitimately ask for something the path does not need yet |
| **Undefined term at first use** | a **load-bearing** term — one the reader must evaluate a claim about, not merely read — is relied on before it is glossed, linked, or shown by example **anywhere the declared path reaches at or before the passage that relies on it** | a term the spec's **declared audience** owns. The audience table names a role plus a goal, and the role decides — not the judge's own familiarity. Also: a term the document names in passing and glosses **later on the same path**, where no decision before the gloss depends on it; and a term shown by a **co-located contrasting pair the reader can generalize from** — but an example discharges a term only when the reader can name the term's *class* from it, never when it merely instantiates the term without marking it as one |

**Citation.** Quote the passage, **name the path**, and list what that path traverses before it.
These findings are *negatives* — they claim something is absent — so the absence must be demonstrated
over a named path, never asserted over the document. *"I did not find it"* is not a finding.

**A1 and A2 are duals, and repairing one must not create the other.** The repair for an unresolvable
presupposition is to supply the content; replacing it with a pointer moves the defect rather than
fixing it. That substitution is precisely what the retracted recurrence rule used to prescribe.

### B. The passage misrepresents what the reader already has

| Defect | Fires on | Near-miss that must not fire |
|---|---|---|
| **Re-presented as new** | already-established content returning with **new-information marking** — an indefinite article, an existential (*there is a…*), a defining move — as though first stated | a legitimate **echo**: the same content restated but marked as **given** (definite article, anaphor, *as above*). This entry fires on the **marking**, never on the recurrence — a claim may and should be restated on every path that needs it |
| **Term drift** | a term introduced for one kind of subject predicated of another — a verb of holding is sound of a container (*a file carries a field*) and unsound of an act (*a matching carries the target*) | a second class the document **explicitly extends the term to**, at the point of extension. Consistent term reuse is a virtue in agent-facing prose, and is exactly what produces this defect in reader-facing prose: the term propagates past the class it was coined for, silently |
| **Contradiction** | two passages whose claims cannot both hold — the document establishes *X reaches what Y cannot*, then routes a case away from X on the grounds that only Y is available. The second passage is usually the older one | two claims **scoped to different conditions**, each stating its condition. Contradictory values on *different* targets genuinely coexist; only the same target makes them a conflict |

**Citation.** Quote **both** passages — the one that establishes and the one that misrepresents — and
confirm the two locations differ before reporting.

### C. The document disagrees with its own spec

| Defect | Fires on | Near-miss that must not fire |
|---|---|---|
| **Declaration mismatch** | prose relies on a sibling document the spec declares **not** a prerequisite, or assumes knowledge the audience table does not grant | prose that **restates that sibling's claim in full**. The sibling is referenced but not relied on, so the reader is not sent anywhere. Also: a passage a **coverage row requires**, where that row and the prerequisite line pull in opposite directions — report that as an architect observation against the **spec's** internal tension, never as a defect in the document |
| **Claim without mechanism** | in a document whose declared type is **explanation**, a chain of assertions that never supplies the causal step — the reader is told that X, and that Y follows, but never why | a definition, a table row, a summary recap — or **any passage in a tutorial, how-to, or reference document**. The declared doc type gates this entry entirely |
| **Orphan claim** | a claim the document lands and then never uses: nothing later depends on it, connects to it, or pays it off | a claim that **is** a payoff — the north star, or a claim serving a coverage row the spec requires for its own sake |

**Citation.** Quote the passage **and the spec line it disagrees with** — the prerequisite, the
audience row, the declared doc type, or the coverage row. A group-C finding carrying no spec quote is
a preference, not a defect.

**Claim without mechanism returns deliberately.** It was ruled out of this bar earlier on the grounds
that *no citation settles it*, and routed writer-side. That was the right call for a lint and the
wrong one for a judge — and the doc type is what keeps it from becoming a general complaint about
terseness.

### One finding per passage

Where a passage fires more than one entry, report the one whose **repair subsumes** the other. A
catalog that reports every angle on the same sentence reads as chatty, and a chatty catalog gets
routed around — which costs more than the findings it dropped.

### How a judged pass runs — blind, then scored

Pass 1 simulates a reader on one declared control-flow path, **blind to this catalog**. Pass 2 scores
that transcript against it. A judge holding the catalog while reading finds what it was told to find,
and its finding is then an opinion about prose rather than evidence about a reader. The asymmetry is
the design, not an optimization (`aced:aced-case-judge` establishes it for agent behavior).

**One agent, two contexts.** `quill-judge` runs both instruments and scores pass 2 itself; only the
**reader simulation** is dispatched to a separate context. It has to be — `quill-judge` holds this
catalog, so it can never be its own blind reader. A second *scoring* agent was considered and
rejected: `quill-judge`'s boolean verdicts are anchored to the frozen `.feature` and to a
`verification.md` it did not author, so a graded reading cannot move them. Another agent would add a
hop without adding an anchor.

**Pass 1 receives the document, the declared path, and the audience row — nothing else.** Not this
catalog, not the entry names, not the spec's coverage table, and not the deliberate-violation record
below. Anything naming a defect tells the simulated reader what to trip on.

### Deliberate violation

The producer may mark any judged finding as **intentional**, with a rationale the judge must weigh
before reporting. Any expectation about prose can be violated to good effect, so a catalog with no
defense path would be a style guide with a gate attached.

`quill-doc-writer` records these in the `verification.md` it already writes for the judge, under a
`## Deliberate violations` heading — one row per claim, naming the **catalog entry**, the
**location**, and the **rationale**. That file is already the producer-to-judge channel the judge
runs and never authors, so the defense needs no second artifact.

The judge reads that record **in pass 2 only**. Passing it to the blind reader would name the entry
and the location, which is the leak this design exists to prevent.

A rationale is weighed, not obeyed: a defense that merely asserts the choice was deliberate does not
clear a finding. It has to say what the violation buys the reader it was made for.

### Advisory until calibrated

A catalog entry does **not** block until it has been run against documents this repo already accepts
and already considers weak, with its false-positive rate reported rather than asserted. An entry that
fires on an accepted document is miscalibrated and stays advisory.

Calibration is **per entry**, not per catalog — the entries fail in different ways, and one
well-calibrated entry does not vouch for its neighbor. The state lives here, in this table, so the
judge reads an entry's standing beside the entry itself:

| Entry | State | False-positive rate | Corpus run |
|---|---|---|---|
| A1 unresolvable presupposition | advisory | not measured | run 1 — fired twice on the weak document, never on the accepted one |
| A2 bare cross-reference | advisory | not measured | run 1 — near-missed correctly on the accepted document; one borderline firing exposed an ambiguous discriminator, since reworded |
| A3 undefined term at first use | advisory | not measured | run 1 — **fired twice on the accepted document**; both wordings reworded |
| B1 re-presented as new | advisory | not measured | run 1 — **untested: fired on neither document** |
| B2 term drift | advisory | not measured | run 1 — **untested: fired on neither document**, though the accepted document's own drift defect was repaired before acceptance |
| B3 contradiction | advisory | not measured | run 1 — fired twice on the weak document, near-missed correctly on the accepted one; best discrimination of the nine |
| C1 declaration mismatch | advisory | not measured | run 1 — fired once on the accepted document (precedence-resolved); **uncitable** on the weak document |
| C2 claim without mechanism | advisory | not measured | run 1 — **untested** on the accepted document; **uncitable** on the weak one |
| C3 orphan claim | advisory | not measured | run 1 — **untested** on the accepted document; **uncitable** on the weak one |

`untested` and `uncitable` appear in the Corpus-run column rather than the State column because this
table's State admits only `advisory` and `calibrated`. That gap is already filed as a follow-up
against `.agents/specs/quill/`, and run 1 is its first empirical instance: four entries ran and never
fired, which the prose calls untested and the schema cannot represent.

**Every entry is currently advisory, and the whole catalog is therefore non-blocking.** That is the
designed starting state, not an outage: the entries are reasoned rather than measured, and reasoning
is exactly what calibration exists to check. A row moves to `calibrated` only with a rate and a named
corpus beside it — never on the strength of having been read and found sensible.

#### Run 1 — under-powered, no row moved

A first calibration ran the full blind-then-scored pass over a two-document corpus: known-good
`apps/website/src/content/docs/agent-configuration/instruction-target.md`, known-weak
`apps/website/src/content/docs/governances/skill-repo-structure.md`. **No row moved to `calibrated`,
and the run is recorded as a data point rather than a measurement** — three findings say why, and
each is a property of the corpus, not of the catalog:

1. **Four of nine entries fired on neither document** (B1, B2, C2, C3). By this section's own rule
   they are untested, not clean. B2 is the sharpest case: the known-good document *had* a real
   term-drift defect, repaired before acceptance, so the entry's target existed in this corpus and
   the corpus can no longer see it.
2. **One accepted document yields a count, not a rate.** "A3 fired twice" has no denominator, and
   reporting it as a false-positive rate would be exactly the asserted-rather-than-measured number
   that corrupts this table permanently.
3. **An unspecified weak document disables group C, and not neutrally.** C1's and C3's near-misses
   are the *exculpatory* halves of those entries — full restatement, and the north-star/coverage-row
   rescue. Removing the spec removes only the rescue, so group C measured against an unspecified
   document is systematically biased **toward** firing. Those cells are `uncitable`, which is a
   different result from a miss.

**What the run did earn** — three wordings, fixed above under step 5 rather than left as advice: A3's
fires-on now requires the reliance to be evaluative and admits a same-path deferred gloss; A3's
near-miss admits a co-located contrasting pair while denying a bare instantiation; A2's discriminator
is bound to *the next step of the declared path* rather than the passage's local ask; and C1's
near-miss routes a coverage-row-versus-prerequisite collision to an architect observation against the
spec instead of firing on the document.

**What a real calibration needs:** five or six accepted documents **each with a spec node**, plus two
or three weak ones with specs. A corpus drawn only from specified documents is what keeps group C
citable. Blind-reader dispatches parallelize, so the cost is breadth, not serial time.

#### Running a calibration

Every entry added to this catalog needs this, so it is a procedure rather than a one-off.

1. **Name the corpus** — at least one document the team **already accepts** and one it **already
   considers weak**. The team names them; a judge that picks its own corpus has chosen the evidence
   that suits it.
2. **Run the judged pass unchanged** — blind simulation, then scoring — over every document in the
   corpus. Do not shorten it for calibration; a procedure calibrated in a cheaper mode has measured
   something other than what will run.
3. **Score against expectation, per entry.** On an accepted document every firing is a **false
   positive**. On a weak document a *miss* is informative but not disqualifying — the asymmetry in
   *Advisory until calibrated* holds here too.
4. **Record the rate and the corpus** in the table above. A rate with no named corpus is not a
   measurement.
5. **An entry that fires on an accepted document stays advisory** and its wording is the thing to
   fix — usually its near-miss is too narrow.

**Calibration is not a majority vote across entries.** Nine entries clearing together tells you
nothing about the tenth, and an entry that never fires on either document has not been calibrated —
it has not been tested.

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
3. **Judgment holds the defect catalog** — nine entries in three groups: what the reader cannot
   retrieve, what misrepresents what they already have, and where the document disagrees with its
   spec. Every entry carries a near-miss, and each group its own citation rule. It detects defects
   and never certifies quality.
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
