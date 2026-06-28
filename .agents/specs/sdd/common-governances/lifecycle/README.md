---
spec-type: reference
---

# lifecycle — the spec lifecycle bar

A **reference artifact**: the `lifecycle` governance — the state machine a `spec.md` moves through
and the frontmatter that records it. A fixed-universal SDD governance loaded by every spec-touching
role; it is invariant per role (not face-split).

## Subject

- **Artifact** — the `lifecycle` governance, shipped as
  `plugins/sdd-new/skills/lifecycle-governance/` (a fixed-universal SDD governance —
  `../../design/governance-resolution.md`).
- **Contract surface** — the root `spec.md` frontmatter schema, the `status` enum, the legal status
  transitions, open-marker gating, and the per-file freeze state-transition.
- **Conformance** — verified through a consumer's suite (`../../authoring/validate-spec/`) and the
  mechanical `check-spec-state.mts`, never by this artifact itself. A reference artifact carries this
  `## Subject` in place of `## Use Cases` + a `.feature`.
- **Boundary** — the **model + rationale** live in `../../design/lifecycle-model.md` (canonical);
  write-ownership of these fields is `ownership`; the legality of a field *combination* and a gate
  verdict is `gate-validation`; the ledger shape is `combat-log`. This bar owns the lifecycle state
  machine and its frontmatter schema.
