---
spec-type: reference
concept: provenance
---

# combat-log — the provenance record bar

A **reference artifact**: the `combat-log` governance — the shape of the production provenance
record: the tracked per-CR **combat log** (in the plan) and the durable **ledger**, a sibling `ledger/`
directory of per-writer shard files at the root `spec.md`, their entry shapes, and the matchable
`cause` enum. A fixed-universal SDD governance loaded by the conductor, spec-gate, and the
doctrine-loop Scanner; invariant per role.

## Subject

- **Artifact** — the `combat-log` governance, shipped as
  `plugins/sdd/skills/combat-log-governance/` (a fixed-universal SDD governance —
  `../../design/governance-resolution.md`).
- **Contract surface** — the two-face record (current-state frontmatter + append-only sharded ledger
  directory), the six entry kinds (`report` / `correction` / `halt` → the combat log; `leash` / `gate` /
  `strategy` → the ledger — the conductor writes `leash` + self-asserted `gate`, the Scanner alone writes
  `strategy`), the per-shard `seq`, the combat-log-only write-time UTC `ts` (ledger lines carry none),
  the per-writer shard naming (`<cr-ref>.<hash>.jsonl`, ADR-0020), the pseudonymous `handle`, the
  matchable `cause` enum, and the safe-to-publish floor.
- **Conformance** — verified through consumer suites (conductor + spec-gate + Scanner), never by
  this artifact itself. A reference artifact carries this `## Subject` in place of `## Use Cases` +
  a `.feature`.
- **Boundary** — the model + rationale (three tiers, plan retirement, readers-split) live in
  `../../design/provenance-model.md`; freeze/gating semantics in `lifecycle`; write-ownership in
  `ownership`. This bar owns the record + entry shapes and the `cause` enum.
