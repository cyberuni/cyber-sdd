---
title: How Quill decides a document is correct
description: Quill's two instruments — inspection and judgment — the criterion that separates them, what neither of them asserts, and where a concern of your own belongs.
---

Quill puts a gate in front of documentation: a checkpoint a document has to clear before the change carrying it moves on. A gate needs a rule for what a verdict may rest on, and documentation is where that rule is hardest to write. *"The install page is missing"* and *"this paragraph reads badly"* are both real defects, but a gate that treats them alike either blocks on taste or refuses to block at all — and both endings are the same ending, because a gate people do not trust is a gate people route around.

Quill's answer is a split by **what decides the verdict**. One instrument compares two structured artifacts and returns a boolean. The other simulates a reader and returns a graded finding. This page argues that split, draws each side's scope, and says which of your own concerns Quill can decide — and which it deliberately cannot.

This page assumes only that you know Quill is SDD's documentation plugin and that documents are its subject ([Quill overview](/quill/overview/)). It assumes nothing else about SDD, so the vocabulary it leans on is glossed where it first appears: a **frozen `.feature`** is a document's behavior contract — a list of scenarios, fixed at the point of agreement so it can serve as an anchor nothing downstream may edit; the **spec gate** is where that contract is agreed and frozen; the **impl gate** is where the written document is graded against it.

## Is your subject even in the lens?

Take this first, because a subject outside the lens should leave now rather than learn a model that will never apply to it.

Quill applies to artifacts whose correctness is **structurally checkable**. The surface that makes an artifact so is:

- a **declared path** — one stated location the document is expected to exist at;
- **required sections** — headings a scenario can name and a checker can look for;
- and, additionally for a **guide** or a **tutorial**, a **reader flow** — an ordered path a reader follows that has to arrive at a stated outcome.

A subject with no inspectable document surface — a config file, a schema, a build script — is **outside Quill's lens**. It recuses to the **SDD-default builder**: the general chain takes it instead. There is no reduced Quill grading, no partial pass, no subset of the checks applied loosely. The lens either fits the subject or the subject goes elsewhere whole.

## Two ways through from here

The rest of the page serves two arrivals, and neither has to read the other's half.

- **You are deciding whether to adopt this gate.** Read *The split*, then *The judged tier reports before it blocks*, then *What a clean run does not certify*. You will finish able to state what a blocking verdict may rest on.
- **You are placing a concern of your own** — writing a documentation spec and its `.feature`, and deciding what to assert. Read *What a scenario may assert*, then *When no scenario can hold it*, then *Recurrence is not a defect*, then *How a judged finding arrives*.

Both routes pass through the same boundary statement about style, because both readers need it: one as an assurance, one as a constraint.

## The split: what decides the verdict

The two instruments are separated by **how a verdict is reached**.

- **Inspection** decides by comparing two structured artifacts, or by matching a pattern.
- **Judgment** decides by simulating a reader.

That is the whole criterion, and it is worth being precise about what it is *not*. The split is **not** by which file a criterion is written in, nor by which bar carries it. Both instruments' criteria live in the same places; a criterion's instrument is fixed by what settles it, not by its address.

The verdict's shape then **follows** from how the verdict was reached, rather than being assigned to it:

- Inspection compares two structured things, so the outcome is a difference: present or absent, matching or not. It yields a **boolean**, and a failure **blocks**.
- Judgment simulates a reader, and a reader's experience does not come out as a bit. It yields a **graded finding**.

Craft is judged rather than linted for a reason that is about decision procedures, not about prose being ineffable. Reading well means weighing many reader expectations at once, and a decision procedure cannot weigh many expectations at once — it applies them in order and returns on the first hit. What it produces is not a reading. A judge that simulates a reader can hold them together; that is why the second instrument reads rather than matches.

**Neither instrument asserts tone, register, length, word choice, or section order.** Those five are out of scope, full stop. The bar holds at the **judged** instrument exactly as it holds at the boolean one — the graded tier is not the place style was moved to when it was thrown out of the boolean one. A judged finding that reduces to "I would have written this differently" is not a finding.

## The judged tier reports before it blocks

A catalog entry does **not block until it has been calibrated**. Until then it reports, and the report is advisory: it shows up, it does not fail the build.

Calibration means running the entry against real documents from the repository — at least one the team **already accepts** and at least one it **already considers weak** — and reporting how often it fires where it should not. An entry that fires on a document the team already accepts has told you something about the entry, not about the document.

The asymmetry there is deliberate. A **miss** ships a weak paragraph, which is a cost the next revision can pay. A **false positive** teaches the producer that the judge cries wolf, and a producer who has learned that routes around the judge — after which it catches nothing at all. The cheaper failure is the one that lets a bad paragraph through.

Whether any particular entry is advisory or blocking today, how a calibration run is performed and scored, and what a calibrated entry blocks on are recorded on **[Builder bar — impl gate](/quill/quill-builder-impl/)**, which carries the per-entry standing beside each entry. This page does not report any entry's standing, because a standing copied into a second place is a standing that goes stale.

## What a clean run does not certify

The judged instrument **detects defects; it does not certify quality**. A document that comes back with zero findings is **not** thereby certified well written.

The reason is an asymmetry in what can be enumerated. Good prose is unbounded — there is no finite list of the ways a document can be excellent, and any list you wrote would be a list of one writer's habits. Bad prose is not like that: it recurs in a small number of nameable shapes, which is exactly why a catalog of them can exist at all. So the catalog can say *this named defect is here* and can never say *nothing is wrong*.

What a green run licenses you to report is therefore narrow, and worth getting right before you report it to someone who will act on it: **no named defect was found.** Not that the document is good.

## What a scenario may assert

This is the author's half. Four checks are scoped to a single scenario, and each one settles a question about the passage that scenario names:

- **Existence** — the target document is at its declared project-root-relative path.
- **Structure** — the headings the scenario names are present.
- **Completeness** — there is no placeholder text and no empty section.
- **Reader-path** — a sequential flow reaches its stated outcome, with every step present and no undeclared external prerequisite.

That set is a constraint on what you may write, not just a description of what runs. **Every scenario a documentation `.feature` carries must be checkable by one of the four.** A concern that none of the four settles is not scenario material, however real the concern is and however much you want the suite to hold it. Writing it as a scenario anyway produces a scenario nothing can decide, which is worse than not writing it: the suite goes green and you believe something was checked.

As stated above, tone, register, length, word choice, and section order are unassertable at both instruments — so none of them is scenario material either, and a `.feature` that reaches for one has reached outside the model entirely.

## When no scenario can hold it

Some defects are real, checkable, and impossible to write as a scenario. They are the ones that hold **between** passages.

Each of the four checks reads only the passage its scenario names. That scope is what makes the checks decidable, and it is also what makes them blind to a whole class of defect: when the problem is a relation between two passages, **each occurrence is well-formed against its own scenario**. Passage one passes. Passage two passes. It is the **pair** that fails, and no scenario is looking at the pair.

### Why another scenario is not the fix

The obvious repair — write one scenario per pair — fails twice over.

It does not **scale**: pairs grow with the square of the passages, and a suite of them is unmaintainable before the document is long.

Worse, it would freeze the document's structure. A scenario naming two specific passages and asserting how they relate pins where those passages are, which means the suite can no longer be satisfied by a differently-arranged document that lands exactly the same claims. A documentation spec must never freeze that, and what a spec may and may not freeze is set out on **[Builder bar — spec gate](/quill/quill-builder-spec/)**.

So these criteria are graded **once per document** instead, at the impl gate.

### Which of them is comparison, and which is reading

Being document-scoped does not make a criterion judged. The same criterion applies here as everywhere: **how is the verdict reached?**

- A concern whose **two sides are both structured and enumerable** is settled by **comparison**. The document names a set; a later passage routes a case across that set; an option present in the first and absent from the second is a difference between two lists. **A route omitting an option the document itself enumerated** is that case — it is set difference, and no reading is required to see it.
- A concern whose decision requires **reading as a reader** is **judged**. A term introduced for one kind of subject and later predicated of a different kind is such a case: it reads as comparable, since both uses of the word are right there and you could imagine diffing them, but deciding that the second subject cannot take the term means understanding what the term was coined for. So does deciding that two claims cannot both hold, or that a passage presupposes something the reader's path never established.

The exact wording of the comparison rule and its citation form live on **[Builder bar — impl gate](/quill/quill-builder-impl/)**.

### Why the judged ones were once called inspection

An earlier revision of this model classed all of these criteria as **inspection**. The reason it did is worth naming, because the mistake is easy to repeat: each of them requires **evidence with a citation** — quote the passage, name where it came from — and a criterion that demands citations *feels* mechanical.

It is not. The citation requirement **disciplines** a finding; it does not **decide** one. Requiring a quote makes a finding checkable and refutable after the judge has reached it. It contributes nothing to reaching it. A criterion whose decision still needs a reader is judged, however rigorous its paperwork.

## Recurrence is not a defect

An earlier revision of this model held that a claim landed in **two** passages was an integrity defect. That rule is **retracted**. A claim may recur.

### What the measured cost actually attaches to

The retraction is not a change of taste; the rule had no empirical warrant, and the evidence usually cited for it says something else.

Haviland and Clark's controlled comparison holds the critical noun **repeated in both conditions** and varies only whether an antecedent has been established for it. The comprehension cost shows up where the antecedent is missing. So the measured cost attaches to a passage whose **given information has no retrievable antecedent** — information presented as already known to a reader who was never given it. It does **not** attach to a claim appearing twice. Repetition on its own, in that comparison, buys nothing and costs nothing.

That inverts the rule rather than weakening it. What a claim may not do is arrive where the reader cannot retrieve it; arriving twice is not the problem.

### The retracted rule's own fix was the worse defect

The retracted rule prescribed a repair: keep the first statement, and replace the later one with a **pointer** back to it.

A pointer standing where the reader needs the content **now** is a worse defect than what it replaced. The reader has to leave the passage, find the antecedent, hold it, and come back — which is precisely the bridging cost the evidence above measures. Recurrence only *risked* that cost. The pointer **guarantees** it. The prescribed fix built the defect the rule was ostensibly about.

### The question that replaces it

If you still want a rule to apply to a repeated claim, this is the one — and it is not about counting.

The right amount of redundancy is **audience-relative, and it reverses between audiences.** Low-knowledge readers gain from explicit, redundant text: repetition is what lets them build a model they do not already have. High-knowledge readers do better with gaps, because filling a gap themselves is cheaper for them than reading what they already know. There is no setting that is right independent of who is reading.

So the checkable question is **agreement with the spec's declared audience and prerequisites**. Does this passage give that reader what that reader needs at that point? That question has an answer against an artifact. *How many times does this claim appear?* never does, and it is never the question.

## How a judged finding arrives

Three properties govern what a judged finding is worth. All three exist to keep it evidence about a reader rather than an opinion about prose.

### The reading pass runs blind

The judged pass reads **before** it scores. Pass one simulates a reader going through the document with the defect catalog **withheld** — the reader does not know what it is supposed to trip on. Only afterward does the scoring run, against the transcript of that reading.

The order is the whole design. A judge shown the catalog before reading finds what it was told to find: it goes looking for the shapes it was handed and it returns those shapes, and its finding is then an opinion about prose dressed as a reading. Reading first means the finding is anchored to something that actually happened to a reader.

What the blind pass receives, and how the scoring runs against it, is specified on **[Builder bar — impl gate](/quill/quill-builder-impl/)**.

### A finding can be defended as deliberate

The producer may mark a finding as **intentional**, with a rationale, and the judge **must weigh that rationale before reporting**.

That concession is required rather than generous. Any expectation about prose may be violated to good effect — that is what makes them expectations rather than rules — and a catalog with no defense path is a style guide with a gate attached. A rationale is weighed, not obeyed: it has to say what the violation buys the reader, not merely that it was on purpose.

How a deliberate violation is declared — where it is recorded and what it must name — is specified on **[Builder bar — impl gate](/quill/quill-builder-impl/)**.

### Evidence, at both instruments

A failure must quote **both** locations: the passage that establishes and the passage that misrepresents, the enumeration and the routing that skips a member, the two claims that cannot both hold.

Each citation must name **where** it came from, not only what it said. A quote can be perfectly accurate and attributed to the wrong passage, and that failure is invisible to whoever reads the finding — the words check out, so the finding reads as verified. The location is what makes a finding checkable, and therefore refutable.

The two locations must also be **confirmed distinct**, and the judge has to check. Every criterion here is a relation between passages, so a finding whose two quotes resolve to the same place has not found a pair; it has read one passage twice.

This requirement holds at the **judged** instrument as well as at the inspection one — and the judged one needs it more, since it argues rather than reports a condition.

## Where the rest of it lives

This page argues **why** each mechanism exists and states **that** it exists. What each one does is elsewhere.

| Not on this page | Where it is |
|---|---|
| what the document-scoped enumeration rule compares, and its citation form | [Builder bar — impl gate](/quill/quill-builder-impl/) |
| the defect catalog's entries, their near-misses, and the citation each group owes | [Builder bar — impl gate](/quill/quill-builder-impl/) |
| what a judged pass receives and does, and how a deliberate violation is declared | [Builder bar — impl gate](/quill/quill-builder-impl/) |
| how a calibration run is performed and scored, each entry's current standing, and what a calibrated entry blocks on | [Builder bar — impl gate](/quill/quill-builder-impl/) |
| what a documentation spec must contain, and what it must never freeze | [Builder bar — spec gate](/quill/quill-builder-spec/) |
| which agent fills each production-chain role, and who writes versus who runs | [Production chain](/quill/production-chain/) |
| Quill's install command and its artifact types | [Quill overview](/quill/overview/) |
| registering Quill in a project, and the registry entry's shape | [Registering Quill](/quill/init-quill/) |

How a document is *written well* is nowhere in this section, and that is deliberate. The judged tier samples for named defects; it does not teach writing.
