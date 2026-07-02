---
name: suite-format-governance
description: "Internal skill: the SDD suite-format bar — how a .feature behavior suite is written and judged (boolean Gherkin, the @rubric exception, scenario ordering, the @frozen marker). Loaded by the spec-producer to self-align and the spec-judge to verify; the spec.md structure lives in sdd:spec-format-governance. Not triggered by users directly."
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

## Judging — structure is universal, scoring is per-resolved-judge

| Scenario type | What the judge validates |
|---|---|
| Untagged | Every `Then` is a boolean assertion — no scores, probabilities, or rubric lingo. |
| `@rubric`-tagged | **Structure (universal):** rubric block present with named dimensions + per-dimension `max` + exactly one `threshold`; collapsing `Then` present. **Scoring (per-resolved-judge):** reads the rubric, scores each dimension, applies the threshold, emits pass/fail. |

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
the resolved judge spends its rounds on the qualitative bars, never on catching a hedge word.

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
