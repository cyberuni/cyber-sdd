---
name: quill-builder-spec
description: "Partial Skill: invoke by name only — the Quill Builder bar at the spec gate — what a documentation spec must contain. Loaded by the Quill spec-producer to self-align and by the spec gate to grade. Not triggered by users directly."
user-invocable: false
metadata:
  actor: builder
  gate: spec
  compose: union
---

# Quill Builder-Spec Governance — the documentation contract bar

The **Builder** bar at the **spec gate**, specialized for documentation artifact-types
(`documentation`, `guide`, `tutorial`, `article`, `reference`). It **unions onto**
`sdd:builder-spec-governance` — the generic testability and coverage bar still applies; this adds
what makes a *documentation* spec a complete contract. One merged bar read by both faces: the
spec-producer (`quill-spec-writer`) reads it forward, the spec gate reads it backward.

A document is an implementation artifact with verifiable structure (`design/doc-eval-model.md`). Its
spec therefore freezes **what the document must land**, never how it is written.

## The shape of a documentation spec

The four SDD sections still apply (`sdd:spec-format-governance`). This bar says what fills them.

### `## What` — seven required elements

**1. Audience — a table, never a phrase.**

| Audience | Who they are | What the document gives them |
|---|---|---|

- Name a **role plus what they are trying to accomplish**. "The reader", "users", and "developers"
  are not audiences — they name no goal, so nothing about the document follows from them.
- **An audience with no entry point in `## Use Cases` is not an audience.** Either add the entry
  point or cut the row; an audience listed and never served is the most common way a document
  silently fails half its readers.
- **Two audiences needing opposite things from one fact is a split signal.** Record the decision
  either way — one document serving both, or two documents — but never leave it undecided.
- The audience list is what the coverage table and the use cases are *derived from*. Write it first.

**2. Doc type — one of four, declared.** The type sets what "good" means, and mixing types in one
document is the most common structural defect (Diátaxis).

| Type | The reader is | Success is |
|---|---|---|
| **tutorial** | doing something for the first time, learning by doing | it worked, and they now trust they can do it |
| **how-to** | accomplishing a goal they already understand | they got unblocked |
| **reference** | looking one thing up | they found it, and it was accurate |
| **explanation** | building understanding, not doing a task | they can now make a decision they could not before |

**3. North star — one sentence, plus a failure mode.** The understanding or capability the reader
leaves with. It must carry a **concrete state a reader could be in that would mean the document
missed** — without that, the north star is unfalsifiable and grades nothing.

> *A reader finishes able to X.* **A revision that leaves a reader able to Y but not X has missed.**

**Its kind is fixed by the declared type.** The *Success is* column above is not description — it is
the form this element must take. Nothing else joins the two, so a spec can declare `reference` and
write an explanation's north star with both elements looking correct on their own:

| Declared type | The north star claims | The failure mode names |
|---|---|---|
| **tutorial** | the reader can now do the thing, and trusts they can | a reader who followed it through and still cannot |
| **how-to** | the reader got unblocked on the goal they arrived with | a reader still blocked, or unblocked on a different goal |
| **reference** | the reader retrieved the one thing they came for, accurately | a reader who found the entry and still cannot settle their case |
| **explanation** | the reader can make a decision they could not before | a reader who can restate the argument but not act on it |

Reference drifting toward explanation is the common direction — *"a reader finishes understanding how
the bar works"* grades nothing a lookup cares about, since comprehension does not fail when the entry
the reader came for is missing. Every node in this corpus that declared `reference` made this join by
hand; the bar is what stops it depending on the producer noticing.

**4. Why it exists.** The problem the document resolves, in the domain's own terms. If it cannot be
stated without restating the title, the document may not need to exist separately from its parent —
say so rather than papering over it.

**5. Key points — required coverage.** A numbered table: `| # | Topic | Must convey |`.

- Each row is a **claim the document must land**, not a section name. "Separating targets lets
  contradictory values coexist" is a claim; "the separation section" is a heading.
- **The document is incomplete without each row.** The test: *if this row were dropped and the
  document unchanged, would a reader be worse off?* If no, it is not a key point — cut it.
- Each row must be **checkable by static inspection** (the four checks in `design/doc-eval-model.md`:
  existence, structure, completeness, reader-path).
- **The coverage list is complete when** a document meeting every row cannot still trip the north
  star's failure mode. If it can, a key point is missing.
- **Spend every row by its number.** That completeness claim is an argument against the table, so
  make it row by row: cite each `#` and say what it rules out. A paraphrase — *"the rows on splitting
  and on precedence cover it"* — is what goes stale, because the argument keeps reading as sound
  while the row it names has moved underneath it. Three regressions in this bar's own corpus were
  exactly that, each surfacing only after a different, unrelated fix shifted what the summary
  referred to. **A row the argument cannot spend is a row nothing depends on — cut it.**

**6. Non-goals.** What the document deliberately does not cover — **and where that lives instead**. A
non-goal with no forwarding address reads as an omission rather than a decision.

**7. Prerequisites.** What a reader must already know, and which document supplies it. A document
claiming to be self-contained declares that here explicitly.

### `## Use Cases` — reader entry points, grouped by audience

One row per way a reader arrives, as **trigger / what they bring / what they leave with**. Group the
rows under their audience. Every audience gets at least one; every entry point traces to a coverage
row that serves it.

### `## Control Flow` — the reader's decision path

Draw the **questions the document must answer to route a reader**, not its table of contents. A
section list is not a control-flow graph: it records what was written, while the CFG records what a
reader needs and in what order they need it. Where the document serves several audiences, the first
branch is usually **which audience the reader is**, because that selects which part they need.

**An outcome node holding a disjunction is an unmade decision.** A leaf reading `[do A, or do B]`
leaves the reader exactly where they arrived — needing to choose, with no criterion to choose on.
Promote it to a decision node and put the discriminator on the edges:

Before — one outcome, two options, no criterion:

```
K -- yes --> K1[split into units, or scope by prose]
```

After — the criterion is the node, and each option is its own outcome:

```
K -- yes --> K1{would splitting copy more than it separates?}
K1 -- no --> K2[split into single-target units]
K1 -- yes --> K3[keep one file, branch by prose]
```

A disjunction in a **decision** node is fine — that is a question. A disjunction in an **outcome**
is a decision the author deferred onto the reader, and it is the shape that lets a document ratify
whichever branch its draft happened to take.

**A route must reach every option the spec itself enumerates.** Where a coverage row names a set —
three mechanisms, four arrangements — and a node routes a case across that set, an option silently
absent from the routing is a gap, not a simplification. Route to it or state why it is excluded.

Check this against the **spec**, never against the document: at the spec gate the document may not
exist yet, and grading a contract by the draft it was written to catch is how the draft's omissions
become the contract. The coverage table is the inventory; the CFG must spend it.

### `## Scenario map` — 1:1 with the suite

Standard (`sdd:spec-format-governance`). Every coverage row (element 5) is reachable from at least
one scenario; a row no scenario checks is unenforced.

**A claim several passages could carry is asserted against the reader's paths, not against a count.**
`Then it states X` is satisfied by X appearing anywhere, so a coverage row whose claim is load-bearing
in several sections is under-specified: the scenario passes on a document that lands the claim only
where one reader will pass. Assert the paths instead:

```gherkin
Then it presents two values that cannot both be one house style
And it states that contrast on each path the control flow routes to it
```

The CFG is already in the spec and the passages are already in the document, so this is a comparison
the reader-path check settles. It freezes no wording, no section order, and no count — only that a
reader who needs the claim reaches it.

**Do not assert a place count.** An earlier revision of this bar prescribed `in exactly one place,
later passages referring back` on the reasoning that an unquantified suite pays for restatement.
Recurrence has no empirical warrant as a defect (`.research/documentation-craft/`), and the count
gets the driving case backwards: a reader arriving at a later section from the sidebar has not read
the lead, so the "redundant" restatement was that reader's only statement of the claim, and replacing
it with a pointer made the document worse for exactly them.

**A routing scenario asserts the discriminator, not the destination.** `Then it directs that case to
prose matching` names one member of a set and passes whether or not that member is the right one —
so the suite ratifies the draft's route instead of testing it. Assert what decides:

```gherkin
Then it directs a target whose rules can stand as their own unit to description matching
And it reserves prose matching for variants that splitting would duplicate
```

A destination-only `Then` is worth writing only where the set has one member. Wherever the reader is
choosing, the criterion is the behavior and the destination is a consequence of it.

Relations the suite still cannot reach, because they hold *between* passages no single scenario
reads, are graded once per document against `quill:quill-builder-impl`.

### Identifiers — one namespace per node

A doc spec keys three populations: **coverage rows** (element 5), **reader entry points**
(`## Use Cases`), and **CFG node labels** (`## Control Flow`). Coverage-row IDs are cited *from* the
other two — an entry point ends `(G1, G3, G7)`, a scenario map row names the row it checks — so the
keys are load-bearing here in a way they are not in a capability spec, whose use cases are named
rather than numbered.

**An identifier denotes one thing per node.** Two populations reaching for the same
audience-initial letter is how it breaks: an entry point keyed `A1` for the *adopter* and a CFG node
keyed `A1` for the *actor-name* branch are two objects that a grader tracing a citation reads as one.
This is measured, not anticipated — the website corpus shipped five such collisions across two nodes,
four of them in a single file where `A1 A2 T1 T2` were simultaneously entry points and graph nodes.

**Prefix reader entry points `UC`.** `UC1`, `UC2`, `UC3` — two alpha characters, so it cannot
collide with the single-letter labels a mermaid graph uses, and it is the same key in every node. An
audience-initial prefix loses nothing by going: the rows are already grouped under their audience's
own heading, so the letter restates the heading while colliding with the graph. Twelve authored
nodes currently use twelve schemes, which costs a reader moving between them a fresh key each time.

### After an edit — reconcile what references the claim, and audit what freezes it

A node is a web of restatements: one coverage row is cited by an entry point, described in the CFG,
and frozen by a `Then`. Change the claim and the copies stay where they are. Four of four remediated
nodes regressed in a single round, and **every finding was introduced by the remediation itself** —
so this is a duty of the edit, not of the next review.

**Reconcile every passage that references the claim.** Having changed a coverage row, a north star,
or an audience row, walk what cites it — entry points, the CFG, non-goals, prerequisites, the
scenario map — and correct whatever still describes the old claim.

**Then audit every `Then` you wrote or touched.** The sweep above is necessary and not sufficient,
which is measured rather than supposed: run on its own it found no staleness — a cold judge confirmed
that — and the same node still shipped a defect in each of two consecutive rounds, both a `Then` that
**mistranscribed the clause it freezes**. Confirming that a reference still points somewhere does not
confirm it still says the same thing. So quote the source clause beside each touched `Then` and
classify the pair: **same / narrower / wider / different**. Only *same* survives; the other three are
the finding.

**Where a `Then`'s only home is a CFG node label, say so.** One of those two defects existed
precisely because a label was a claim's sole home — a claim with one copy has nothing to disagree
with, and reads as consistent for exactly that reason.

**A sweep is not self-certifying.** Both halves reduce rounds; neither replaces the cold judge.

## What a documentation spec must never freeze

Freezing any of these produces a spec that breaks on every honest revision while catching no real
defect — the failure mode that makes teams abandon doc specs:

- **Section order.** A reordering that serves readers better must not fail the gate.
- **Wording, phrasing, or headings verbatim.** Assert the claim, never the sentence.
- **The specific examples used.** Assert that an example of the required kind is present.
- **Length, tone, or voice.** Not statically checkable, and not the contract's business
  (`design/doc-eval-model.md`).

The rule in one line: **freeze the claims and the reader's path; leave the prose to the author.**

## Fit — when this bar does not apply

A subject with no inspectable document surface is outside Quill's lens and **recuses** to the
SDD-default chain rather than being graded here (`design/doc-eval-model.md`, *Fit*). A spec whose
artifact is code, config, or an agent definition is not a documentation spec, however much prose it
carries.

## Gaps are `CONTENT_GAP`, never guesses

A missing audience, doc type, north star, or coverage table is returned as a `CONTENT_GAP` for the
conductor to put to the user. Do not infer an audience from the document's existing prose — that
launders whatever audience the draft happens to serve into the contract, which is exactly the defect
the audience element exists to catch.

## Key points (read-check)

1. **Audience first, as a table** — a role plus a goal; an audience with no use case is not an
   audience; opposite needs on one fact is a split signal.
2. **Declare the doc type** — tutorial / how-to / reference / explanation; mixing them is the common
   structural defect.
3. **The north star carries a failure mode**, or it grades nothing — and its kind is the declared doc
   type's *Success is* cell: retrieval for a reference, a decision for an explanation.
4. **Key points are claims the document is incomplete without**, each statically checkable, complete
   when meeting them all rules out the failure mode — argued **row by row, citing each `#`**, since a
   paraphrased argument goes stale silently. A row the argument cannot spend is cut.
5. **The CFG is the reader's decision path, not the table of contents** — branch on audience first
   when there are several; an outcome node reading `A, or B` is a decision deferred onto the reader,
   and a route must reach every option the document names.
6. **Never freeze order, wording, examples, or tone** — freeze the claims and the reader's path.
7. **Assert a load-bearing claim against the reader's paths, never a place count** — `states X`
   passes wherever X lands, so require it on each path the CFG routes to it. Recurrence is not a
   defect.
8. **A routing scenario asserts the discriminator**, never the destination alone — otherwise it
   ratifies the route the draft took rather than testing it.
9. **One namespace per node** — an identifier denotes one thing; entry points are keyed `UC1`, `UC2`,
   so they cannot collide with a single-letter CFG label.
10. **After an edit, reconcile the references *and* audit the `Then`s you touched** — quote each
    against its source clause and classify same / narrower / wider / different. The reference sweep
    alone measurably misses mistranscription.
