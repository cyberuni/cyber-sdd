---
spec-type: behavioral
concept: [doctrine, provenance]
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
behaviors. Each asserts an **observable outcome of the sweep** over a given cleared set — the
filesystem effect — never the caller's clearance decision (which is out of this unit):

| Behavior | What it covers |
|---|---|
| **delete-only, never distill** | the sweep only deletes; distill (writing `strategy`/recurrence to the ledger) is the Scanner's earlier, separate step — the sweep writes nothing to the ledger |
| **deletes both plan files** | a cleared, present `<cr-ref>` removes `<cr-ref>.plan.md` **and** `<cr-ref>.log.jsonl` as a tracked deletion |
| **partial pair is no-op'd** | a cleared `<cr-ref>` whose `log.jsonl` is already gone still deletes `plan.md` and no-ops the missing half |
| **fail-closed — uncleared is untouched** | a plan the caller did not clear (its source still open, or never distilled) is left untouched; only an explicitly-cleared `<cr-ref>` is ever touched |
| **exact-stem match** | clearing a `<cr-ref>` never collateral-deletes a different `<cr-ref>` it is a prefix of |
| **idempotent — missing plan is a no-op** | a cleared `<cr-ref>` with no plan on disk deletes nothing; the sweep is safe to re-run |

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

The sweep's **authoritative observable is the filesystem effect** — which plan files it deleted.
Its printed summary of the retired `<cr-ref>`s is **advisory** (operator feedback), **not** part of
the frozen contract; the impl-judge re-derives its oracle from the on-disk deletions, not the
stdout.

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
