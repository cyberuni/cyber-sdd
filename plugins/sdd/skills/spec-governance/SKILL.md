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
- **No rubric in the `.feature`.** Threshold, score, and rubric are the impl-judge's private evaluation detail — never written into a scenario. A non-deterministic subject still yields one boolean per scenario (`score ≥ threshold` collapses to pass/fail).
- **Coverage.** At least one happy-path and one error-case scenario per operation in the command surface; a `--json` scenario where the command supports `--json`.

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
