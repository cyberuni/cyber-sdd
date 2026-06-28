---
spec-type: reference
---

# plugin-contract — the SDD plugin contract bar

A **reference artifact**: the `plugin-contract` governance — what an SDD plugin must implement (the
five delegate roles), which governances each role loads, and the `universal-plugin.json` registry
shape. A **single-owner** governance: it lives under `plugin/` (its one consumer family is the
plugin/conductor resolution surface), not in `common-governances/`.

## Subject

- **Artifact** — the `plugin-contract` governance, shipped as
  `plugins/sdd-new/skills/plugin-contract-governance/`.
- **Contract surface** — the five delegate role keys (closed set), the per-role governance loadout
  (the Model-B `(actor, gate)` bars + the fixed-universal set), and the `sdd-plugins[]` registry
  entry shape + resolution by `artifact-type`.
- **Conformance** — verified through the conductor-resolution suite + a plugin-author's suite, never
  by this artifact itself. A reference artifact carries this `## Subject` in place of `## Use Cases`
  + a `.feature`.
- **Boundary** — the universal-plugin *format* is `plugin-design` (out of scope); governance
  resolution/composition mechanics live in `../../design/governance-resolution.md`; the actor bars
  themselves live in `../../common-governances/`. This bar owns the SDD-role layer a plugin builds to.
