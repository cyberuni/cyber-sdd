# Suite style

How behavior-suite scenarios are written and judged. The style applies uniformly to both the
e2e scenarios in `acceptance/` and the unit scenarios colocated with their capability folder
(see `unit-and-organization.md`) — one corpus, one convention.

## The gate sees one boolean per scenario

Every scenario collapses to a single **pass/fail** at the verification point. This is the
contract the rest of the pipeline depends on: the judge reports one boolean per frozen
scenario, never a score. Two forms reach that boolean.

## Form 1 — pure-boolean Gherkin (default)

A plain `Given / When / Then` scenario whose every `Then` is an observable, deterministic
boolean assertion — no scores, probabilities, or rubric lingo. This is the default and is
unchanged from baseline SDD. Use it whenever the behavior is directly checkable.

## Form 2 — rubric Gherkin (`@rubric`, judged by hand)

A gradient judgment cannot be faithfully encoded in a single flat boolean ("structurally
fit" is too coarse to express "reversible AND alignment-preserving AND non-breaking"). The
rubric form admits scoring criteria into the scenario and then collapses them to one boolean,
preserving the gate contract. Rubric form is **purely additive**; it never changes how
untagged scenarios work.

Convention:

1. **Tag** the scenario `@rubric`.
2. **Embed the rubric** in a `Then` step as a docstring (`"""..."""`) — named dimensions, each
   with a `max:` value, plus exactly one `threshold:` line.
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

The final `Then` yields exactly one boolean — the gate sees pass/fail, not a score. The rubric
is internal evaluation detail.

## Why a rubric, and why by-hand

A plain boolean rule is **un-self-modifiable** — you cannot safely edit a frozen thing. A
rubric rule **is** self-modifiable: a reversible, alignment-preserving, non-breaking edit
self-clears against its own dimensions. This is what lets SDD carry gradient rules (the
autonomy bar, the freeze condition) and modify its own contracts without losing the boolean
gate invariant. Scoring is irreducibly human judgment and is judged **by hand**; the rubric
form is self-contained and an automated regression harness (ACES) is a *tester*, not a
prerequisite.

## Judging — structure is universal, scoring is per-resolved-judge

The domain's resolved spec-judge (default `sdd-spec-judge`) validates:

| Scenario type | What the judge validates |
|---|---|
| Untagged | Every `Then` is a boolean assertion — no scores, probabilities, or rubric lingo. |
| `@rubric`-tagged | **Structure (universal):** rubric block present with named dimensions + per-dimension `max` + exactly one `threshold`; collapsing `Then` present. **Scoring (per-resolved-judge):** reads the rubric, scores each dimension, applies the threshold, emits pass/fail. |

The structural check is **universal** — every resolved judge enforces it identically. Scoring
capability is **per-resolved-judge**: the default does baseline by-hand scoring; a plugin may
supply a more capable judge (e.g. ACES for agent-config domains). A resolved judge does **not**
reject scoring lingo *inside* a `@rubric` scenario — that is the sanctioned form — and it
rejects a malformed `@rubric` scenario (missing threshold or named dimensions) structurally,
before scoring begins.

## Prohibition

The baseline rule "no rubric in the `.feature`" is relaxed to **"no rubric in an *untagged*
scenario."** Rubric form is legal only inside a `@rubric`-tagged scenario; the tag is the
guard that keeps the boolean gate contract intact for everything else. Scenario ordering
(step-down by lifecycle stage) is unchanged — a `@rubric` scenario sorts into its stage like
any other.
