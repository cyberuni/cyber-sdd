---
spec-type: reference
concept: spec-authoring
---

# suite-format — the .feature behavior-suite bar

A **reference artifact**: the `suite-format` governance — how behavior-suite scenarios are *written and judged*. Loaded by the spec-producer (self-align) and the spec-judge (verify); it owns no `.feature` of its own, and its conformance shows up in the spec-judge's verdict on real suites.

## Subject

- **Artifact** — the `suite-format` governance, shipped as the `suite-format-governance` skill (a fixed-universal SDD governance; `../../design/governance-resolution.md`).
- **Contract surface** — every `.feature` in any SDD project: its Gherkin form, the `@rubric` exception, scenario ordering, and the `@frozen` marker.
- **Conformance** — verified by the **spec-judge** at the spec gate. A reference artifact carries this `## Subject` in place of a `## Use Cases` section and a `.feature`.
- **Boundary** — the `spec.md` structure (the required `## Use Cases` section, enrichment) belongs to `../spec-format/`; the freeze/unfreeze *model* (triggers, the gate, iteration economy) belongs to `../../design/lifecycle-model.md`. This bar owns the `.feature` form.

This bar governs the `.feature` of a **behavioral** spec only — `descriptive` and `reference` nodes carry no suite (see the spec types in `../../design/spec-structure.md`).
It applies uniformly to both the e2e scenarios in `../../acceptance/` and the unit scenarios colocated with their capability folder — one project-spec, one convention.

## The gate sees one boolean per scenario

Every scenario collapses to a single **pass/fail** at the verification point.
This is the contract the rest of the pipeline depends on: the judge reports one boolean per frozen scenario, never a score.
Two forms reach that boolean.

## Form 1 — pure-boolean Gherkin (default)

A plain `Given / When / Then` scenario whose every `Then` is an observable, deterministic boolean assertion — no scores, probabilities, or rubric lingo.
This is the default and is unchanged from baseline SDD.
Use it whenever the behavior is directly checkable.

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

## Why a rubric, and why by-hand

A plain boolean rule is **un-self-modifiable** — you cannot safely edit a frozen thing.
A rubric rule **is** self-modifiable: a reversible, alignment-preserving, non-breaking edit self-clears against its own dimensions.
This is what lets SDD carry gradient rules (the autonomy bar, the freeze condition) and modify its own contracts without losing the boolean gate invariant.
Scoring is irreducibly human judgment and is judged **by hand**; the rubric form is self-contained and an automated regression harness (ACES) is a *tester*, not a prerequisite.

## Judging — structure is universal, scoring is per-resolved-judge

The domain's resolved spec-judge (default `sdd-spec-judge`) validates:

| Scenario type | What the judge validates |
|---|---|
| Untagged | Every `Then` is a boolean assertion — no scores, probabilities, or rubric lingo. |
| `@rubric`-tagged | **Structure (universal):** rubric block present with named dimensions + per-dimension `max` + exactly one `threshold`; collapsing `Then` present. **Scoring (per-resolved-judge):** reads the rubric, scores each dimension, applies the threshold, emits pass/fail. |

The structural check is **universal** — every resolved judge enforces it identically.
Scoring capability is **per-resolved-judge**: the default does baseline by-hand scoring; a plugin may supply a more capable judge (e.g. ACES for agent-config domains).
A resolved judge does **not** reject scoring lingo *inside* a `@rubric` scenario — that is the sanctioned form — and it rejects a malformed `@rubric` scenario (missing threshold or named dimensions) structurally, before scoring begins.

## Mechanical enforcement (the executable form)

The universal structural rules above — Gherkin validity, every untagged `Then` a boolean assertion (no hedge adverbs, no leaked rubric lingo), and scenario sectioning — have a deterministic **executable form** that runs as a mechanical pre-filter at two runtime touchpoints, not only in CI:

- The **spec-producer** self-runs it after authoring a `.feature` and fixes any violation before returning (`../spec-producer/README.md`), so a mechanical defect never costs a cold-judge round.
- The **spec gate** runs it **fail-closed over the CR's touched `.feature` files, before the cold judge is spawned** (`../spec-gate/README.md`), so the qualitative judge only ever sees well-formed suites.

A tree-wide sweep stays a CI backstop. The mechanical check settles the form; the resolved judge spends its rounds on the qualitative bars (coverage, scope, fit), never on catching a hedge word.

## Prohibition

The baseline rule "no rubric in the `.feature`" is relaxed to **"no rubric in an *untagged* scenario."**
Rubric form is legal only inside a `@rubric`-tagged scenario; the tag is the guard that keeps the boolean gate contract intact for everything else.

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
