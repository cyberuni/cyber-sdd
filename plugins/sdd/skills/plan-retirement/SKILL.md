---
name: plan-retirement
description: "Internal skill: the SDD Doctrine loop's last retro step — the gated, idempotent tracked deletion of a retired mission plan. For each cr-ref the caller cleared for source (done/merged), retire-plans.mts verifies the plan was distilled (a strategy entry with distills==cr-ref in the project ledger) and only then deletes <cr-ref>.plan.md + <cr-ref>.log.jsonl, fail-closed. Invoked by the doctrine-loop Scanner — not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# SDD Plan Retirement

The Doctrine loop's **last retro step** (`sdd:doctrine-loop`; the provenance shape is
`sdd:combat-log-governance`). Because plans are **tracked** (committed with
the work, not gitignored), a retired plan leaves the tree by a deliberate **tracked deletion** —
never a gitignore side effect. This skill carries a self-contained `.mts` sweep that, for each
cleared `<cr-ref>`, deletes `<cr-ref>.plan.md` + `<cr-ref>.log.jsonl` from `.agents/plans`.

## Distill and delete are decoupled

- **Distill (early).** At `→ implemented`, the Scanner reads the concluded combat log and distills
  recurring `cause`s into the ledger's `strategy` lines (`sdd:doctrine-loop`).
- **Delete (late).** This sweep runs as a **separate, later** step, gated on source = `done`/merged
  **and** the plan distilled. Never delete an un-distilled plan (the retro never ran).

## The clearance boundary — split by verifiability

The two gating signals split by what the sweep can check itself:

- **source = `done`/merged** — the **caller's judgment**: query the source natively (`github-NN` → GH
  issue, `asana-<gid>` → Asana, `local-<slug>` → the local store); needs network/`gh`. The caller
  passes the source-cleared set via `--retire`.
- **distilled** — **verified mechanically by the sweep**: a `strategy` entry with `distills ==
  <cr-ref>` must exist in the project ledger (`--ledger`). The sweep keys on the structured
  `distills` field, **never** a `<cr-ref>` that appears only in a strategy's `evidence`
  cross-references, and an **unratified** distilling entry still counts
  (`sdd:combat-log-governance`). Its absence is **fail-closed** — the plan is left intact so its
  distillation can still be drafted.

Leaving the distilled half to the caller once let a plan + combat log be deleted before any
distillation existed (the evidence the distill was meant to preserve). Because the check is local,
the sweep does it itself. Only the genuinely non-local judgment (source status) stays with the caller.

## Run the sweep

```bash
node "<skill>/scripts/retire-plans.mts" \
  --root .agents/plans \
  --ledger .agents/specs/<project>/ledger \
  --retire github-34,asana-7 [--dry-run]
```

- **`--ledger <dir>`** points at the project's ledger directory (the `ledger/` sibling of the root
  `spec.md`). **Required for any deletion** — omit it (or an unreadable dir) and the sweep
  fail-closes: no `<cr-ref>` can be verified distilled, so nothing is deleted.
- Deletes the two files only for a `<cr-ref>` that is cleared (`--retire`) **and** present on disk
  **and** distilled (a `strategy` with `distills == <cr-ref>` in `--ledger`).
- **Fail-closed** — a plan not named in `--retire`, or with no distilling ledger entry, is never
  touched.
- **Idempotent** — a cleared `<cr-ref>` with no plan on disk (already retired, or an open CR the
  caller declined to clear) is a no-op; the sweep is safe to re-run.
- `--dry-run` prints the planned deletions without touching the tree.

When `node` is absent, an agent performs the same decision by hand: for each cleared `<cr-ref>`,
**first confirm a `strategy` entry with `distills == <cr-ref>` exists in the project ledger** (not a
mere `evidence` mention; unratified still counts) — if none, skip it. Only then delete
`<cr-ref>.plan.md` and `<cr-ref>.log.jsonl` if present, touching nothing else.
