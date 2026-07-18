# Rubric form and judgment

For scenarios where behavior is a **gradient judgment** — "good enough across several dimensions" — that cannot be faithfully encoded in a single flat boolean assertion, use the rubric form. This document covers the full rubric-form lifecycle: how to author `@rubric` scenarios, decide which criteria belong in the sum, set thresholds, correct standing rubrics, and judge whether a rubric discriminates.

## Form 2 — rubric Gherkin (`@rubric`, judged by hand)

A gradient judgment ("good enough across several dimensions") cannot be faithfully encoded in a
single flat boolean. The rubric form admits scoring criteria into the scenario and collapses them
to one boolean, preserving the gate contract. It is **purely additive** — it never changes how
untagged scenarios work. Convention:

1. **Tag** the scenario `@rubric`.
2. **Embed the rubric** in a `Then` step as a docstring (`"""..."""`) — named dimensions, each with
   a `max:` value, plus exactly one `threshold:` line.
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

The final `Then` yields exactly one boolean — the gate sees pass/fail, not a score. The rubric is
internal evaluation detail, judged **by hand**.

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

The two forms (Form 1 and Form 2) are not *simple* vs *complex*. They are **non-substitutable** vs **substitutable**,
and this is the rule that decides which form a criterion goes in.

A rubric that sums N dimensions against one threshold is a **compensatory** model: a high score on
one dimension **compensates** for a low score on another. That is the form's purpose and its one
documented cost — a subject that wholly fails one dimension can still pass by banking points
elsewhere. The term is **compensation**; the bad pass it produces is a **false positive
classification error**. It attaches to the **aggregation** — to the act of summing — and no
judgment method, judge quality, or threshold arithmetic touches it.

Compensation is legitimate only where the dimensions are **substitutable**: where you genuinely
accept that strength on one may pay for weakness on another.

> Knowing how to read English really well should not compensate for the lack of ability to speak
> English.

**The selection rule: a criterion belongs in a `@rubric` only if you accept that strength elsewhere
may pay for weakness here.** If you do not accept that trade, the criterion is not in the sum at
all — it is a boolean `Then` (Form 1, documented in the main governance file).

**Select before you author.** This is a decision about where a criterion **goes**, made while you are
writing it — not a pass that strips dimensions out of a rubric afterwards. A non-substitutable
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
earned elsewhere. One scenario routinely carries both forms — its rules as boolean `Then`s, its one
genuine gradient as a `@rubric`. Keeping a criterion out of the sum does not weaken the scenario: the
rule fails the subject outright instead of being priced.

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
adds a per-dimension minimum each must clear. That is a worse instrument, not a safer one — the
**least-reliable subscore controls the outcome**, and it buys its fewer false passes with more
**false negative classification errors**. Per-dimension hurdles are not a safe default; do not reach
for them. Substitutability makes the opposite move: a non-substitutable criterion does not become a
graded subscore with a floor under it, it **never enters the rubric at all** and is asserted as a
boolean instead. Nothing is graded, so no subscore's reliability controls anything.

## The threshold is a policy call, not a derived one

Where the cut sits is decided by the **relative cost of a false positive (a wrong subject that
passes) against a false negative (a good subject that fails)** — a values decision the spec owner
makes on purpose. **It is not computable from the data.** Putting the cut where two subjects' scores
meet minimizes total error *only* when a false pass and a false fail cost the same and the two kinds
of subject are about equally likely — a claim about your domain, never a default to inherit by
arithmetic.

**Record why.** A `threshold:` line with no recorded reason is an unowned policy. Next to the rubric
or in the node's spec body, name which error the cut buys down and what it costs — *"a false pass
ships a broken contract and a false fail costs one more authoring round, so the cut sits high."*

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

A correction to a `@frozen` suite **routes to Clearance** (one of the four C's hard floors, defined
in `plugins/sdd/README.md`) and takes the owner's ratification. **One ratification per rubric.** A blanket approval over a batch is not a
faster path to the same place: it collapses N individual policy calls into **one unexamined one**,
which is the very thing the duty exists to prevent. Correct the corpus as a **queue** — each item
carrying its own re-derived cut and that cut's recorded reason — never as one sweep.

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

- **Escalation does not reach it.** The escalate trigger keys on a judge's **inability** to
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
`threshold` and **per-dimension hurdles** (above). A reader who reaches for either is solving a different problem.

## Rubric-specific discrimination: loseable in arithmetic ≠ loseable in practice

Per named wrong subject, **sum what it scores; the sum sits strictly under the threshold**.
Strictly: the collapsing `Then` passes a score *at least* the threshold, so a wrong subject that
**ties** the threshold **passes**. A rubric whose free dimensions alone carry a wrong subject to the
threshold leaves its discriminating dimensions decorative.

> `[live 3] [restatement 3] [presence 2]`, `threshold: 6`. A memorizer banks `3+2=5` on
> `restatement` and `presence` without engaging `live` at all. Those two are free — a memorizer maxes
> both — so each fails the miss test on its own and is rewritten. The defect is the two decorative
> dimensions, not the distance from 5 to 6.

**Score each wrong subject at what it banks — never zero a dimension to make a point.** A wrong
subject scores each dimension at what that dimension's own rules award it, which for a memorizer on
a live dimension is rarely 0. Zeroing one dimension in turn and asking whether the rubric still
passes is **not** this test: it posits a subject right about everything except one thing — a
blemished **good** subject, precisely the strawman the miss test bars. A score profile does not
identify a subject: `[3, 0, 3]` is the memorizer's profile *and* a good-but-flawed subject's, and
they are not the same subject.

## The margin is measured, not decreed

**How far under the threshold a wrong subject must land is not a constant this bar can give you.**
That distance is only meaningful against the **noise of your own judge** — score the same subject
twice and the scores differ. The named quantity is the **conditional standard error of measurement
(cSEM)**: the judge's precision **at the cut score**, a **measured property of the instrument**, not
a number doctrine decrees. A single global reliability figure (Cronbach's alpha) is the wrong tool
for a pass/fail decision — it averages precision across the whole scale, and the only precision that
decides a pass is the precision at the cut.

**So measure it, per suite.** Score your named wrong subjects **more than once** and record whether
the scores reproduce. The one node in this corpus whose rubrics conform records exactly this in its
README — *"2.33/3 mean, measured twice, did not reproduce"* — and honestly flags that its one-point
slack is not evidence-backed.

**Copy that practice — the measuring and the honest record — and nothing else from it.** That node's
own threshold convention is its **local policy call**, not doctrine, and its design is not a template
this bar blesses. A slack measured against one suite's judge says nothing about yours. **The main
governance file says: where a node's design and this bar disagree, this bar wins.**

Any constant offered in place of that measurement — *"not by a single point"*, `gap ≥ 2`,
`max ≥ b + 2` — is a guess at an instrument property nobody measured. Every such constant this bar
has carried was wrong, and each one's repair produced the next.

**Naming subjects orders them; it never separates them.** Scoring one wrong subject and one good
subject and putting the cut between them is a crude instance of **contrasting groups** — a real
standard-setting method that scores a known-fail **group** and a known-pass **group** and reads the
cut off where the **distributions** separate. At one subject per group there is no distribution, no
variance, no intersection: two points establish an **ordering**, never a separation. The miss test is
a **sanity check** on a threshold you set as policy — it catches a cut that is plainly too low. It
never derives one.
