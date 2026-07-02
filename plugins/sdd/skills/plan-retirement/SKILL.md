---
name: plan-retirement
description: "Internal skill: the SDD Doctrine loop's last retro step — the gated, idempotent tracked deletion of a retired mission plan. Given the cr-refs a caller has cleared (source done/merged AND distilled), retire-plans.mts deletes each <cr-ref>.plan.md + <cr-ref>.log.jsonl, fail-closed. Invoked by the doctrine-loop Scanner — not triggered by users directly."
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

## The clearance boundary — the caller judges, the script acts

The two gating signals are the **caller's judgment**, not the script's:

- **source = `done`/merged** — query the source natively (`github-NN` → GH issue, `asana-<gid>` →
  Asana, `local-<slug>` → the local store); needs network/`gh`.
- **distilled** — the Scanner's distill ran and wrote `strategy`/recurrence to the ledger for that
  `<cr-ref>`.

The Scanner determines both, then passes the **cleared** set to the sweep via `--retire`. The sweep
is the **mechanical, fail-closed gate + filesystem act**.

## Run the sweep

```bash
node "<skill>/scripts/retire-plans.mts" --root .agents/plans --retire github-34,asana-7 [--dry-run]
```

- Deletes the two files only for a `<cr-ref>` that is **both** cleared **and** present on disk.
- **Fail-closed** — a plan not named in `--retire` is never touched.
- **Idempotent** — a cleared `<cr-ref>` with no plan on disk (already retired, or an open CR the
  caller declined to clear) is a no-op; the sweep is safe to re-run.
- `--dry-run` prints the planned deletions without touching the tree.

When `node` is absent, an agent performs the same decision by hand: for each cleared `<cr-ref>`,
delete `<cr-ref>.plan.md` and `<cr-ref>.log.jsonl` if present, touch nothing else.
