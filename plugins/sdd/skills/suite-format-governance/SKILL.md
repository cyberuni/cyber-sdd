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

Per named wrong subject, **sum what it scores; the sum sits under the threshold** — and not by a
single point of a single dimension. A floor that reaches threshold on the free dimensions alone
leaves the discriminating dimensions decorative.

> `[live 3] [restatement 3] [presence 2]`, `threshold: 6`. A memorizer banks `3+2=5` — one under, so
> loseable in arithmetic. One point of `live` carries it, so no memorizer ever fails. The rubric
> grades reading and reports it as reasoning.

### Judged, not linted

No deterministic form, and not a candidate for one — whether a dimension is loseable depends on the
subject, which no lexical probe reads. `check-suite` does not check it. A judge that cannot name a
plausible wrong subject for a scenario **escalates it rather than passing it**.

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
| `@rubric`-tagged | **Structure (universal):** rubric block present with named dimensions + per-dimension `max` + exactly one `threshold`; collapsing `Then` present. **Discrimination:** every dimension is loseable, and each named wrong subject's summed score sits under the threshold. **Scoring (per-resolved-judge):** reads the rubric, scores each dimension, applies the threshold, emits pass/fail. |
| Every pair | **Pairwise consistency:** no two scenarios sharing a `When` demand opposite verdicts on one constructible snapshot. |

**Structure and discrimination are distinct checks.** Structure is checked first (a malformed rubric
cannot be reasoned about); passing it settles nothing about discrimination. **Well-formed is never
acceptance.**

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

The executable form covers **form only**. Discrimination and pairwise consistency are **not** in it
and are not candidates for it: a suite that passes every mechanical rule is exactly the shape this
defect takes, so a green `check-suite` never clears either bar.

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
