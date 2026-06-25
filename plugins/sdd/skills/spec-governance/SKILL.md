---
name: spec-governance
description: "Internal skill: the universal SDD .feature format bar, scenario-ordering convention, and spec.md enrichment rule. Loaded by every spec-producer (SDD default and plugin) and by validate-spec — not triggered by users directly."
metadata:
  user-invocable: false
---

# SDD Spec Governance

Reference for writing SDD specs. Every spec-producer (the SDD default `sdd-scenario-writer` and plugin producers such as `aces-scenario-writer`, `quill-writer`) and the spec-judge load this. It holds the **universal** format rules; a domain's own criteria are additional, enforced by that domain's spec-judge.

## The `.feature` format bar

- **Valid Gherkin.** `Feature:` with `Scenario:` blocks in `Given` / `When` / `Then` / `And` form.
- **Boolean scenarios.** Every `Then` is a boolean assertion of observable behavior — the subject *does* X, not *does X sometimes*. No probabilities, no "usually".
- **Observable behavior only.** Assert outputs, exit codes, side effects, emitted events. Never internal state, function names, or implementation steps.
- **No rubric in an untagged scenario.** Rubric form — threshold, score, named dimensions — is legal only inside a `@rubric`-tagged scenario (see *Rubric scenarios* below). An untagged scenario's every `Then` remains a plain boolean assertion: no scores, no probabilities, no threshold lines.
- **Coverage.** At least one happy-path and one error-case scenario per operation in the command surface; a `--json` scenario where the command supports `--json`.

## Rubric scenarios (`@rubric`)

Most scenarios are pure boolean. A **gradient judgment** — where the honest verdict is "good enough across several dimensions", not a single observable yes/no — is admitted as a `@rubric`-tagged scenario. The rubric is internal evaluation detail; the scenario still delivers exactly **one boolean** to the gate, so the boolean gate contract is unchanged.

A rubric scenario is valid Gherkin. The convention:

1. **Tag** the scenario `@rubric`.
2. **Embed the rubric** in a `Then` step as a docstring (`"""..."""`) — named dimensions, each with a `max:` value, plus exactly one `threshold:` line.
3. **Close** with a boolean-collapsing `Then`: `Then the rubric score is at least the threshold`.

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

The final `Then` yields exactly one boolean — the gate sees pass/fail, not a score. The threshold, dimensions, and scoring are the resolved spec-judge's evaluation detail; the gate contract (one pass/fail per scenario) is identical to the untagged path. A subject whose verdict cannot be reduced to a single observable assertion belongs in `@rubric` form, not forced into a brittle boolean.

## Scenario ordering (step-down)

Order scenarios to trace the workflow top-to-bottom:

- Each lifecycle stage in sequence; within a stage, happy path first, then its branches and errors.
- Group each stage under a `# ── <stage> ──` section comment, so a human reading top-to-bottom can see every stage is covered — completeness becomes auditable.

This is enforced by the spec-judge; it is universal, not a per-domain criterion.

## `spec.md` enrichment and human-readability

The `spec.md` is a document a person reviews at the gate, so its legibility is part of the bar. The spec-producer **actively enriches** it — never a wall of prose:

- **Draw the picture.** Where a diagram carries the idea better than words (architecture, sequence, state, data flow, decision tree), include a fenced Mermaid (or equivalent) diagram.
- **Format for humans.** Clear heading hierarchy, tables for structured comparisons, short paragraphs, callouts for the load-bearing decisions.
- Enrichment applies to `spec.md` only — the `.feature` stays plain boolean Gherkin.

## The `## Use Cases` section (required in `spec.md`)

Every `spec.md` carries a dedicated **`## Use Cases`** section. A **use case** is an *entry-point*: who or what triggers the behavior, with what **inputs**, toward what outcome. Coarse-grained — one per distinct way the subject is invoked. List them as a table or per-use-case prose, each naming:

| Column | Content |
|---|---|
| **Trigger** | the event or situation that sets the behavior off |
| **Inputs** | what the behavior receives when triggered |
| **Outcome** | what it produces |

No single notation is mandated — the required *content* is the trigger, inputs, and outcome; the *form* is whatever communicates best (a table, prose, or a diagram). **EARS** templates are an encouraged tool where they fit: the event-driven *"When `<trigger>`, the `<system>` shall `<response>`"* and unwanted-behavior *"If `<condition>`, then the `<system>` shall `<response>`"* forms map cleanly onto a use case's trigger and outcome (EARS has no dedicated slot for inputs — carry those in the precondition or a column). Use the right tool for the use case; do not force one syntax on all of them.

This is distinct from a **scenario** — a *boolean assertion* (`Given`/`When`/`Then`, pass or fail) that lives in the **`.feature`**, asserting one observable behavior. Two altitudes:

- A use case answers *"when, and with what, is this invoked?"* — and lives in `spec.md`.
- A scenario answers *"given this exact situation, does it do that — yes/no?"* — and lives in the `.feature`.

The relationship is **one-to-many**: one use case is verified by one-or-more scenarios (happy path, negative mirror, boundary). A scenario with no use case is an orphan test; a use case with no scenarios is unverified intent. The spec-producer writes the `## Use Cases` section and covers each use case with scenarios; the spec-judge checks the section exists and the mapping holds.

## Spec granularity — keep a spec narrow enough to re-judge cheaply

A spec is re-judged **as a whole**: coverage, consistency, and ordering are global checks, so a one-line change to a frozen spec costs the same judging as the whole `.feature`. Re-judge cost scales with spec size, not change size. So a large spec makes every later revision expensive — keep each spec **narrow**.

A spec covers **one behavior with one set of use cases**. Split it when any of these holds:

- the `.feature` exceeds **~15–20 scenarios**, or
- the `## Use Cases` table spans **more than one distinct behavior** (e.g. "resolution" *and* "dispatch" *and* "gate assessment"), or
- different parts of the spec change on **independent cadences** (one area churns while the rest is stable).

Decompose using the composition primitives in `lifecycle-governance`: a **project spec** with **feature children** (`subtasks`), or sibling specs linked by `blocked-by`. Each child owns one behavior, one `.feature`, and is judged independently — so a change touches one small spec, not a monolith. Prefer **narrow and composable** over one large spec, the same principle skills follow. (The `split-spec` operation is the gateway station that performs this; until it exists, splitting is manual — see the gateway's *Manage specs & graph*.)
