# plan-retirement

Internal, non-user-invocable SDD skill carrying the Doctrine loop's **last retro step** — the
gated, idempotent **tracked deletion** of a retired mission plan. It holds a self-contained
`scripts/retire-plans.mts` (node ≥23.6, no deps; an agent fallback when `node` is absent).

**Distill and delete are decoupled.** The Scanner distills the combat log into ledger `strategy`
early (at `→ implemented`); this sweep deletes the plan **later**, gated on source = `done`/merged
**and** distilled. The two signals **split by verifiability**: **source** stays the caller's
judgment (`sdd:doctrine-loop` Scanner passes the source-cleared set via `--retire`; it needs
network/`gh`), while **distilled** is **verified mechanically by the sweep** against the project
ledger (`--ledger <dir>`) — a `strategy` entry with `distills == <cr-ref>` must exist (keyed on the
`distills` field, never an `evidence` mention; unratified still counts). The sweep is the
mechanical, **fail-closed** filesystem act — it deletes `<cr-ref>.plan.md` + `<cr-ref>.log.jsonl`
only for a cr-ref that is cleared, present, **and** distilled; anything not cleared, not distilled,
missing, or already gone is a no-op (idempotent, safe to re-run). Omitting `--ledger` fail-closes to
deleting nothing.

Tests (`scripts/retire-plans.test.mts`) run under `pnpm verify:specs`.
