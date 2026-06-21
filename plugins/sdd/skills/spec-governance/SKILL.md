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
