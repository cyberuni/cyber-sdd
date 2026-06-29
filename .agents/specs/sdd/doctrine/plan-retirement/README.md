---
spec-type: behavioral
---

# doctrine/plan-retirement/ — doctrine's last retro step

**Plan retirement** is the Doctrine loop's final retro act (`../README.md`,
`../../design/provenance-model.md` — *Plan retirement*). Because plans are now **tracked**
(committed with the work, not gitignored), a retired plan leaves the tree by a deliberate, gated
**tracked deletion** — never a gitignore side effect. The sweep globs `.agents/plans/*.plan.md`
and, for each cleared `<cr-ref>`, deletes `<cr-ref>.plan.md` + `<cr-ref>.log.jsonl`.

> **This is a single behavioral unit, not an overview** — retirement is one skill carrying a
> self-contained `.mts` script. This spec owns the **behavior + suite**
> ([`plan-retirement.feature`](./plan-retirement.feature)). The provenance gain (history shows
> when a plan was distilled and dropped) is `../../design/provenance-model.md`'s; this spec does
> not restate it.

## Use Cases

**Subject** — the gated, idempotent retirement sweep: distill and delete are decoupled; the
delete removes a plan's two files as a tracked deletion only when its source is done/merged **and**
the plan has been distilled; everything else is a no-op.

**Non-goals** — it does **not** distill (the Scanner does that earlier, at `→ implemented`), does
**not** judge source-status or distilled-ness itself (the **caller clears** a `<cr-ref>` for
retirement — see *The clearance boundary*), does **not** touch a plan it was not explicitly
cleared to retire, and does **not** delete from git **history** (a tracked deletion removes the
files from the *tree* only).

Every scenario in [`plan-retirement.feature`](./plan-retirement.feature) maps to one of these
behaviors:

| Behavior | What it covers |
|---|---|
| **distill and delete are decoupled** | distill fires at `→ implemented`; the delete is a separate, later retro step |
| **the sweep deletes both plan files** | a cleared `<cr-ref>` removes `<cr-ref>.plan.md` **and** `<cr-ref>.log.jsonl` as a tracked deletion |
| **never retire an uncleared plan** | a plan whose source is still open, or that was never distilled, is not cleared, so it is left untouched |
| **fail-closed on clearance** | only an explicitly-cleared `<cr-ref>` is touched; an un-named plan is never deleted |
| **idempotent — missing plan is a no-op** | a `<cr-ref>` with no plan on disk (already retired) deletes nothing |
| **safe to re-run** | re-running the sweep over the same inputs makes no further change |

## The clearance boundary

The two gating signals — **source = `done`/merged** and **distilled** — are the **caller's
judgment**, not the script's. The source-status query (`github-NN` → GH issue, `asana-<gid>` →
Asana, `local-<slug>` → the local store) needs network/`gh` and judgment; "distilled" means the
Scanner's distill ran and wrote `strategy`/recurrence to the ledger for that `<cr-ref>`. The
Scanner determines both, then **clears** the set of `<cr-ref>`s for retirement and hands them to
the sweep. The sweep is the **mechanical, fail-closed gate + filesystem act**: given the cleared
set, it deletes exactly those plans that exist and nothing else. Anything not cleared, missing, or
already gone is a no-op. This keeps the deterministic deletion testable and the policy judgment
with the agent that can make it.

## Delivery

Delivered as a **non-user-invocable** skill carrying a self-contained `.mts` script (the repo's
node-≥23.6 / no-deps convention; an agent fallback when `node` is absent). Pure functions are
exported for `node:test`; running the file directly drives the CLI.

## Scenarios (colocated)

Unit scenarios for the sweep (decoupling, the two-file tracked deletion, fail-closed clearance,
idempotency) **colocate** in this folder. The cross-capability outcome — a full mission distilled
then its plan retired end-to-end — lives in `../../acceptance/`.

## Source

- new (the W-1 retirement sweep named in `../../design/provenance-model.md` — *Plan retirement*).
  No prior `plugins/sdd/` impl.
