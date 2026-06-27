---
name: spec-governance
description: "Internal skill: SDD spec governance"
user-invocable: false
---

# SDD Spec Governance

These are the **universal** rules for writing an SDD spec; a domain's own criteria are additional, enforced by that domain's spec-judge.

A spec is two files: **`spec.md`** and a sibling **`.feature`**.

## `spec.md`

### Use Cases (required section)

Every `spec.md` carries a dedicated **`## Use Cases`** section. Open it with the frame the table cannot hold, then list the use cases:

- **Subject** — one line naming the territory being specified: the single subject these use cases all exercise.
- **Non-goals** — one line on what the spec deliberately excludes, wherever the boundary isn't self-evident (the table can only enumerate what the subject *does*).

A **use case** is an *entry-point* — coarse-grained, one per distinct way the subject is invoked:

| Column | Content |
|---|---|
| **Trigger** | the event or situation that sets the behavior off |
| **Inputs** | what the behavior receives when triggered |
| **Outcome** | what it produces |

Form is free — table, prose, or diagram — as long as trigger, inputs, and outcome are all present. **EARS** templates fit naturally (event-driven *"When `<trigger>`, the `<system>` shall `<response>`"*; unwanted-behavior *"If `<condition>`, then the `<system>` shall `<response>`"*); the table already carries the same trigger→outcome shape, so use whichever reads best per use case.

A use case is **not** a scenario. Two altitudes:

- A **use case** answers *"when, and with what, is this invoked?"* — and lives in `spec.md`.
- A **scenario** answers *"given this exact situation, does it do that — yes/no?"* — a boolean `Given`/`When`/`Then` assertion that lives in the `.feature`.

The relationship is **one-to-many**: each use case is verified by one-or-more scenarios (happy path, negative mirror, boundary). A scenario with no use case is an orphan test; a use case with no scenarios is unverified intent. The spec-producer writes the section and covers each use case with scenarios; the spec-judge checks the section exists and the mapping holds.

### Layout and enrichment

`spec.md` is a document a person reviews at the gate, so its legibility is part of the bar. The spec-producer **actively enriches** it — never a wall of prose:

- **Draw the picture.** Where a diagram carries the idea better than words (architecture, sequence, state, data flow, decision tree), include a fenced Mermaid (or equivalent) diagram.
- **Format for humans.** Clear heading hierarchy, tables for structured comparisons, short paragraphs, callouts for the load-bearing decisions.

Enrichment applies to `spec.md` only — the `.feature` stays plain boolean Gherkin.

## `.feature`

### Format bar

- **Valid Gherkin.** `Feature:` with `Scenario:` blocks in `Given` / `When` / `Then` / `And` form.
- **Boolean scenarios.** Every `Then` is a boolean assertion of observable behavior — the subject *does* X, not *does X sometimes*. No probabilities, no "usually".
- **Observable behavior only.** Assert outputs, exit codes, side effects, emitted events. Never internal state, function names, or implementation steps.
- **No rubric in an untagged scenario.** Rubric form — threshold, score, named dimensions — is legal only inside a `@rubric`-tagged scenario (see below). An untagged scenario's every `Then` stays a plain boolean assertion: no scores, no probabilities, no threshold lines.
- **Coverage.** At least one happy-path and one error-case scenario per operation in the command surface; a `--json` scenario where the command supports `--json`.

### Rubric scenarios (`@rubric`)

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

A subject whose verdict cannot be reduced to a single observable assertion belongs in `@rubric` form, not forced into a brittle boolean.

### Scenario ordering (step-down)

Order scenarios to trace the workflow top-to-bottom:

- Each lifecycle stage in sequence; within a stage, happy path first, then its branches and errors.
- Group each stage under a `# ── <stage> ──` section comment, so a human reading top-to-bottom can see every stage is covered — completeness becomes auditable.

## Spec granularity — keep a spec narrow enough to re-judge cheaply

A spec is re-judged **as a whole**: coverage, consistency, and ordering are global checks, so any change that re-opens a frozen spec — an altered scenario, a shifted use case — re-judges the entire `.feature`, not just the touched part. (A cosmetic prose fix that doesn't touch behavior never re-opens the spec, so it stays free at any size.) Re-judge cost therefore scales with spec size, not change size — a large spec makes every *behavioral* revision expensive. Keep each spec **narrow**.

A spec is about one **subject** — a coherent territory that persists — surfaced by one set of use cases. Keep that territory narrow; split it when any of these holds:

- the `.feature` exceeds **~15–20 scenarios**, or
- the `## Use Cases` table spans **more than one distinct concern** (e.g. "resolution" *and* "dispatch" *and* "gate assessment"), or
- different parts of the spec change on **independent cadences** (one area churns while the rest is stable).

Decompose using the composition primitives in `lifecycle-governance`: a **project spec** with **feature children** (`subtasks`), or sibling specs linked by `blocked-by`. Each child owns one behavior, one `.feature`, and is judged independently — so a change touches one small spec, not a monolith. Prefer **narrow and composable** over one large spec, the same principle skills follow. (The `split-spec` operation is the gateway station that performs this; until it exists, splitting is manual — see the gateway's *Manage specs & graph*.)
