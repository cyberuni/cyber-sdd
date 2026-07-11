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
the plan has been distilled — the sweep **verifies the distilled half mechanically** against the
project ledger (a `strategy` entry whose `distills` equals the `<cr-ref>` must exist) and
fail-closes when it is absent. The distilled gate guards an **existing combat log**: a `<cr-ref>`
whose `log.jsonl` was never written (a non-gated mission — hand-run, chore-tracked, investigation)
has **nothing to distill**, so the gate does not apply and the source half alone clears it.
Everything else is a no-op.

**Non-goals** — it does **not** distill (the Scanner does that earlier, at `→ implemented`), does
**not** judge **source-status** itself (that half needs network/`gh`/Asana — the **caller clears**
it — see *The clearance boundary*), does **not** touch a plan it was not explicitly cleared to
retire, and does **not** delete from git **history** (a tracked deletion removes the files from the
*tree* only). It **does** verify the **distilled** half itself, because that signal is local and
mechanically checkable.

Every scenario in [`plan-retirement.feature`](./plan-retirement.feature) maps to one of these
behaviors. Each asserts an **observable outcome of the sweep** over a given cleared set — the
filesystem effect — never the caller's clearance decision (which is out of this unit):

| Behavior | What it covers |
|---|---|
| **delete-only, never distill** | the sweep only deletes; distill (writing `strategy` to the ledger) is the Scanner's earlier, separate step — the sweep only **reads** the ledger to verify distillation and writes nothing to it |
| **distilled-gate, mechanical** | a cleared, present `<cr-ref>` **whose combat log exists** is deleted only when a `strategy` entry with `distills == <cr-ref>` exists in the ledger; absence is **fail-closed** (combat log survives so it can still be distilled) |
| **no combat log to distill** | a cleared, present `<cr-ref>` whose `log.jsonl` was **never written** is retired (its `plan.md` deleted) **without** a distilling `strategy` — there is nothing to distill, so the fail-closed gate, which guards an existing log, does not apply |
| **distills ≠ cross-ref** | a `strategy` that names the `<cr-ref>` only in its `evidence` (as prior cross-reference), not in `distills`, does **not** clear it — the gate keys on `distills`, never a substring mention |
| **deletes both plan files** | a cleared, present, distilled `<cr-ref>` removes `<cr-ref>.plan.md` **and** `<cr-ref>.log.jsonl` as a tracked deletion |
| **partial pair is no-op'd** | a cleared, distilled `<cr-ref>` whose `log.jsonl` is already gone still deletes `plan.md` and no-ops the missing half |
| **fail-closed — uncleared is untouched** | a plan the caller did not clear (its source still open) is left untouched; only an explicitly-cleared `<cr-ref>` is ever considered |
| **exact-stem match** | clearing a `<cr-ref>` never collateral-deletes a different `<cr-ref>` it is a prefix of |
| **idempotent — missing plan is a no-op** | a cleared `<cr-ref>` with no plan on disk deletes nothing; the sweep is safe to re-run |

## The clearance boundary

The two gating signals **split by verifiability**. **Source = `done`/merged** stays the **caller's
judgment**: the query (`github-NN` → GH issue, `asana-<gid>` → Asana, `local-<slug>` → the local
store) needs network/`gh` and judgment the sweep cannot make, so the Scanner determines it and
**clears** the `<cr-ref>`. **Distilled** is **local and mechanically checkable** — it means a
`strategy` entry with `distills == <cr-ref>` exists in the project ledger — so the sweep **verifies
it itself** rather than trusting the caller's assertion. Keying the gate on `distills` (not a
substring mention) is what prevents a `<cr-ref>` cited only as cross-reference `evidence` from being
mistaken for distilled.

This division is deliberate: a caller-asserted distilled half once let a plan + combat log be
deleted before any distillation existed, destroying the evidence the distill was meant to preserve.
Because the check is local, leaving it to the caller bought nothing but a silent data-loss hole;
pulling it into the fail-closed sweep closes it. The invariant it protects is precise — **never
delete an undistilled combat log** — so it binds only when a combat log **exists**: a `<cr-ref>`
whose `log.jsonl` was never written (a non-gated mission runs no gate cycle and emits no correction,
so no combat log is ever created) has nothing to distill and nothing to lose, and the source
clearance alone retires it. Fail-closing there would strand a whole mission class as un-retirable
cruft to guard evidence that never existed. The sweep is the **mechanical, fail-closed gate +
filesystem act**: given the cleared set, it deletes exactly those plans that are present **and**
distilled, and nothing else. Anything not cleared, not distilled, missing, or already gone is a
no-op. The deterministic deletion stays testable; only the genuinely non-local judgment (source
status) stays with the agent that can make it.

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
