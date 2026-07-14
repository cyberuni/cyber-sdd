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
  directory), the seven entry kinds (`report` / `correction` / `halt` → the combat log; `leash` / `gate` /
  `strategy` / `followup` → the ledger — the conductor writes `leash` + self-asserted `gate` + `followup`,
  the Scanner alone writes `strategy`), the per-shard `seq`, the combat-log-only write-time UTC `ts`
  (ledger lines carry none),
  the per-writer shard naming (`<cr-ref>.<hash>.jsonl`, ADR-0020), the pseudonymous `handle`, the
  matchable `cause` enum, the **correction-line durability** discipline (a judge-reject→fix→pass
  self-assert appends a discrete `correction` line — `correction-kind: judge-iteration` + a matchable
  `cause` — before the gate `why`, never only prose; and at finalize a mission
  carrying an unflushed correction writes that `correction` line, creating the combat log if absent —
  it stays a combat-log `correction`, never a ledger line, its `cause` made durable by the Scanner's
  distillation), and the safe-to-publish floor.
- **The `strategy` subject (`distills`)** — every `strategy` entry the Scanner drafts from a Ship or
  Kill records the **one mission it was distilled from** in a `distills` field carrying that
  mission's `<cr-ref>` (the same identifier that names the plan and the mission's `cr` on `leash` /
  `gate` lines). It is **distinct from the cross-referenced cr-refs in `evidence`**: `distills` names
  the subject, `evidence` names what the recommendation leans on. This field is the machine-checkable
  hook the retirement sweep keys on to confirm a plan was distilled before deleting its combat log
  (`../../doctrine/plan-retirement`) — an unratified `strategy` (`ratified: false`) still counts as a
  distillation. Milestone / drift / token-waste strategy that has no single subject mission may omit
  it; only Ship and Kill distillations gate a retirement.
- **The `followup` record (`class`)** — the durable record of a follow-up the mission identified but
  held out of scope, written by the **conductor at handoff** to its own ledger shard, **unconditionally**
  (no permission, no forge, no human) and **before any filing is attempted**. It carries a `class` —
  **`blocking`** (it contradicts a completion claim the mission already made; the line names that claim)
  or **`backlog`** (genuinely new territory) — plus the evidence for the classification. It is a
  **ledger** line, not a combat-log line: the combat log is deleted from the tree at retro, and a
  follow-up must outlive its mission. It carries **no filed-state** — the ledger is append-only, so
  what is still outstanding is **re-derived** at each drain by deduping against the forge's existing
  issues — **open or closed**, since matching only open ones would re-file a duplicate for a follow-up
  already filed and resolved — never written back onto the line. A finding that the mission's own **frozen contract** was wrong is
  **not** a `followup` (it is an Oracle-lens revert inside that mission). The classification is a
  **proposal**: recording one grants nothing — admission to the mission graph is the graph's single
  writer's act (`../../mission-graph/`); handoff's side of it is `../../mission/handoff/`.

- **Conformance** — verified through consumer suites (conductor + spec-gate + Scanner), never by
  this artifact itself. A reference artifact carries this `## Subject` in place of `## Use Cases` +
  a `.feature`.
- **Boundary** — the model + rationale (three tiers, plan retirement, readers-split) live in
  `../../design/provenance-model.md`; freeze/gating semantics in `lifecycle`; write-ownership in
  `ownership`. This bar owns the record + entry shapes and the `cause` enum.
