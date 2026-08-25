---
title: Quill Builder Bar — Impl Gate
description: The document-scoped enumeration rule and the nine-entry judged defect catalog Quill grades a finished document against — each criterion with what fires it, what must not, what it must cite, and whether it blocks.
---

This page is the public surface of Quill's **impl-gate Builder bar**. It is consulted one criterion at a time: look up the rule or the catalog entry in front of you, and leave with what fires it, what must not, what a report of it must cite, and whether it stops the gate.

## What this bar is

This is the **Builder** actor's bar at the **impl gate** — the gate that grades a finished document against its frozen `.feature`.

- **It runs once per document**, not once per scenario. The per-scenario checks run against the frozen `.feature`; this bar runs once over the whole document.
- **It unions onto SDD's generic conformance bar** rather than replacing it. The generic requirements — checks derived from the frozen `.feature`, no green-by-tampering — still apply in full.
- **Every criterion in it is a relation between two passages.** Each occurrence is well-formed when read on its own, and only the *pair* fails, which is why a per-scenario check cannot carry any of them.

## What the bar carries

The bar carries two instruments: **one enumeration rule**, and a **judged catalog of nine entries**.

Why the two instruments split the way they do is argued at [the doc-eval model](/quill/doc-eval-model/). This page carries what each instrument *is* and how it is run.

## The enumeration rule

**A route must reach every option the document itself named.** Where the document enumerates a set — its mechanisms, its arrangements, its kinds — and a later passage routes a case across that set, an option absent from the routing fires this rule.

An option absent from the routing is a **defect, not a simplification**. The dropped member is usually the one introduced *between* the two the routing keeps, because the routing was drafted from an earlier version of the passage, before the set was complete.

**Citation.** A report of this rule must quote **the passage that enumerates the set** and **the routing that skips a member**. Both, with their locations.

**Verdict: blocker.** A failure of the enumeration rule blocks the gate. It is not an advisory finding — this is inspection, settled by comparing two enumerable things, so it does not wait on calibration the way every catalog entry does.

## The defect catalog

The catalog names prose defects. It has **nine entries** in **three groups**, and the groups are named by **what the defect does to a reader**:

| Group | What the defect does to a reader |
|---|---|
| **A** | the reader **cannot retrieve** what the passage assumes |
| **B** | the passage **misrepresents what the reader already has** |
| **C** | the document **disagrees with its own spec** |

Each entry states the case that must **not** fire it — its **near-miss**. An entry without a near-miss is a style opinion with a rubric attached.

**It detects defects; it never certifies quality.** Good prose is unbounded and cannot be enumerated; bad prose recurs in a small number of nameable shapes. A document with **zero findings is not thereby endorsed** — a clean judged pass says no listed defect was found, and nothing more.

### Group A — what the reader cannot retrieve

Throughout this group, **the reader** means a reader on **one declared control-flow path**. Content elsewhere in the document licenses nothing if the path does not reach it.

**Citation this group owes.** These findings are *negatives* — they claim something is **absent** — so the absence must be demonstrated **over a named path**: quote the passage, **name the path**, and **list what that path traverses before it**. *"I did not find it"* is not a finding.

#### A1 — Unresolvable presupposition

- **Fires on:** a passage treating X as **given** — presupposing it rather than asserting it — when nothing the reader's path traverses before that passage establishes X.
- **Near-miss that must not fire:** a presupposition licensed by a **declared prerequisite**, or by an earlier passage **on that same path**.
- **Citation:** quote the passage, name the path, and list what that path traverses before it — the group A rule for a negative finding.
- **Standing:** advisory, not measured. Reported; does not block.

The repair is to **supply the content**. Replacing the presupposition with a pointer moves the defect into A2 rather than fixing it.

#### A2 — Bare cross-reference

- **Fires on:** a pointer standing where the reader needs the content **now** — they cannot complete the decision the passage asks of them without leaving the document.
- **Near-miss that must not fire:** a pointer to depth genuinely outside the document's scope, carrying a forwarding address. The discriminator is whether the reader can **proceed without following it**.
- **Citation:** quote the passage, name the path, and list what that path traverses before it — the group A rule for a negative finding.
- **Standing:** advisory, not measured. Reported; does not block.

#### A3 — Undefined term at first use

- **Fires on:** a load-bearing term relied on before it is glossed, linked, or shown by example.
- **Near-miss that must not fire:** a term the spec's **declared audience** owns. The audience table names a role plus a goal, and the role decides — not the judge's own familiarity.
- **Citation:** quote the passage, name the path, and list what that path traverses before it — the group A rule for a negative finding.
- **Standing:** advisory, not measured. Reported; does not block.

### Group B — what misrepresents what the reader already has

**Citation this group owes.** Quote **both** passages — the one that establishes the content and the one that misrepresents it — and confirm the two **locations differ** before reporting.

#### B1 — Re-presented as new

- **Fires on:** already-established content returning with **new-information marking** — an indefinite article, an existential (*there is a…*), a defining move — as though it were being stated for the first time.
- **Near-miss that must not fire:** a legitimate **echo** — the same content restated but **marked as given** (a definite article, an anaphor, *as above*). Content restated and marked as already given does not fire this entry.
- **What this entry does not fire on:** the recurrence itself. This entry fires on the **marking**, never on the fact that a claim appears twice; a claim may and should be restated on every reader path that needs it.
- **Citation:** quote **both** passages and confirm the two locations differ — the group B rule.
- **Standing:** advisory, not measured. Reported; does not block.

#### B2 — Term drift

- **Fires on:** a term introduced for one kind of subject predicated of another — a verb of holding is sound of a container (*a file carries a field*) and unsound of an act (*a matching carries the target*).
- **Near-miss that must not fire:** a second subject class the document **explicitly extends the term to**, at the point of extension.
- **Citation:** quote **both** uses and confirm the two locations differ — the group B rule.
- **Standing:** advisory, not measured. Reported; does not block.

Consistent term reuse is a virtue in agent-facing prose and is exactly what produces this defect in reader-facing prose: the term propagates past the subject class it was coined for, silently.

#### B3 — Contradiction

- **Fires on:** two passages whose claims cannot both hold — the document establishes *X reaches what Y cannot*, then routes a case away from X on the grounds that only Y is available. The second passage is usually the older one.
- **Near-miss that must not fire:** two claims **scoped to different conditions**, each stating its condition. Contradictory values on *different* targets genuinely coexist; only the same target makes them a conflict.
- **Citation:** quote **both** passages and confirm the two locations differ — the group B rule.
- **Standing:** advisory, not measured. Reported; does not block.

### Group C — where the document disagrees with its own spec

**Citation this group owes.** Quote the passage **and the spec line it disagrees with** — the prerequisite, the audience row, the declared doc type, or the coverage row. A group C finding carrying no spec quote is a preference, not a defect.

#### C1 — Declaration mismatch

- **Fires on:** prose relying on a sibling document the spec declares **not** a prerequisite, or assuming knowledge the audience table does not grant.
- **Near-miss that must not fire:** prose that **restates that sibling's claim in full**. The sibling is referenced but not relied on, so the reader is not sent anywhere.
- **Citation:** quote the passage **and the spec line** — the prerequisite or audience row — that it disagrees with; the group C rule.
- **Standing:** advisory, not measured. Reported; does not block.

#### C2 — Claim without mechanism

- **Fires on:** a chain of assertions that never supplies the causal step — the reader is told that X, and that Y follows, but never why — **in a document whose declared doc type is `explanation`**.
- **Gated by the declared doc type:** this entry fires **only** where the declared type is explanation. Any passage in a tutorial, how-to, or reference document is outside it entirely.
- **Near-miss that must not fire:** a definition, a table row, or a summary recap — and **any** passage in a tutorial, how-to, or reference document.
- **Citation:** quote the passage **and the spec line** — here, the declared doc type — that it disagrees with; the group C rule.
- **Standing:** advisory, not measured. Reported; does not block.

#### C3 — Orphan claim

- **Fires on:** a claim the document lands and then never uses — nothing later depends on it, connects to it, or pays it off.
- **Near-miss that must not fire:** a claim that **is** a payoff — the north star, or a claim serving a coverage row the spec requires for its own sake.
- **Citation:** quote the passage **and the spec line** — the coverage row or north star — that it disagrees with; the group C rule.
- **Standing:** advisory, not measured. Reported; does not block.

### One finding per passage

Where a **single passage fires more than one entry**, report **one finding** for that passage.

**Repair subsumption selects which one:** report the entry whose repair subsumes the other's. A catalog that reports every angle on the same sentence reads as chatty, and a chatty catalog gets routed around — which costs more than the findings it dropped.

## Recurrence is retracted

An earlier revision of this bar held a claim landed in **two passages** to be a defect. That rule is **retracted** — retracted, not moved to another instrument, and not softened into a judged entry. No criterion on this bar fires on recurrence.

**A claim may recur freely.** It may arrive on every reader path that needs it; what it may not do is arrive where the reader cannot retrieve it.

The retracted rule's prescribed fix — **replacing the second passage with a pointer** — is the **worse defect**. A bare cross-reference guarantees the bridging cost that recurrence only risked, which is why that substitution is itself catalogued, as [A2](#a2--bare-cross-reference).

The entry that survived the retraction is [B1, *re-presented as new*](#b1--re-presented-as-new), and it fires on **new-information marking** rather than on the restatement.

## Evidence — required at both instruments

**A citation names where it came from, not only what it said.** Each quote carries its **location** — heading, and line number where the artifact has them. A quote can be transcribed perfectly and attributed to the wrong passage, and the reader of the finding has no way to tell, because the words check out.

**Two quotes resolving to the same location are one passage read twice.** Every criterion here is a relation between passages, so a finding whose two quotes land in the same place has not found a pair. **Such a finding is not reportable.** The judge compares the two locations and confirms they differ before reporting.

## Standing — what blocks, and what does not

An entry's **standing** is whether a finding from it stops the gate. Standing is a property of the individual entry, and it changes only by calibration.

### Advisory until calibrated

A catalog entry **does not block** until it has been run against documents **this repo already accepts** and documents it **already considers weak**, with the entry's **false-positive rate reported rather than asserted**.

Once calibrated, an entry blocks on a finding that is **confirmed and undefended** — only. A finding the producer defended with a rationale the judge weighed and accepted does not block, and neither does an unconfirmed one.

Why the asymmetry runs that way is argued at [the doc-eval model](/quill/doc-eval-model/).

### Standing today

Each entry's standing is readable **beside that entry** above, and here as one table:

| Entry | State | False-positive rate | Corpus run |
|---|---|---|---|
| A1 unresolvable presupposition | advisory | not measured | — |
| A2 bare cross-reference | advisory | not measured | — |
| A3 undefined term at first use | advisory | not measured | — |
| B1 re-presented as new | advisory | not measured | — |
| B2 term drift | advisory | not measured | — |
| B3 contradiction | advisory | not measured | — |
| C1 declaration mismatch | advisory | not measured | — |
| C2 claim without mechanism | advisory | not measured | — |
| C3 orphan claim | advisory | not measured | — |

**All nine entries are advisory, so the whole catalog is non-blocking today.** That is the **designed starting state, not an outage**: the entries are reasoned rather than measured, and reasoning is exactly what calibration exists to check.

The enumeration rule is not in this table. It is inspection, and it blocks.

## Running a judged pass — blind, then scored

The judged pass runs in two passes, in order.

**Pass 1 — the blind reading.** It simulates a reader on **one declared control-flow path**. It receives exactly three things:

1. the **document**,
2. that **declared control-flow path**, and
3. the **audience row** for that path.

Nothing else. Not the catalog, not the entry names, not the spec's coverage table, and not the deliberate-violation record.

**Pass 1 is blind to the catalog.** Why the first pass must be blind is argued at [the doc-eval model](/quill/doc-eval-model/).

**Pass 2 — the scoring.** It scores **pass 1's transcript** against the catalog, and it is the pass that reads the deliberate-violation record.

### Declaring a deliberate violation

Any expectation about prose can be violated to good effect, so the producer may mark a judged finding **intentional** and have the judge weigh it.

- **The channel** is the `verification.md` the producer **already writes for the judge** — the producer-to-judge file the judge runs and never authors. The declaration goes under a `## Deliberate violations` heading, one row per claim. No second artifact is created for it.
- **The three fields** are the **catalog entry**, the **location**, and the **rationale**.
- **When the judge reads it:** in the **scoring pass only**. Passing it to the blind reader would name the entry and the location, which is the leak the two-pass split exists to prevent.
- **A rationale is weighed, not obeyed.** A rationale asserting only that the choice was deliberate **clears nothing**; it has to say what the violation buys the reader it was made for.

## Calibrating an entry

Moving one entry from advisory to blocking is a procedure. It runs in five ordered steps.

1. **Name the corpus.** At least one document the repo **already accepts** and one it **already considers weak**. **The team names them** — a judge that picks its own corpus has chosen the evidence that suits it.
2. **Run the judged pass unchanged** — blind simulation, then scoring — over every document in the corpus. Do not shorten it for the calibration; a procedure calibrated in a cheaper mode has measured something other than what will run.
3. **Score against expectation, per entry** — see below.
4. **Record the false-positive rate and the named corpus together**, in the standing table. A rate recorded **without a named corpus is not a measurement**.
5. **An entry that fired on an already-accepted document stays advisory**, and the repair is to **widen that entry's near-miss**.

### Scoring a run

- On a document the repo **already accepts**, **every firing counts as a false positive**.
- On a document the repo **already considers weak**, a **miss does not disqualify** the entry — it is informative, not fatal.
- An entry that **fires on an already-accepted document stays advisory**. The repair is to **widen its near-miss**, which is usually too narrow.

### Calibration is per entry

Calibration is **per entry**, never a majority vote across the catalog.

- **Entries clearing together tells you nothing about another entry.** The entries fail in different ways, and one well-calibrated entry does not vouch for its neighbor.
- **An entry that fired on neither corpus document is untested, not calibrated.** No firing is no evidence, and a row moves out of `advisory` only with a rate and a named corpus beside it.

## What neither instrument may assert

**Tone, register, length, word choice, and section order are out of scope.** They are not reportable, and the exclusion holds at **both** instruments — the enumeration rule and the catalog alike.

**Evidence is what draws that line.** A criterion that can be evidenced — two quoted locations, each naming where it came from, confirmed to be two different places — is assertable. A complaint that cannot be is a style opinion, and this bar has no channel for one.

## Precedence — a frozen scenario outranks this bar

Where a frozen scenario requires what a criterion here would fail, **the scenario wins and the bar yields**. The suite was ratified at the spec gate, and a bar that could veto a frozen scenario would make the impl gate a second spec gate.

The collision is filed as an **architect observation against the spec**, so the scenario is fixed where it lives. It is **not** reported as a gate blocker.

## What this page does not own

Three lookups belong to other pages and are reached by link rather than answered here:

- **what each of the four scenario-scoped checks verifies**, and why a document needs two instruments — [the doc-eval model](/quill/doc-eval-model/);
- **what a documentation spec must contain, and must never freeze** — [the spec-gate Builder bar](/quill/quill-builder-spec/);
- **which agent runs this bar**, which one writes the document, and the write-versus-run independence anchor — [the production chain](/quill/production-chain/).

For what Quill is and how to register it in a project, see [the Quill overview](/quill/overview/) and [`init-quill`](/quill/init-quill/).
