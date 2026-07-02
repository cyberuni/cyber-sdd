---
spec-type: reference
concept: governance
---

# oracle — the Oracle actor bar

A **reference artifact**: the `oracle` actor bar — scope and kill-or-ship. The Oracle judges one
question: *is this intent worth committing?* It applies at the **spec gate only** (there is no
Oracle impl face), so it ships as a single bar, `oracle-spec`.

## Subject

- **Artifact** — the `oracle-spec` bar, shipped as `plugins/sdd/skills/oracle-spec-governance/`
  (an SDD-default actor governance; a plugin may bind its own per artifact-type —
  `../../design/governance-resolution.md`).
- **Contract surface** — a `spec.md`'s scope and intent at the spec gate: one coherent outcome,
  bounded scope, a real problem worth shipping, kill-or-revert.
- **Conformance** — verified by the **cold spec-judge** at the spec gate (Oracle-backward), and
  self-aligned by the **spec-producer** (Oracle-forward) before the gate. Faces are merged — one
  bar, loaded by both agents; `producer ≠ judge` holds at the agent level
  (`../common-governances.solution.md`). A reference artifact carries this `## Subject` in place of
  `## Use Cases` + a `.feature`.
- **Boundary** — testability/coverage belongs to `builder`; structural fit belongs to `architect`.
  This bar owns only scope and kill-or-ship.
