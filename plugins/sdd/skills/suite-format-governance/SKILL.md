---
name: suite-format-governance
description: "Partial Skill: invoke by name only — the SDD suite-format bar for how a .feature behavior suite is written and judged. Loaded by the spec-producer and the spec-judge, and named by the impl-producer and impl-judge bars for the test-vector rule; not user-triggered."
user-invocable: false
---

# Suite-Format Governance — the .feature behavior-suite bar

How a `.feature` behavior suite is **written and judged**. A fixed-universal SDD governance — the
spec-producer loads it to self-align before writing scenarios, and the spec-judge loads it to grade
the suite backward at the spec gate. It governs the `.feature` of a **behavioral** spec only;
descriptive and reference nodes carry no suite.

Boundary: the `spec.md` structure (the required `## Use Cases` section and enrichment) belongs to
`sdd:spec-format-governance`; the freeze/unfreeze *model* (when freeze fires, the unfreeze trigger,
iteration economy) belongs to the SDD lifecycle bar. This governance owns the `.feature` form.

## The gate sees one boolean per scenario

Every scenario collapses to a single **pass/fail** at the verification point — the judge reports
one boolean per frozen scenario, never a score. Two forms reach that boolean.

## Form 1 — pure-boolean Gherkin (default)

A plain `Given / When / Then` scenario whose every `Then` is an **observable, deterministic boolean
assertion** — no scores, probabilities, or rubric lingo. Assert outputs, exit codes, side effects,
emitted events — never internal state, function names, or implementation steps. Use it whenever the
behavior is directly checkable. Cover at least one happy-path and one error-case per operation.

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

The two forms are not *simple* vs *complex*. They are **non-substitutable** vs **substitutable**,
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
all — it is a boolean `Then` (Form 1).

**Select before you author.** This is a decision about where a criterion **goes**, made while you are
writing it — not a pass that strips dimensions out of a rubric afterwards. A non-substitutable
criterion never becomes a dimension in the first place.

Where an **existing** suite already sums one, correcting it is a **mixed** edit, never a silent
strip — and it is not the simple deletion it looks like. It **adds** a boolean `Then` (strengthening
the contract) and it **forces the threshold to be re-derived**: strip a `max: 3` dimension out of
`[3, 3, 2] threshold: 6` and the surviving dimensions cannot reach 6 at all, so the cut must be
re-set, and re-setting it is a fresh **policy call** (below). A mixed edit routes to **Clearance**
like any other.

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

## A scenario must be able to register a miss

Well-formedness is **necessary and never sufficient**. A boolean `Then`, and a `@rubric` block with
named dimensions and a threshold, are both satisfied by a scenario no subject can fail. Form is what
the mechanical check settles; whether the scenario *grades* anything is this bar.

**Every scenario — and every `@rubric` dimension inside one — must be able to register a miss:** a
plausible wrong subject must exist that fails the scenario, or that scores below the dimension's
`max`. A scenario every plausible subject passes is **dead weight** — nominal suite size, zero
effective size, the same defect an absorbed probe carries.

### The miss test

**Name a plausible wrong subject; check that it loses.** If none exists, the scenario is inert —
rewrite it.

**Plausible, not strawman.** The wrong subject is one a competent-but-wrong producer could ship. An
empty artifact fails everything and clears nothing. Name these first:

| Wrong subject | Scores max on |
|---|---|
| **memorizer** — reproduces the doctrine's words without applying them | any dimension grading recall |
| **copier** — echoes the artifact's own worked examples | any probe sharing the artifact's apparatus |
| **procedure-follower** — executes the steps without the judgment | any dimension grading sequence |
| **single-brancher** — always takes the same branch | any scenario needing only that branch |

The **copier** is what the test-vector rule below bars; the miss test is the general form, and
absorption is one way to fail it.

### The three anti-patterns

Each names a `Then` or dimension **no** plausible wrong subject loses. Rewrite on sight:

- **Presence** — grades that a line, section, or artifact is *emitted*, where the subject's shape
  makes emission trivial. A dimension reading *"names the threshold"* is max for anything that read
  the doctrine.
- **Restatement** — grades reproducing the doctrine's own words. The memorizer scores max and the
  reasoner no higher: it measures reading and reports it as reasoning.
- **Procedural** — grades following the steps where the *judgment*, not the sequence, is under test.

### Loseable in arithmetic ≠ loseable in practice

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

### The margin is measured, not decreed

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
this bar blesses. A slack measured against one suite's judge says nothing about yours. **This bar
governs; where a node's design and this bar disagree, this bar wins.**

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

### Judged, not linted

Selection and discrimination both have no deterministic form, and neither is a candidate for one.
Whether a dimension is loseable depends on the subject, which no lexical probe reads; whether a
criterion is **substitutable** is a **judgment about the domain** — it asks whether a trade would be
*accepted*, which is not a property of the rubric's text at all. Every attempt to derive the
selection rule from arithmetic over `max` and `threshold` failed, because no arithmetic over the
scores can see it. `check-suite` checks neither. A judge that cannot name a plausible wrong subject
for a scenario, or cannot say whether a dimension's trade is one it would accept, **escalates it
rather than passing it**.

A **measured ceiling is not evidence**: a dimension scoring max on every run with zero variance is a
**tell that it cannot be lost**, not a finding that the subject is good. Re-run the miss test.

## Pairwise consistency — no two scenarios contradict on one snapshot

Every other rule reads one scenario. This one reads **pairs**.

**Within one suite, no two scenarios may demand opposite verdicts on a single constructible
snapshot.** `Given`s need not be disjoint — two scenarios may share a precondition when their
`Then`s assert different, compatible aspects. The bar is the **contradiction**, never the overlap.

For each pair whose `Given`s are not obviously disjoint: does one constructible state satisfy both?
If so, their `Then`s must agree.

- **The `When` scopes it** — different operations over the same state do not contradict. A
  contradiction needs a shared `When` *and* an overlapping `Given`.
- **Specialization is not contradiction.** A **general** scenario and a **specific** sibling whose
  narrower `Given` carves out an exception do not contradict, even when the general `Given` does not
  literally exclude that exception — the specific scenario names the narrower case and **wins on
  it**. Read a pair as generic/specific before reading it as a contradiction. A contradiction is a
  pair with **no intended winner** (the `Conflict` floor's own definition). Stating the exclusion in
  the general `Given` is clearer and preferred when you are authoring it fresh; it is **not**
  required, and retrofitting it into a frozen scenario is a narrowing that fires **Clearance**.
- **The remedy is a `Given`** — narrow it to exclude the overlap; reconcile `Then`s only when both
  were meant to hold.

Judged, not linted. `check-scenario-overlap` fingerprints *duplicate* scenarios *across nodes*; this
is *contradiction* within *one* suite.

Boundary: the **`Conflict` hard floor** covers a self-contradicting suite at the **impl gate**,
post-freeze, with no detector — it is what an escaped contradiction costs. This bar reads the same
defect at **authoring**, while a `Given` is cheap to narrow; the floor stays the backstop.

## A `Given` is a test vector, not specification

The implementation owes conformance to the `Then`. It owes nothing to the `Given`'s apparatus.

A `Given` fixes two separable things:

| Element | Status | Binds |
|---|---|---|
| **Precondition** — the state the `Then` is asserted under | contract | the implementation must handle it |
| **Apparatus** — the domain, entities, names, and framing that make the precondition concrete | test vector | nothing |

**The swap test** discriminates: substitute the `Given`'s domain for an unrelated one; if the `Then`
still holds, what was swapped is apparatus. Apply it **per element** — one `Given` routinely carries
both — and the producer's own label for an element decides nothing.

> A `Given` reads *"a purchase order whose shipping address is in a country the tax table does not
> list"*. Swap the domain — *"a sensor reading whose unit is absent from the conversion table"* — and
> the `Then` (*the operation halts and names the missing entry*) still holds. Purchase orders,
> addresses, and tax tables are **apparatus**; *a lookup key absent from its table* is the
> **precondition**. The implementation handles the missing key; it never ships purchase orders as its
> illustration.

**Absorption** is lifting apparatus into an artifact as a worked example, illustration, or
special-cased literal. An element that survives the swap test and still appears in the artifact is
absorbed. Both copying directions are barred:

- **spec-producer** — a `Given`'s apparatus is never lifted from the artifact's own worked examples
  (revise) or from the illustrations read out of source (backfill).
- **impl-producer** — an artifact's illustrations are never lifted from a `Given`; each is drawn from
  a domain the suite does not probe.

The rule constrains what a producer **quotes**, never what it **reads**: every producer reads the
whole `.feature`, `Given` steps included — the `.feature` is the contract, and no part of it is
excluded from the read.

A decoupled artifact — illustrations sharing no apparatus with any `Given` — is the **required end
state**, never drift to reconcile.

Independence is **judged, not linted** — semantic, not lexical. Apparatus is usually lifted by
paraphrase, so shared wording is neither necessary nor sufficient: shared wording between a `Feature`
description and the artifact's own description is not absorption, and a paraphrase sharing no wording
is. No lexical or n-gram probe stands in for the read; `check-suite` does not check it.

## Judging — structure is universal, scoring is per-resolved-judge

| Scenario type | What the judge validates |
|---|---|
| Untagged | **Boolean form:** every `Then` is a boolean assertion — no scores, probabilities, or rubric lingo. **Discrimination:** a plausible wrong subject exists that fails it. |
| `@rubric`-tagged | **Structure (universal):** rubric block present with named dimensions + per-dimension `max` + exactly one `threshold`; collapsing `Then` present; no dimension double-barreled. **Selection:** every dimension is **substitutable** — a non-substitutable criterion belongs in a boolean `Then`, not in the sum. **Discrimination:** every dimension is loseable, and each named wrong subject's summed score sits **strictly under** the threshold. **Scoring (per-resolved-judge):** reads the rubric, scores each dimension, applies the threshold, emits pass/fail. |
| Every pair | **Pairwise consistency:** no two scenarios sharing a `When` demand opposite verdicts on one constructible snapshot. |

**Structure, selection, and discrimination are distinct checks.** Passing one settles nothing about
the others: a well-formed `@rubric` may still sum a criterion that should never have been in the sum,
and a **substitutable** dimension may still be one no wrong subject can lose. Structure is checked
first (a malformed rubric cannot be reasoned about); selection before discrimination, because a
criterion that leaves the sum needs no discrimination analysis. **Well-formed is never acceptance.**

The structural check is **universal** — every resolved judge enforces it identically. A resolved
judge does **not** reject scoring lingo *inside* a `@rubric` scenario (the sanctioned form), and it
rejects a malformed `@rubric` scenario (missing threshold or named dimensions) structurally, before
scoring begins. A plugin may supply a more capable scoring judge (e.g. ACED for agent-config
domains).

## Optional conventions — layer tags and enumerated cases

Both are **additive** and plugin-facing (e.g. ACED for agent-config domains); untagged, plain suites
are unaffected and the structural check ignores tags it does not recognize.

- **Layer tags** — tag a scenario with the evaluation layer a resolved judge should route it through:
  `@trigger`, `@behavior`, `@quality`. Orthogonal to `@rubric` (a scenario may carry both, e.g.
  `@behavior @rubric`). The tag is metadata; it never changes the one-boolean-per-scenario contract.
- **Enumerated cases** — when one scenario is exercised over an enumerated set (e.g. a trigger-query
  corpus of `{ query, should_trigger }`), use a `Scenario Outline` with an `Examples:` table — one row
  per case, `<placeholder>` tokens bound to columns:

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

  `check-suite` requires a non-empty `Examples:` table whose header covers every `<placeholder>` used
  in the steps — a bare outline with no table (or a table missing a placeholder's column) is a
  structural failure.

## The executable form — `check-suite`

The universal structural rules above (Gherkin validity, every untagged `Then` a boolean assertion,
no hedge adverbs or leaked rubric lingo, `Scenario Outline` Examples-table coverage, scenario
sectioning) have a deterministic executable form:
the `check-suite` engine (`scripts/check-suite.mts` in the `spec-gate` skill). It runs at **two
per-CR runtime touchpoints**, not only in CI:

- The **spec-producer self-runs it** over the `.feature` it just authored (`--files <paths>`) and
  fixes any violation before returning — a mechanical defect never costs a cold-judge round.
- The **spec gate runs it fail-closed** over the CR's touched `.feature` files (`--files <paths>`),
  **before the cold judge is spawned**, so the qualitative judge only ever sees well-formed suites.

A tree-wide `--root` sweep stays the CI backstop. The mechanical check settles form deterministically;
the resolved judge spends its rounds on the qualitative bars — discrimination, pairwise consistency,
probe independence, coverage, scope, fit — never on catching a hedge word.

The executable form covers **form only**. Selection, discrimination, and pairwise consistency are
**not** in it and are not candidates for it: a suite that passes every mechanical rule is exactly the
shape these defects take, so a green `check-suite` never clears any of the three.

## Scenario ordering (step-down)

Order scenarios to trace the workflow top-to-bottom:

- Each lifecycle stage in sequence; within a stage, happy path first, then its branches and errors.
- Group each stage under a `# ── <stage> ──` section comment, so completeness is auditable.
- A `@rubric` scenario sorts into its stage like any other.

## The `@frozen` marker

Freeze is **per `.feature` file**: a frozen suite file carries a feature-level **`@frozen` tag**,
metadata **excluded from the contract content** the freeze protects (toggling it is not a scenario
edit).

- An **additive** scenario folds into a frozen file without unfreezing it — it widens the contract,
  cannot break existing impl, and **self-clears**.
- A **pure move/rename** (`git mv`, zero content delta) **preserves the freeze** — a freeze protects
  the scenario content, not the file's path, so relocating a frozen node is not a scenario edit and is
  not gate-able (the freeze/unfreeze model lives in the SDD lifecycle bar).
- A **narrowing or rewriting** edit **unfreezes** the file; at the gate that fires **Clearance**.

Vocabulary is **freeze / unfreeze** — never lock/unlock (reserved for the concurrency layer). When
freeze fires, the unfreeze risk trigger, and iteration economy live in the SDD lifecycle bar; this
governance owns only the marker and the suite-edit rule above.
