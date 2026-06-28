---
spec-type: reference
---

# director — the Director actor bar

A **reference artifact**: the `director` actor bar — scope and kill-or-ship. The Director judges one
question: *is this intent worth committing?* It applies at the **spec gate only** (there is no
Director impl face), so it ships as a single bar, `director-spec`.

## Subject

- **Artifact** — the `director-spec` bar, shipped as `plugins/sdd-new/skills/director-spec-governance/`
  (an SDD-default actor governance; a plugin may bind its own per artifact-type —
  `../../design/governance-resolution.md`).
- **Contract surface** — a `spec.md`'s scope and intent at the spec gate: one coherent outcome,
  bounded scope, a real problem worth shipping, kill-or-revert.
- **Conformance** — verified by the **cold spec-judge** at the spec gate (Director-backward), and
  self-aligned by the **spec-producer** (Director-forward) before the gate. Faces are merged — one
  bar, loaded by both agents; `producer ≠ judge` holds at the agent level
  (`../common-governances.solution.md`). A reference artifact carries this `## Subject` in place of
  `## Use Cases` + a `.feature`.
- **Boundary** — testability/coverage belongs to `builder`; structural fit belongs to `architect`.
  This bar owns only scope and kill-or-ship.
