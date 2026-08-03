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

**Quantify a claim that more than one passage could carry.** `Then it states X` is satisfied by X
appearing twice — so a coverage row whose claim is load-bearing in several sections is satisfied
*more* the more it is restated, and a passage de-duplicated in one revision duplicates again in the
next. Where a claim spans passages, assert the count:

```gherkin
Then it presents two values that cannot both be one house style
And it makes that contrast in exactly one place, later passages referring back
```

This freezes no wording — it fixes how many places carry a claim, not how any of them is phrased.

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
3. **The north star carries a failure mode**, or it grades nothing.
4. **Key points are claims the document is incomplete without**, each statically checkable, complete
   when meeting them all rules out the failure mode.
5. **The CFG is the reader's decision path, not the table of contents** — branch on audience first
   when there are several; an outcome node reading `A, or B` is a decision deferred onto the reader,
   and a route must reach every option the document names.
6. **Never freeze order, wording, examples, or tone** — freeze the claims and the reader's path.
7. **Quantify a claim several passages could carry** — `states X` passes twice over, so assert
   *exactly one place*; unquantified, the suite pays for restatement.
8. **A routing scenario asserts the discriminator**, never the destination alone — otherwise it
   ratifies the route the draft took rather than testing it.
