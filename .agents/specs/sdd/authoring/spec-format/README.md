---
spec-type: reference
concept: spec-authoring
---

# spec-format — the spec.md structure bar

A **reference artifact**: the `spec-format` governance — the universal bar for how a `spec.md` is
*structured*. It is loaded by the spec-producer (self-align) and the spec-judge (verify), and owns
no `.feature`: its conformance is checked through the spec-judge's verdict on real specs, not
through a suite of its own.

## Subject

- **Artifact** — the `spec-format` governance, shipped as the `spec-format-governance` skill (a
  fixed-universal SDD governance; `../../design/governance-resolution.md`).
- **Contract surface** — every `spec.md` in any SDD project: the sections it must carry and how it
  is laid out for human review.
- **Conformance** — verified by the **spec-judge** at the spec gate (it applies this bar backward),
  never by this artifact itself. A reference artifact carries this `## Subject` in place of a
  `## Use Cases` section and a `.feature`.
- **Boundary** — the `.feature` Gherkin/rubric form and scenario ordering belong to `suite-format`;
  spec *granularity* (when a spec grows too big → carve it into more folders/units) belongs to
  `../../design/spec-structure.md`. This bar owns only `spec.md` structure.

## The required `## Use Cases` section

Every **behavioral** `spec.md` carries a dedicated `## Use Cases` section; a descriptive index or
a reference artifact carries none (`../../design/spec-structure.md`). Open it with the frame
a table cannot hold, then list the use cases:

- **Subject** — one line naming the territory these use cases all exercise.
- **Non-goals** — one line on what the spec deliberately excludes, wherever the boundary isn't
  self-evident.

A **use case** is an *entry-point* — coarse-grained, one per distinct way the subject is invoked —
given as **trigger / inputs / outcome** (a table, prose, or EARS templates; whichever reads best).
A use case is **not** a scenario: a use case answers *"when, and with what, is this invoked?"* and
lives in `spec.md`; a scenario answers *"given this exact situation, does it do that — yes/no?"*
and lives in the `.feature`.

The relationship is **one-to-many**: each use case is covered by one-or-more scenarios (happy path,
negative mirror, boundary). A scenario with no use case is an orphan test; a use case with no
scenarios is unverified intent. The spec-producer writes the section and covers each use case; the
spec-judge checks the section exists and the mapping holds.

## Layout & enrichment

`spec.md` is a document a person reviews at the gate, so legibility is part of the bar. The
producer **actively enriches** it — never a wall of prose:

- **Draw the picture** where a diagram carries the idea better than words (architecture, sequence,
  state, data flow, decision tree) — a fenced Mermaid (or equivalent) diagram.
- **Format for humans** — clear heading hierarchy, tables for structured comparisons, short
  paragraphs, callouts for the load-bearing decisions.

Enrichment applies to `spec.md` only; the `.feature` stays plain boolean Gherkin (`suite-format`).
