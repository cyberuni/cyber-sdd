# plan-retirement

Internal, non-user-invocable SDD skill carrying the Doctrine loop's **last retro step** — the
gated, idempotent **tracked deletion** of a retired mission plan. It holds a self-contained
`scripts/retire-plans.mts` (node ≥23.6, no deps; an agent fallback when `node` is absent).

**Distill and delete are decoupled.** The Scanner distills the combat log into ledger `strategy`
early (at `→ implemented`); this sweep deletes the plan **later**, gated on source = `done`/merged
**and** distilled. The two gating signals are the **caller's judgment** (`sdd:doctrine-loop`
Scanner): it passes the cleared `<cr-ref>` set via `--retire`, and the sweep is the mechanical,
**fail-closed** filesystem act — it deletes `<cr-ref>.plan.md` + `<cr-ref>.log.jsonl` only for a
cleared, present cr-ref; anything not cleared, missing, or already gone is a no-op (idempotent,
safe to re-run).

Tests (`scripts/retire-plans.test.mts`) run under `pnpm verify:specs-new`.
