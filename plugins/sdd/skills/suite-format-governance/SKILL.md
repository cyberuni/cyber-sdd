---
name: suite-format-governance
description: "Partial Skill: invoke by name only"
user-invocable: false
---

# Suite-Format Governance — the .feature behavior-suite bar

How a `.feature` behavior suite is **written and judged**. A fixed-universal SDD governance — the
spec-producer loads it to self-align before writing scenarios, and the spec-judge loads it to grade
the suite backward at the spec gate. It governs the `.feature` of a **behavioral** spec only;
descriptive and reference nodes carry no suite.

Boundary: the `spec.md` structure (the required `## Use Cases` section and enrichment) belongs to
`sdd:spec-format-governance`; the freeze/unfreeze *model* — when freeze fires, the unfreeze trigger,
and how iteration cost is weighed — belongs to the SDD lifecycle bar. This governance owns the
`.feature` form.

## The gate sees one boolean per scenario

Every scenario collapses to a single **pass/fail** at the verification point — the judge reports
one boolean per frozen scenario, never a score. Two forms reach that boolean.

## Test levels — the `.feature` is acceptance/boundary only

A `.feature` carries **acceptance / boundary** scenarios: each asserts one intent at the boundary.
It is **not** the home for inner-rule combinatorics — the truth tables and matrices a rule composes
(five reference-forms × each verb, an `ignore` matrix, byte-identity semantics). An acceptance suite
structurally **cannot** exhaustively cover a combinatorial space, so a suite that tries churns
without end.

- **Boundary level.** Author each scenario at the **inner** boundary — the DIP seam, mocking the
  external dependency behind its interface — not an outer boundary (a spawned subprocess, the real
  service). The outer boundary is warranted **only when the integration itself is the behavior under
  test** — the wiring, protocol, or process boundary is what the intent asserts, not an implementation
  detail reachable behind a mockable seam. A single external dependency behind an interface is mocked,
  never spawned.
- **Combinatorics move down to unit tests** owned by the **impl-producer**
  (`sdd:impl-producer-governance`): given the frozen acceptance `.feature`, it authors the inner-rule
  unit tests (plain project tests), each rule covered once, cheaply, exhaustively — cases drawn from
  the rules, never by enumerating the frozen scenarios.
- **The impl gate checks both levels** and **never demands the `.feature` enumerate a combinatorial
  space** (`sdd:impl-judge` two-level check).
- **No deterministic inner layer, no offload.** A graded non-deterministic subject (agent config)
  has nothing to push combinatorics down to; its graded behavior stays at the boundary and `@rubric`
  absorbs the space (a plugin domain, e.g. ACED).

See ADR-0028 for the churn analysis and the worked example.

## The suite screams the intents

Organize a suite's scenario **sections by use-case / intent**, front and center — the same law
`../../design/spec-structure.md` enforces on the node tree (screaming architecture; no `src/utils/`).
Sections named by **layer**, **output format**, or **"misc rules"** are a **placement defect**: a
suite that screams plumbing rather than domain intents is a poorly-abstracted architecture that will
churn, and the implementation inherits the smear. Give each intent a single section where its
acceptance coverage is meant to be complete.

## One behavior per scenario — SRP and dedup

One behavior per scenario; one canonical scenario per behavior. A scenario with several unrelated
`Then`s churns whenever any of them changes and its name starts to lie — split it. Two scenarios
sharing a `When`+`Then` core are a duplicate that will drift into a contradiction — dedup to the
canonical one. SRP is what makes per-scenario pass/fail meaningful and dedup mechanically checkable.

## Form 1 — pure-boolean Gherkin (default)

A plain `Given / When / Then` scenario whose every `Then` is an **observable, deterministic boolean
assertion** — no scores, probabilities, or rubric lingo. Assert outputs, exit codes, side effects,
emitted events — never internal state, function names, or implementation steps. Use it whenever the
behavior is directly checkable. Cover at least one happy-path and one error-case per operation.

A `Then` asserts the **artifact's end-state or observable behavior**, never the **production process**
that made it. "co-developed with the code", "written test-first", "refactored before completing",
"authored in this order" are unobservable — nothing in the artifact or a run reveals the authoring
sequence — so they cannot be a `Then`. Rewrite such a `Then` to assert the artifact's observable
behavior or end-state instead; production discipline belongs in governance prose, not a scenario.

## Form 2 — rubric Gherkin (`@rubric`, judged by hand)

For scenarios where behavior is a **gradient judgment** — "good enough across several dimensions" —
that cannot be faithfully encoded in a single flat boolean assertion, use the rubric form. Before
authoring any scenario whose behavior is not a single deterministic boolean, or when judging a
frozen suite containing `@rubric` scenarios, load `references/rubric.md` for the full guidance on
rubric doctrine: how to decide which criteria belong in the sum, set thresholds, correct standing
rubrics, and judge whether a rubric discriminates. 

This main governance file keeps rubric form's definition and the load trigger here; the detailed
guidance — substitutability test, threshold policy, correcting standing rubrics, cSEM measurement —
lives in the reference.

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
- **Toothless finding** — a `Then` asserts a signal is *raised* (a finding, flag, error, blocker) but
  not its **binding consequence** (it withholds the pass, blocks the gate, changes the outcome). The
  wrong subject raises the signal and acts on nothing — emission is trivial, the consequence is the
  behavior under test. When a scenario asserts a finding, it asserts the finding's teeth.

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

For the rubric-specific discrimination guidance on "loseable in arithmetic ≠ loseable in practice"
and the measured-margin rule (cSEM), see `references/rubric.md`.

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

Boundary: the **`Conflict` hard floor** (one of the four C's defined in `plugins/sdd/README.md`) covers a
self-contradicting suite at the **impl gate**, post-freeze, with no detector — it is what an escaped
contradiction costs. This bar reads the same defect at **authoring**, while a `Given` is cheap to
narrow; the floor stays the backstop.

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
| `@rubric`-tagged | **Structure (universal):** rubric block present with named dimensions + per-dimension `max` + exactly one `threshold`; collapsing `Then` present; no dimension double-barreled. **Selection & Discrimination:** see `references/rubric.md` for full guidance on substitutability, threshold policy, and discrimination details. **Scoring (per-resolved-judge):** reads the rubric, scores each dimension, applies the threshold, emits pass/fail. |
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
- **Enumerated cases — `Scenario Outline` is a rare exception, not a default.** Default to specific
  scenarios (**DAMP over DRY**). An Outline forces one uniform `Given/When/Then` shape, so it is
  legitimate **only** for a genuinely uniform enumerated set — one varying token, every row the same
  `Then` shape (e.g. a trigger-query corpus of `{ query, should_trigger }`). The tell that an Outline
  is wrong: **two example rows that want different `Then`s are two scenarios, not one Outline** —
  reaching for a second `Then` shape or an extra `Given` per row means the set is not uniform and the
  abstraction is hiding it. When the uniform case does apply, use a `Scenario Outline` with an
  `Examples:` table — one row per case, `<placeholder>` tokens bound to columns:

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

### The qualitative self-run — same lenses the cold judge will apply

A green `check-suite` is the floor, not the finish. **Before returning, the spec-producer self-runs
the same qualitative lenses the cold judge will**, so a qualitative defect never costs a judge round
any more than a mechanical one does:

- **Miss test** every scenario (and every `@rubric` dimension) — name a plausible wrong subject and
  check it loses, including the toothless-finding and process-`Then` shapes above.
- **SRP + observability** — each `Then` is observable from the artifact, the scenario name covers
  **every** `Then`, and no scenario duplicates another's `When`+`Then` core.
- **Coverage + mirror** — every outcome the node's `## Use Cases` / README states, **including every
  carve-out or exception named only in prose**, has at least one scenario; and a **mirrored duty** (a
  producer/judge, sender/receiver, request/response pair) is specified on **both** sides — a behavior
  on one node implies its mirror on the other.

The cold judge stays the independent backstop; this pass keeps it from spending rounds on what the
producer could see itself.

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

Vocabulary is **freeze / unfreeze** — never lock/unlock (reserved for the concurrency layer). The
freeze/unfreeze model, its risk trigger, and iteration cost are defined in the SDD lifecycle bar;
this governance owns only the marker and the suite-edit rule above.
