---
name: plan-retirement
description: "Partial Skill: invoke by name only — the SDD Doctrine loop's last retro step — the gated, idempotent tracked deletion of a retired mission plan. Invoked by the doctrine-loop Scanner, not user-triggered; the clearance contract lives in the body + README."
user-invocable: false
metadata:
  internal: true
---

# SDD Plan Retirement

The Doctrine loop's **last retro step** (`sdd:doctrine-loop`; the provenance shape is
`sdd:combat-log-governance`). Because plans are **tracked** (committed with
the work, not gitignored), a retired plan leaves the tree by a deliberate **tracked deletion** —
never a gitignore side effect. This skill carries a self-contained `.mts` sweep that, for each
cleared `<cr-ref>`, deletes that CR's whole **transient artifact set**: the plan pair
(`<cr-ref>.plan.md` + `<cr-ref>.log.jsonl`) plus its **transient CR-level planning briefs**
(`<cr-ref>.design.md`, `<cr-ref>.operations.md`, `<cr-ref>.evidence.md`) from `.agents/plans` —
so a retired CR leaves no orphan behind.

## The transient briefs ride along, never gate

`design.md` / `operations.md` / `evidence.md` are optional, cr-ref-scoped planning briefs that
share the plan's lifetime. They retire alongside the plan pair but do not participate in the
retirement decision. Two boundaries:

- **They do not widen the distilled gate.** The gate keys on the combat log's presence only — a
  cr-ref with briefs but no `log.jsonl` still retires without a distilling `strategy` entry. A
  brief owes no distillation (its content was consumed by the mission itself).
- **They do not anchor presence.** `<cr-ref>.plan.md` is the sole presence signal. A brief
  without a `plan.md` is left untouched.

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
  (`sdd:combat-log-governance`). Its absence is **fail-closed** — but only when a combat log
  **exists**: a cr-ref whose `<cr-ref>.log.jsonl` was never written (a non-gated mission — hand-run,
  chore-tracked, investigation — runs no gate cycle and emits no correction) has **nothing to
  distill**, so it retires on clearance + presence alone. The fail-closed leaves an existing,
  undistilled log's plan intact so its distillation can still be drafted.

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
  fail-closes: nothing is deleted (the no-log branch only applies once a ledger is present to consult).
- Deletes the transient artifact set (`<cr-ref>.plan.md`, `<cr-ref>.log.jsonl`,
  `<cr-ref>.design.md`, `<cr-ref>.operations.md`, `<cr-ref>.evidence.md`) only for a `<cr-ref>` that
  is cleared (`--retire`) **and** present on disk (`<cr-ref>.plan.md` exists) **and** either
  distilled (a `strategy` with `distills == <cr-ref>` in `--ledger`) **or** has no combat log to
  distill (no `<cr-ref>.log.jsonl` on disk). Each brief is deleted only if present; an absent one is
  a no-op, same as the missing log half.
- **Fail-closed** — a plan not named in `--retire`, or whose combat log **exists** but has no
  distilling ledger entry, is never touched (and neither are its briefs).
- **Idempotent** — a cleared `<cr-ref>` with no plan on disk (already retired, or an open CR the
  caller declined to clear) is a no-op, even if a brief for it exists; the sweep is safe to re-run.
- `--dry-run` prints the planned deletions without touching the tree.

When `node` is absent, an agent performs the same decision by hand: for each cleared `<cr-ref>`, if
its `<cr-ref>.log.jsonl` **exists**, **first confirm a `strategy` entry with `distills == <cr-ref>`
exists in the project ledger** (not a mere `evidence` mention; unratified still counts) — if none,
skip it. A cr-ref with **no** `log.jsonl` has nothing to distill and needs no such entry. Only then
delete `<cr-ref>.plan.md`, `<cr-ref>.log.jsonl`, `<cr-ref>.design.md`, `<cr-ref>.operations.md`, and
`<cr-ref>.evidence.md` if present, touching nothing else — and only if `<cr-ref>.plan.md` is
present in the first place (a brief alone never triggers deletion).
