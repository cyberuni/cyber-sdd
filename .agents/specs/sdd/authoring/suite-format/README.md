---
spec-type: reference
concept: spec-authoring
---

# suite-format — the .feature behavior-suite bar

A **reference artifact**: the `suite-format` governance — how behavior-suite scenarios are *written and judged*. Loaded by the spec-producer (self-align) and the spec-judge (verify); it owns no `.feature` of its own, and its conformance shows up in the spec-judge's verdict on real suites.

## Subject

- **Artifact** — the `suite-format` governance, shipped as the `suite-format-governance` skill (a fixed-universal SDD governance; `../../design/governance-resolution.md`).
- **Contract surface** — every `.feature` in any SDD project: its Gherkin form, the `@rubric` exception, the normative status of a `Given` vs a `Then`, scenario ordering, and the `@frozen` marker.
- **Conformance** — verified by the **spec-judge** at the spec gate. A reference artifact carries this `## Subject` in place of a `## Use Cases` section and a `.feature`.
- **Boundary** — the `spec.md` structure (the required `## Use Cases` section, enrichment) belongs to `../spec-format/`; the freeze/unfreeze *model* (triggers, the gate, iteration economy) belongs to `../../design/lifecycle-model.md`. This bar owns the `.feature` form.

This bar governs the `.feature` of a **behavioral** spec only — `descriptive` and `reference` nodes carry no suite (see the spec types in `../../design/spec-structure.md`).
It applies uniformly to both the workflow scenarios in `../../workflows/` and the unit scenarios colocated with their capability folder — one project-spec, one convention.

## The gate sees one boolean per scenario

Every scenario collapses to a single **pass/fail** at the verification point.
This is the contract the rest of the pipeline depends on: the judge reports one boolean per frozen scenario, never a score.
Two forms reach that boolean.

## Two axes — the suite specifies acceptance; the level is a test implementation detail

The old framing, "the `.feature` is acceptance/boundary only", mixed one item from each of two
independent axes. They are separate:

- **Axis 1 — what the suite specifies: acceptance, strictly.** A scenario asserts a **decision the
  node owns**, as a `(path class, edge)` pair. The suite says nothing about *how* the assertion is
  verified.
- **Axis 2 — the verification level** (e2e > system > integration > boundary > unit) is a **test
  implementation detail**, chosen per scenario as **high as it doesn't hurt**, recorded with its
  reason. It lives on the impl bars (`sdd:builder-impl-governance`), never in the frozen contract —
  so the same frozen scenario may be verified at a different level tomorrow without re-opening it.

"Boundary" is a **level**, not a category of scenario. A suite that names a level in its contract has
leaked axis 2 into axis 1.

**Combinatorics still move down** — for a reason that survives the reframing. A suite is a **decision
graph**, not a combinatorial cover: it carries one scenario per `(path class, edge)` pair, so it
structurally cannot exhaust a truth table, and a suite that tries **churns without end** (the
`github-315` `deps.feature` cost 13 Builder-lens judge rounds; ADR-0028).

- **Inner-rule combinatorics belong to unit tests owned by the impl-producer**
  (`../../mission/impl-producer/`): each inner rule covered once, cheaply, exhaustively; cases drawn
  from the rules, never by enumerating the frozen scenarios.
- **The impl gate checks both axes** and never demands the suite enumerate a combinatorial space
  (`../../mission/impl-judge/`).
- **No deterministic inner layer, no offload** — a graded non-deterministic subject (an agent config)
  has nothing to push combinatorics into; `@rubric` absorbs the space in place.

## The suite screams the intents

Organize scenario **sections by use-case / intent**, front and center — the same screaming-architecture
law `../../design/spec-structure.md` enforces on the node tree. Sections named by **layer**, **output
format**, or **"misc rules"** are a **placement defect**: a suite that screams plumbing rather than
domain intents is a poorly-abstracted architecture that will churn, and the implementation inherits the
smear.

## One behavior per scenario — SRP and dedup

One behavior per scenario; one canonical scenario per behavior. A scenario with several unrelated
`Then`s churns whenever any of them changes and its name starts to lie — split it. Two scenarios sharing
a `When`+`Then` core are a duplicate that drifts into a contradiction — dedup to the canonical one.

## Form 1 — pure-boolean Gherkin (default)

A plain `Given / When / Then` scenario whose every `Then` is an observable, deterministic boolean assertion — no scores, probabilities, or rubric lingo.
This is the default and is unchanged from baseline SDD.
Use it whenever the behavior is directly checkable.

A `Then` asserts the **artifact's end-state or observable behavior**, never the **production process** that made it — "co-developed with the code", "written test-first", "refactored before completing", "authored in this order" are unobservable (nothing in the artifact or a run reveals the authoring sequence); rewrite such a `Then` to assert the artifact's observable behavior instead, and keep production discipline in governance prose, not a scenario.

## Form 2 — rubric Gherkin (`@rubric`, judged by hand)

A gradient judgment cannot be faithfully encoded in a single flat boolean ("structurally fit" is too coarse to express "reversible AND alignment-preserving AND non-breaking").
The rubric form admits scoring criteria into the scenario and then collapses them to one boolean, preserving the gate contract.
Rubric form is **purely additive**; it never changes how untagged scenarios work.

Convention:

1. **Tag** the scenario `@rubric`.
2. **Embed the rubric** in a `Then` step as a docstring (`"""..."""`) — named dimensions, each with a `max:` value, plus exactly one `threshold:` line.
3. **Close** with a boolean-collapsing `Then`: `And the rubric score is at least the threshold`.

```gherkin
@rubric
Scenario: <name>
  Given ...
  When  ...
  Then the judge evaluates the scenario against the rubric
    """
    dimensions:
      - name: correctness
        max: 3
      - name: completeness
        max: 2
    threshold: 4
    """
  And the rubric score is at least the threshold
```

The final `Then` yields exactly one boolean — the gate sees pass/fail, not a score.
The rubric is internal evaluation detail.

## One criterion per dimension — split before you select

A dimension naming two criteria joined by *and* — `harness_agnostic_and_mcp_free` — is
**double-barreled**, and it has no honest score: a subject that is harness-agnostic but ships an MCP
dependency satisfies one half and fails the other, so every number you could award it reports
something false.

This is a **structural** defect, not a selection one, and it is caught at the **structure** check —
before selection, because a double-barreled criterion cannot be selected either. Its two halves
rarely trade the same way, so asking whether *it* is substitutable has no answer. **Split it first**,
then run each half through the substitutability test below on its own — the halves routinely land in
different forms (*that a migration is reversible* is a rule; *how thoroughly it is documented* is a
gradient).

## Choosing the form — the substitutability test

The two forms are not *simple* versus *complex*. They are **non-substitutable** versus
**substitutable**, and this is the rule that decides which form a criterion goes in.

A rubric that sums N dimensions and compares the total to one threshold is a **compensatory**
model: a high score on one dimension **compensates** for a low score on another. That is the
form's whole purpose, and it carries one documented cost — a subject that wholly fails one
dimension can still pass by banking points elsewhere. The term for that is **compensation**, and
the bad pass it produces is a **false positive classification error**. It attaches to the
**aggregation** — to the act of summing — and no judgment method, judge quality, or threshold
arithmetic touches it.

Compensation is legitimate only where the dimensions are **substitutable**: where you genuinely
accept that strength on one may pay for weakness on another.

> Knowing how to read English really well should not compensate for the lack of ability to speak
> English.

**The selection rule: a criterion belongs in a `@rubric` only if you accept that strength
elsewhere may pay for weakness here.** If you do not accept that trade, the criterion is not in
the sum at all — it is a boolean `Then` (Form 1).

**Select before you author.** This is a decision about where a criterion **goes**, made while you
are writing it, not a pass that strips dimensions out of a rubric afterwards. A non-substitutable
criterion never becomes a dimension in the first place.

Where an **existing** suite already sums one, correcting it is never a silent strip and never the
simple deletion it looks like: it **adds** a boolean `Then` and it **forces the cut to be
re-derived**. That correction has its own procedure — *Correcting a standing rubric*, below.

Apply it per criterion, in the subject's own domain, by **saying the trade out loud**:

- *"Great scope makes up for shipping an npx dependency"* — nobody accepts this. `no_npx_dependency`
  is a **rule**: a boolean `Then`.
- *"Stronger error handling makes up for thinner edge-case coverage"* — a trade a reviewer would
  genuinely make. Both belong in the rubric.

| The criterion is | Form |
|---|---|
| **non-substitutable** — no strength elsewhere pays for failing it | **Form 1** — a boolean `Then` |
| **substitutable** — a reviewer would genuinely make the trade | **Form 2** — a `@rubric` dimension |

A **rule** graded as a rubric dimension becomes **tradeable**, which is the one thing a rule must
never be. That is a category error in the *selection*, and no threshold repairs it: a
non-substitutable criterion at any `max` and any `threshold` is still purchasable with points
earned elsewhere. One scenario routinely carries both forms — its rules as boolean `Then`s, its
one genuine gradient as a `@rubric`. Keeping a criterion out of the sum does not weaken the
scenario; the rule fails the subject outright instead of being priced.

**"Partly substitutable" means you are holding two criteria, not one.** The common case: you would
accept a thinner test suite paid for by strength elsewhere, but you would never accept *no tests at
all*. That is not one criterion with a floor under it — it is a **rule** (*there is at least one
test*) and a **gradient** (*how thorough it is*) that got named once. Split them and select each on
its own: the rule becomes a boolean `Then`, the gradient stays a dimension. Reaching instead for a
minimum on the dimension is the conjunctive move below, and it is the wrong one.

**Write the trade down.** Said out loud and left there, a trade leaves no trace — and a trade nobody
wrote is one nobody can disagree with: an **unowned selection**, exactly as a `threshold:` with no
recorded reason is an unowned policy. Put it in the **same record that carries the cut's reason**
(below, which is also where that record may live), naming the trade **and what pays for it** —
*"thinner edge-case coverage is paid for by stronger error handling."*

**The record is for the owner, not the judge.** Its reader is whoever reviews this suite later and
may disagree with it — the same audience and the same purpose as the cut's recorded reason. The
spec-judge does **not** grade it and never fails a dimension over it: selection is re-derived from
the **dimensions themselves**, exactly as where no record exists. A producer's own account of its
trade is not evidence, and putting it in the judge's path would buy that account a vote it has not
earned. What the record buys is that the selection stops being **unfalsifiable** — not detection of
a contested trade (*The soft spot*, below), and not any judgment the judge would otherwise skip.

The duty binds **when you author or revise a dimension**, and it is **the producer's alone**: no
judge reports a missing record, whoever authored it, so nothing catches you skipping it. That is the
honest state of it. Correcting the standing corpus is its own work — and **recording** a trade forces
no threshold re-derivation, changing no `max` and no cut; that is what **stripping** a
non-substitutable dimension forces (above).

**This is not conjunctive scoring.** Conjunctive scoring keeps every criterion in the rubric and
adds a per-dimension minimum each must clear. That is a worse instrument, not a safer one: the
**least-reliable subscore controls the outcome**, and it buys its fewer false passes with more
**false negative classification errors**. Per-dimension hurdles are not a safe default — do not
reach for them. Substitutability makes the opposite move: a non-substitutable criterion does not
become a graded subscore with a floor under it, it **never enters the rubric at all** and is
asserted as a boolean instead. Nothing is graded, so no subscore's reliability controls anything.

## The threshold is a policy call, not a derived one

Where the cut sits is decided by the **relative cost of a false positive (a wrong subject that
passes) against a false negative (a good subject that fails)**. That is a values decision the spec
owner makes on purpose. **It is not computable from the data.** Putting the cut where two subjects'
scores meet minimizes total error *only* when a false pass and a false fail cost the same and the
two kinds of subject are about equally likely — a claim about your domain, never a default to
inherit by arithmetic.

**Record why.** A `threshold:` line with no recorded reason is an unowned policy. Next to the
rubric or in the node's spec body, name which error the cut buys down and what that costs — *"a
false pass ships a broken contract and a false fail costs one more authoring round, so the cut
sits high."*

**One record carries both** the cut's reason and each dimension's trade (above) — they are decided
together and reviewed together, and two parallel records are two things to drift.

## Correcting a standing rubric — a queue of decisions, not a sweep

Selection (above) governs authoring. A rubric that **already** sums a non-substitutable criterion is
a different act: **correcting** it. The correction looks mechanical and is not. Removing a dimension
does two things at once — it **adds** a boolean `Then` asserting the criterion (strengthening the
contract), and it **removes a scored dimension, which invalidates the cut**.

**The second half is the trap, because it is silent.** Strip a `max: 3` dimension out of
`[3, 3, 2] threshold: 6` and the survivors reach 5 against a cut of 6 — **nothing passes at all.**
Strip a `max: 2` out of `[2, 3, 2] threshold: 5` and the survivors total exactly 5 — only a
**flawless** subject passes. Neither reports anything. A rubric no subject can pass reads like a
**strict bar**, not a broken one.

### The re-derivation duty

**Removing a dimension changes the attainable maximum, so the `threshold:` left behind is an
un-re-derived cut — whether or not its number still needs to change.** A correction that removes a
dimension must, **in the same edit**, re-derive the cut as a fresh **policy call** (above) and record
its reason, and that reason names the **new attainable maximum** it was set against.

This is why the correction **cannot be computed**. The cut is set from the relative cost of a false
pass against a false fail (above) — not derivable from the data, so not derivable by a script
sweeping the corpus. Each rubric's cut is **its own decision**, and a sweep has no one to make it.

### One rubric, one decision, one ratification

A correction to a `@frozen` suite **routes to Clearance** (the gate's hard floor) and takes the
owner's ratification. **One
ratification per rubric.** A blanket approval over a batch is not a faster path to the same place: it
collapses N individual policy calls into **one unexamined one**, which is the very thing the duty
exists to prevent. Correct the corpus as a **queue** — each item carrying its own re-derived cut and
that cut's recorded reason — never as one sweep.

Two consequences follow, and both cut against batching:

- **The queue's membership is a judgment, not a match.** Which rubrics sum a non-substitutable
  criterion is settled by the substitutability test per criterion, in the subject's own domain — not
  by a name pattern. A conjunctive **name** (`..._and_...`) is a strong hint and an incomplete one:
  a criterion can join two concerns under a name that reads singular, and a name can read conjunctive
  while the `_or_` is one disjunctive subject rather than two criteria. A regex sweep therefore both
  over- and under-fires, and its under-fire is the dangerous half — it **looks complete**.
- **Split before you correct.** A double-barreled dimension is split first (above), and its halves
  routinely land in different forms. The correction proceeds per **half**, not per name.

### Why the routing does not depend on the edit class

State the routing from what is true of **every** such correction, not from the shape one happens to
take:

> **Removing a dimension always modifies the baseline rubric scenario.** So the correction is never
> `additive` and never `no-content-change`. It lands as **`narrowing`** (the boolean `Then` joins the
> same scenario) or **`mixed`** (the boolean `Then` becomes a separate `Scenario`), and **both route
> to Clearance.** Which one it is never changes the answer.

Do **not** encode the rule as "a mixed edit routes to Clearance." It is true and it is the wrong
handle: the natural in-scenario shape is `narrowing`, so a producer checking whether its edit is
`mixed` reads *no* and may conclude it self-clears. **It does not.** Route on the **removal**, which
is present in both shapes, never on the class the diff happens to report.

**The freeze sees the rubric only because the differ's pin says it does.** A `@rubric` lives wholly
inside a DocString. The structural differ is pinned at `gherkin-cli@0.0.2`, which hashes what a step
argument **says**; before that pin its scenario identity covered step text alone, and a rubric could
be gutted while its scenario still reported `unchanged`. **The pin is load-bearing here** — moved
backwards, every correction in this queue self-clears silently and Clearance never fires.

### The one mechanical check — and the bound it does not cover

**`sum(max) < threshold` is a dead rubric.** No subject, not even a perfect one, reaches the cut;
the scenario is `Then false` wearing a rubric's clothes. No policy could intend that of a rubric
meant to grade, so this is safe to **lint, fail-closed** — and it is **not a slack constant**: it
decrees no distance between anything, only that the passing set is **non-empty**.

**A green lint is not evidence the cut was re-derived, and the verdict says so.** The lint's bound is
exactly the vacuous case. `[2, 3, 2] threshold: 5` stripped to `[3, 2] threshold: 5` passes the lint
and is still an un-re-derived cut nobody chose — the duty above is what catches it, and only the
owner's ratification discharges it.

**Reach for no other arithmetic here.** A check that a surviving rubric keeps *enough* room under its
cut is a **slack constant** by another name, and the ban on those (*The margin is measured, not
decreed*, below) is not suspended because a correction prompted the question. Zero slack is not a
defect this bar can detect: only-a-flawless-subject-passes is a legitimate policy where the owner
**chose** it. The defect is that a strip nobody re-derived leaves that policy **unchosen**, and that
is a fact about the **edit**, not about the number.

## The soft spot — selection rests on one judgment, and that is accepted

**Do not look for a disambiguator on the contested case. There is none, and each search for one
repeats a settled mistake.**

The substitutability test is decisive on clear-cut criteria. On a **contested** one it gives no
traction, and a producer who wants a criterion to be a dimension can construct a trade that reads
plausibly. Nothing in this bar catches that. Each apparent guard is checked and does not reach:

- **Escalation does not reach it.** The escalate trigger (below) keys on a judge's **inability** to
  say whether it accepts the trade. A genuinely contested criterion produces **confident
  disagreement** — competent judges landing on opposite sides, each sure — not inability.
  *Contestable in fact* and *uncertain to this judge* are different properties; escalation fires on
  the second only.
- **The recorded trade does not reach it.** A motivated producer writes the trade down and it reads
  fine — and nothing grades it in any case (above).
- **Discrimination cannot back it up.** The subject that would expose a criterion smuggled into the
  sum is one right about everything *except* that criterion — a **blemished good subject**, the
  strawman the miss test bars. And selection runs **before** discrimination, so nothing downstream
  re-asks the question.

So selection rests on **one confident judgment, with no second reader inside this bar.** That is
accepted deliberately, not overlooked. The backstops sit **outside** it: the cold judge's
independence, and an owner who can disagree with the recorded trade after the fact — which is what
the record is for.

The two moves that look like a fix here are already ruled out: **arithmetic** over `max` and
`threshold` (*Selection and discrimination are judged, not linted*, below) and **per-dimension
hurdles** (above). A reader who reaches for either is solving a different problem.

## A scenario must be able to register a miss

A scenario that every plausible subject passes measures nothing.

Well-formedness is **necessary and never sufficient**. A `Then` that asserts a boolean, and a
`@rubric` block carrying named dimensions and a threshold, are both satisfied by a scenario no
subject can ever fail. Form is what the mechanical check settles; whether the scenario *grades*
anything is a separate question, and it is this one.

**Every scenario — and every `@rubric` dimension inside one — must be able to register a miss:**
there must exist a plausible wrong subject that fails the scenario, or that scores below the
dimension's `max`.

### The miss test

**Name a plausible wrong subject, and check that it loses.**

If no such subject exists, the scenario is inert. It is **dead weight** — it counts toward the
suite's nominal size and adds nothing to its effective size, the same defect an absorbed probe
carries, reached by a different route.

The wrong subject must be **plausible**: one a competent-but-wrong producer could actually ship. A
strawman settles nothing — an empty artifact fails every scenario, and its failure is no evidence
that any of them discriminates. Four wrong subjects recur, and are the ones to name first:

| Wrong subject | What it does | What it scores max on |
|---|---|---|
| **memorizer** | reproduces the doctrine's own words without applying them | any dimension grading recall |
| **copier** | echoes the artifact's own worked examples | any probe sharing the artifact's apparatus |
| **procedure-follower** | executes the steps without making the judgment | any dimension grading sequence |
| **single-brancher** | always takes the same branch of a decision | any scenario that only ever needs that branch |

The **copier** is the case the probe-independence rule below already bars; the miss test is the
general form, and absorption is one way to fail it.

### The three anti-patterns

Each names a `Then` or a dimension that **no** plausible wrong subject loses:

- **Presence** — it grades that a line, section, or artifact is *emitted*, where the subject's own
  shape makes emission trivial. A dimension reading *"names the threshold"* is scored max by
  anything that read the doctrine at all.
- **Restatement** — it grades reproducing the doctrine's own words. The memorizer scores max and the
  reasoner scores no higher, so the dimension measures reading and reports it as reasoning.
- **Procedural** — it grades following the steps where the *judgment*, not the sequence, is what is
  under test. The procedure-follower scores max.
- **Toothless finding** — a `Then` asserts a signal is *raised* (a finding, flag, error, blocker) but
  not its **binding consequence** (it withholds the pass, blocks the gate, changes the outcome). The
  wrong subject raises the signal and acts on nothing; emission is trivial, and the consequence is the
  behavior under test. When a scenario asserts a finding, it asserts the finding's teeth.

### Loseable in arithmetic is not loseable in practice

A dimension some wrong subject can lose is not yet enough.

**For each named wrong subject, sum what it scores; that sum must sit strictly under the
threshold.** Strictly: the collapsing `Then` passes a score *at least* the threshold, so a wrong
subject that ties the threshold **passes**. A rubric whose free dimensions alone carry a wrong
subject to the threshold leaves its discriminating dimensions decorative.

> Dimensions `[live 3] [restatement 3] [presence 2]`, `threshold: 6`.
> A memorizer banks `3 + 2 = 5` on `restatement` and `presence` without engaging `live` at all.
> Those two dimensions are free — a memorizer maxes both — so each fails the miss test on its own
> and is rewritten. The defect is the two decorative dimensions, not the distance from 5 to 6.

**Score each wrong subject at what it banks — never zero a dimension to make a point.** A wrong
subject scores each dimension at what that dimension's own rules award it, which for a memorizer
on a live dimension is rarely 0. Zeroing one dimension in turn and asking whether the rubric still
passes is **not** this test: it posits a subject that is right about everything except one thing,
which is a blemished **good** subject — precisely the strawman the miss test bars. A score profile
does not identify a subject. `[3, 0, 3]` is the memorizer's profile *and* a good-but-flawed
subject's, and they are not the same subject.

### The margin is measured, not decreed

**How far under the threshold a wrong subject must land is not a constant this bar can give you.**
That distance is only meaningful against the **noise of your own judge**: score the same subject
twice and the two scores differ. The named quantity is the **conditional standard error of
measurement (cSEM)** — the judge's precision **at the cut score**. It is a **measured property of
the instrument**, not a number doctrine decrees. A single global reliability figure (Cronbach's
alpha) is the wrong tool for a pass/fail decision: it averages precision across the whole scale,
and the only precision that decides a pass is the precision at the cut.

**So measure it, per suite.** Score your named wrong subjects **more than once** and record
whether the scores reproduce. `../../ssa-lowering/` is the node that does this and records the
result in its README — *"2.33/3 mean, measured twice, did not reproduce"* — and honestly flags that
its one-point slack is not evidence-backed.

**Copy that practice — the measuring and the honest record — and nothing else from it.** Its own
threshold convention (*the cut sits one point below the combined max*) is that node's **local
policy call**, not doctrine, and its design is not a template this bar blesses. A slack measured
against one suite's judge says nothing about yours. **This bar governs; where a node's design and
this bar disagree, this bar wins.**

Any constant offered in place of that measurement — *"not by a single point"*, `gap ≥ 2`,
`max ≥ b + 2` — is a guess at an instrument property nobody measured. Every such constant this bar
has carried was wrong, and each one's repair produced the next.

**Naming subjects orders them; it never separates them.** Scoring one wrong subject and one good
subject and putting the cut between them is a crude instance of **contrasting groups**, a real
standard-setting method that scores a known-fail **group** and a known-pass **group** and reads the
cut off where the **distributions** separate. At one subject per group there is no distribution, no
variance, and no intersection: two points establish an **ordering**, never a separation. The miss
test is a **sanity check** on a threshold you set as policy — it catches a cut that is plainly too
low. It never derives one.

### Selection and discrimination are judged, not linted

Both have **no deterministic form** and are deliberately not part of the mechanical pre-filter.
Whether a dimension is loseable depends on what the subject is, which no lexical probe reads; and
whether a criterion is substitutable is a **judgment about the domain** — it asks whether a trade
would be *accepted*, which is not a property of the rubric's text at all. Every attempt to derive
the selection rule from arithmetic over `max` and `threshold` values failed, because no arithmetic
over the scores can see it. A judge that cannot name a plausible wrong subject for a scenario, or
cannot say whether a dimension's trade is one it would accept, **escalates it rather than passing
it**.

A **measured ceiling is not evidence**. A dimension scoring max on every run with zero variance is a
**tell that it cannot be lost**, not a finding that the subject is good — re-run the miss test
rather than read the ceiling as a pass.

## Pairwise consistency — no two scenarios contradict on one snapshot

Every rule above reads one scenario at a time. This one reads **pairs**, and is the only bar that
does.

**Within one suite, no two scenarios may demand opposite verdicts on a single constructible
snapshot.**

`Given`s need not be disjoint — two scenarios may share a precondition when their `Then`s assert
different, compatible aspects of it. What is barred is an **overlap that yields contradictory
outcomes**.

The check: for each pair whose `Given`s are not obviously disjoint, ask whether one constructible
state satisfies **both**. If it does, their `Then`s must agree.

- **The `When` scopes it.** Two scenarios whose `When` names a different operation do not
  contradict — they describe different checks over the same state. A contradiction needs a shared
  `When` as well as an overlapping `Given`.
- **Specialization is not contradiction.** A **general** scenario and a **specific** sibling whose
  narrower `Given` carves out an exception do not contradict, even when the general `Given` does not
  literally exclude that exception — the specific scenario names the narrower case and **wins on
  it**. Read a pair as generic/specific before reading it as a contradiction: a contradiction is a
  pair with **no intended winner**, which is the `Conflict` floor's own definition. Stating the
  exclusion in the general `Given` is clearer and preferred when authoring fresh, but it is **not**
  required — and retrofitting it into an already-frozen scenario is a narrowing that fires
  **Clearance**, so the convention is what a frozen suite may legitimately rely on.
- **The remedy is a `Given`, not a `Then`.** Narrow one `Given` to exclude the overlap; reconcile
  the `Then`s only when both were genuinely meant to hold.

Boundary: the **`Conflict` hard floor** (`../../design/autonomy-rubric.md`) also covers a suite that
contradicts itself — but it fires at the **impl gate**, after the freeze, and carries no detector.
It is what a contradiction costs once it has escaped. This bar is the same defect read at
**authoring**, while a `Given` is still cheap to narrow; the floor stays the backstop.

Pairwise reading is judged, not linted. `../../project-spec/scenario-overlap/` fingerprints
*duplicate* scenarios *across nodes*; this is *contradiction* within *one* suite, and no mechanical
form stands in for it.

## A Given is a test vector, not specification

The `Then` is the **contract surface** — what the gate collapses to a boolean, and what an
implementation owes conformance to. A `Given` carries two separable things, and only one of them is
contract:

| The `Given` fixes | Status | The implementation |
|---|---|---|
| the **precondition** the `Then` is asserted under | **contract** | must handle it |
| the **apparatus** that makes the precondition concrete — domain, entities, names, framing | **test vector** | owes it nothing |

The apparatus is chosen to *probe* the rule, never to *illustrate* it. Freezing a suite freezes the
probes; it does not publish a set of examples any artifact must adopt.

**The swap test** settles which is which: substitute the `Given`'s domain for an unrelated one. If
the `Then` still holds unchanged, what you swapped was **apparatus**. If the `Then` stops making
sense, it was a **precondition**. Apply it per element — one `Given` routinely carries both
(`Given a mailer that retries on 500` in a scenario about lowering: `mailer` is apparatus, *that a
retry exists to lower* is the precondition). An element that survives the swap and still appears in
the artifact is absorbed, whatever it is called; the label a producer puts on it decides nothing.

### Choose probes the artifact would not choose for itself

A `Given` whose apparatus matches the artifact's own worked examples **grades nothing**: an artifact
that merely echoes its own illustration passes that scenario maximally, so the scenario cannot
discriminate a reasoner from a copier. It is **dead weight** — it counts toward the suite's nominal
size and adds nothing to its effective size.

- **Draw each probe from a domain the artifact does not illustrate**, and vary the apparatus when a
  scenario is re-authored.
- **On a `revise` or `backfill` CR the artifact already exists** — its worked examples sit in the
  producer's context. Never lift them into a `Given`.
- The bar is **entanglement, not direction**: a `Given` and an artifact illustration that share
  apparatus are dead weight whichever one was written first.

The mirror duty — the impl-producer must not lift a `Given`'s apparatus into the artifact — is
`../../mission/impl-producer/README.md`; detection at the impl gate is
`../../mission/impl-judge/README.md`.

### Probe independence is judged, not linted

The resolved spec-judge grades probe independence **semantically**, as a qualitative bar: it reads
each `Given`'s apparatus against the artifact's illustrations and asks whether the probe could
discriminate. It has **no deterministic form** and is deliberately **not** part of the mechanical
pre-filter below — a lexical or n-gram match both over- and under-fires. It flags legitimate
overlap (a `Feature` description and the artifact's description summarize the same capability —
both should) and misses paraphrase, which is how apparatus is usually lifted. A judge that cannot
classify a probe **escalates it rather than passing it**.

## Why a rubric, and why by-hand

A plain boolean rule is **un-self-modifiable** — you cannot safely edit a frozen thing.
A rubric rule **is** self-modifiable: a reversible, alignment-preserving, non-breaking edit self-clears against its own dimensions.
This is what lets SDD carry gradient rules (the autonomy bar, the freeze condition) and modify its own contracts without losing the boolean gate invariant.
Scoring is irreducibly human judgment and is judged **by hand**; the rubric form is self-contained and an automated regression harness (ACED) is a *tester*, not a prerequisite.

## Judging — structure is universal, scoring is per-resolved-judge

The domain's resolved spec-judge (default `sdd-spec-judge`) validates:

| Scenario type | What the judge validates |
|---|---|
| Untagged | **Boolean form:** every `Then` is a boolean assertion — no scores, probabilities, or rubric lingo. **Discrimination:** a plausible wrong subject exists that fails the scenario. |
| `@rubric`-tagged | **Structure (universal):** rubric block present with named dimensions + per-dimension `max` + exactly one `threshold`; collapsing `Then` present; no dimension double-barreled. **Selection:** every dimension is **substitutable** — a non-substitutable criterion belongs in a boolean `Then`, not in the sum. **Discrimination:** every dimension is loseable, and each named wrong subject's summed score sits **strictly under** the threshold. **Scoring (per-resolved-judge):** reads the rubric, scores each dimension, applies the threshold, emits pass/fail. |
| Every pair | **Pairwise consistency:** no two scenarios sharing a `When` demand opposite verdicts on one constructible snapshot. |

**Structure, selection, and discrimination are distinct checks.** Passing one settles nothing about
the others: a well-formed `@rubric` may still sum a criterion that should never have been in the
sum, and a **substitutable** dimension may still be one no wrong subject can lose. Structure is
checked first because a malformed rubric cannot be reasoned about at all; selection before
discrimination, because a criterion that leaves the sum needs no discrimination analysis. Well-formed
is never acceptance.

The structural check is **universal** — every resolved judge enforces it identically.
Scoring capability is **per-resolved-judge**: the default does baseline by-hand scoring; a plugin may supply a more capable judge (e.g. ACED for agent-config domains).
A resolved judge does **not** reject scoring lingo *inside* a `@rubric` scenario — that is the sanctioned form — and it rejects a malformed `@rubric` scenario (missing threshold or named dimensions) structurally, before scoring begins.

## Mechanical enforcement (the executable form)

The universal structural rules above — Gherkin validity, every untagged `Then` a boolean assertion (no hedge adverbs, no leaked rubric lingo), `Scenario Outline` Examples-table coverage, and scenario sectioning — have a deterministic **executable form** that runs as a mechanical pre-filter at two runtime touchpoints, not only in CI:

- The **spec-producer** self-runs it after authoring a `.feature` and fixes any violation before returning (`../spec-producer/README.md`), so a mechanical defect never costs a cold-judge round.
- The **spec gate** runs it **fail-closed over the CR's touched `.feature` files, before the cold judge is spawned** (`../spec-gate/README.md`), so the qualitative judge only ever sees well-formed suites.

A tree-wide sweep stays a CI backstop. The mechanical check settles the form; the resolved judge spends its rounds on the qualitative bars (discrimination, pairwise consistency, probe independence, coverage, scope, fit), never on catching a hedge word.

The mechanical form covers **form only**. Selection, discrimination, and pairwise consistency are **not** in it and are not candidates for it — a lexical probe cannot read whether a dimension is loseable, nor whether its trade is one anybody would accept, and a suite that passes every mechanical rule is exactly the shape these defects take.

**The qualitative self-run — same lenses the cold judge will apply.** A green mechanical check is the floor, not the finish. Before returning, the spec-producer self-runs the same qualitative lenses the cold judge will, so a qualitative defect never costs a judge round any more than a mechanical one does: **miss test** every scenario (including the toothless-finding and process-`Then` shapes); **SRP + observability** — each `Then` observable, the name covering every `Then`, no scenario duplicating another's `When`+`Then` core; **coverage + mirror** — every outcome the node's `## Use Cases` / README states (including every carve-out named only in prose) has a scenario, and a mirrored duty (producer/judge, sender/receiver) is specified on **both** sides. The cold judge stays the independent backstop; this pass keeps it from spending rounds on what the producer could see itself. (`../spec-producer/README.md` carries the producer-side duty.)

## Prohibition

The baseline rule "no rubric in the `.feature`" is relaxed to **"no rubric in an *untagged* scenario."**
Rubric form is legal only inside a `@rubric`-tagged scenario; the tag is the guard that keeps the boolean gate contract intact for everything else.

## Optional conventions — layer tags and enumerated cases

Both are **additive** and plugin-facing (e.g. ACED for agent-config domains); untagged, plain suites are unaffected and the mechanical check ignores tags it does not recognize.

- **Layer tags** — tag a scenario with the evaluation layer a resolved judge routes it through: `@trigger`, `@behavior`, `@quality`. Orthogonal to `@rubric` (a scenario may carry both, e.g. `@behavior @rubric`). The tag is metadata; it never changes the one-boolean-per-scenario contract.
- **Enumerated cases — `Scenario Outline` is a rare exception, not a default.** Default to specific scenarios (**DAMP over DRY**). An Outline forces one uniform `Given/When/Then` shape, so it is legitimate **only** for a genuinely uniform enumerated set — one varying token, every row the same `Then` shape (e.g. a trigger-query corpus of `{ query, should_trigger }`). The tell it is wrong: **two example rows that want different `Then`s are two scenarios, not one Outline.** When the uniform case applies, use a `Scenario Outline` with an `Examples:` table — one row per case, `<placeholder>` tokens bound to columns. The mechanical check requires a non-empty `Examples:` table whose header covers every `<placeholder>` used in the steps; a bare outline with no table (or a table missing a placeholder's column) is a structural failure.

```gherkin
@trigger
Scenario Outline: the config activates on a matching query
  Given a user query "<query>"
  When the agent decides whether to invoke the config
  Then invocation is "<should_trigger>"

  Examples:
    | query        | should_trigger |
    | make a chart | yes            |
    | book a flight| no             |
```

## Scenario ordering (step-down)

Order scenarios to trace the workflow top-to-bottom:

- Each lifecycle stage in sequence; within a stage, happy path first, then its branches and errors.
- Group each stage under a `# ── <stage> ──` section comment, so a human reading top-to-bottom can see every stage is covered — completeness becomes auditable.
- A `@rubric` scenario sorts into its stage like any other.

## The `@frozen` marker

Freeze is **per `.feature` file**: a frozen suite file carries a feature-level **`@frozen` tag**. The tag is metadata, **excluded from the contract content** the freeze protects — toggling it is not a scenario edit. How scenario edits interact with a frozen file:

- An **additive** scenario folds into a frozen file without unfreezing it — it widens the contract, cannot break existing impl, and **self-clears**.
- A **pure move/rename** (`git mv`, zero content delta) **preserves the freeze** — a freeze protects the scenario content, not the file's path, so relocating a frozen node is not a scenario edit and is not gate-able.
- A **narrowing or rewriting** edit **unfreezes** the file; at the gate that fires **Clearance**.

Vocabulary is **freeze / unfreeze** — never lock/unlock (reserved for the concurrency layer). The freeze/unfreeze *model* — when freeze fires (the Draft → Approved gate), the unfreeze risk trigger, relocation preserving freeze, iteration economy — lives in `../../design/lifecycle-model.md`; this bar owns only the marker and the suite-edit rules above.

## References

- **A `Given` must be a scaffoldable state** — vague steps make step definitions *defensive*,
  accumulating conditions and flags, while two readers picture different fixtures from the same
  line; that is the impl-producer/impl-judge disagreement the bar exists to prevent, and a step
  definition needing conditionals is the tell that the step is wrong upstream.
  [Common Gherkin Mistakes](https://nextgenanalysts.co.uk/common-gherkin-mistakes-and-how-to-avoid-them-with-examples/)
- **A `Given` states what holds, never how it came to hold** — declarative over imperative, so a
  scenario survives implementation change.
  [Writing better Gherkin — Cucumber](https://cucumber.io/docs/bdd/better-gherkin/)
- **One condition per step, conjunctions split** — a step carrying two actions is not reusable, and
  reusability is what lets a step library accumulate instead of fragment.
  [BDD 101: Writing Good Gherkin](https://automationpanda.com/2017/01/30/bdd-101-writing-good-gherkin/)
  · [gherkin-best-practices](https://github.com/andredesousa/gherkin-best-practices)
- **One scenario, one behavior** — the cardinal rule behind one `When`/`Then` pair per scenario,
  which SDD sharpens to one **(path class, edge)** pair.
  [BDD 101: Writing Good Gherkin](https://automationpanda.com/2017/01/30/bdd-101-writing-good-gherkin/)
