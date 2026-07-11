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
`distills` field, never an `evidence` mention; unratified still counts). The distilled gate guards
an **existing** combat log: a cr-ref whose `<cr-ref>.log.jsonl` was **never written** (a non-gated
mission — hand-run, chore-tracked, investigation) has nothing to distill, so it retires on clearance
+ presence alone, no distilling entry required. The sweep is the mechanical, **fail-closed**
filesystem act — it deletes `<cr-ref>.plan.md` + `<cr-ref>.log.jsonl` only for a cr-ref that is
cleared, present, **and** (distilled **or** has no log to distill); a cleared, present cr-ref whose
log **exists** but is undistilled fails closed. Anything not cleared, not present, missing, or
already gone is a no-op (idempotent, safe to re-run). Omitting `--ledger` fail-closes to deleting
nothing (the no-log branch only applies once a ledger is present to consult).

Tests (`scripts/retire-plans.test.mts`) run under `pnpm verify:specs`.
