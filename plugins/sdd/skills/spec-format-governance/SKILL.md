---
name: spec-format-governance
description: "Internal skill: the SDD spec-format bar for spec.md structure. Loaded by the spec-producer and the spec-judge, not user-triggered."
user-invocable: false
---

# Spec-Format Governance — the spec.md structure bar

The **universal** bar for how a `spec.md` is *structured*: the required `## Use Cases` section and
the `spec.md` enrichment that keep a spec legible at the gate. A fixed-universal SDD governance —
the **spec-producer** loads it to self-align before writing, and the **spec-judge** loads it to
grade structure backward at the spec gate. It owns no `.feature`; its conformance shows up in the
judge's verdict on real specs.

Boundary: the `.feature` Gherkin/rubric form and scenario ordering belong to **`sdd:suite-format-governance`**;
spec *granularity* (when a spec grows too big → carve it into more folders/units) is a
corpus-organization concern. This bar owns only `spec.md` structure.

## The required `## Use Cases` section

Every **behavioral** spec node carries a dedicated `## Use Cases` section; a descriptive index or a
reference artifact carries none. Open it with the frame a table cannot hold, then list the use
cases:

- **Subject** — one line naming the territory the use cases all exercise.
- **Non-goals** — one line on what the spec deliberately excludes, wherever the boundary isn't
  self-evident.

A **use case** is an *entry-point* — coarse-grained, one per distinct way the subject is invoked —
given as **trigger / inputs / outcome** (a table, prose, or EARS templates; whichever reads best).
A use case is **not** a scenario: the use case answers *"when, and with what, is this invoked?"*
(in `spec.md`); a scenario answers *"given this exact situation, does it do that — yes/no?"* (in
the `.feature`).

The relationship is **one-to-many**: each use case is covered by one-or-more scenarios (happy path,
negative mirror, boundary). A scenario with no use case is an orphan test; a use case with no
scenarios is unverified intent. The producer writes the section and covers each use case with
scenarios; the judge checks the section exists and the mapping holds.

## Layout & enrichment

`spec.md` is a document a person reviews at the gate, so legibility is part of the bar. Enrich it —
never a wall of prose:

- **Draw the picture** where a diagram carries the idea better than words (architecture, sequence,
  state, data flow, decision tree) — a fenced Mermaid (or equivalent) diagram.
- **Format for humans** — clear heading hierarchy, tables for structured comparisons, short
  paragraphs, callouts for the load-bearing decisions.

Enrichment applies to `spec.md` only; the `.feature` stays plain boolean Gherkin (`sdd:suite-format-governance`).
