---
spec-type: reference
concept: governance
---

# ownership — the write-ownership bar

A **reference artifact**: the `ownership` governance — who may write each `spec.md` frontmatter
field and each artifact, plus the freeze write-constraint. A fixed-universal SDD governance loaded by
every producer, judge, conductor, and the start-mission/spec-gate skills; invariant per role (not
face-split).

## Subject

- **Artifact** — the `ownership` governance, shipped as
  `plugins/sdd/skills/ownership-governance/` (a fixed-universal SDD governance —
  `../../design/governance-resolution.md`).
- **Contract surface** — the write-ownership matrix (which role may write each field / artifact), the
  producer write boundary, positional ratification authority, and the frozen-`.feature` write
  constraint.
- **Conformance** — verified through consumer suites (`../../authoring/spec-gate/` + the
  producer/judge suites), never by this artifact itself. A reference artifact carries this
  `## Subject` in place of `## Use Cases` + a `.feature`.
- **Boundary** — the field *definitions* live in `lifecycle`; the *legality* of the resulting state
  in `gate-validation`; the ledger/plan write split in `combat-log`; the model + rationale in
  `../../design/provenance-model.md`. This bar owns who-writes-what.
