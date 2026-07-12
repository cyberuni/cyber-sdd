---
name: doctrine-loop
description: "Partial Skill: invoke by name only — the SDD doctrine loop, the Strategist's outer loop run by the Scanner — invoked by the doctrine-loop delegate, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# SDD Doctrine Loop

The **outer loop** of the SDD model. Owned by the **Strategist** and run by its delegate, the
**Scanner in the Bunker** (`sdd-scanner`), parallel to the conductor running the mission loop. It
fires at **lifecycle granularity, never per-gate**: it watches every **mission** reach a terminal
state, drafts **strategy** (forward recommendations to revise governances, conventions, skills)
from persisted artifacts post-hoc, and surfaces it to the human **Council** for keep-or-cut.
Ratified, strategy re-enters as a CR that re-tunes the **doctrine** (the SDD design rules and
governances) and grows the **corpus**.

Load `sdd:combat-log-governance` for the **shape** of a `strategy` ledger entry and the matchable
`cause` enum — this skill defers the entry shape there and never restates it.

## The split: detect-and-draft vs keep-or-cut

| Half | Holder | Cost | Effect |
|---|---|---|---|
| **Detect and draft** | the Scanner delegate | cheap, continuous, non-blocking | appends an **unratified** `strategy` entry to the ledger |
| **Keep or cut** | the human Council | accountable, high-blast-radius | ratify → re-enter as a CR that re-tunes doctrine + grows corpus; cut → strategy stays out |

No strategy enters the corpus without the Council's ratification. The Scanner is the **sole
writer** of `strategy` entries; the conductor (`report` / `correction`) and the producers (nothing)
never write them.

## The six use cases

Each is an entry-point: a lifecycle-grained trigger, its post-hoc input, and the strategy drafted.
**A single gate passing is not a trigger** — the loop fires only at the lifecycle granularity below.

| Use case | Trigger | Input | Drafts |
|---|---|---|---|
| **Ship** | `→ implemented` (the impl gate writes it) | the concluded mission's combat log (**PRIMARY**) + *[opt]* transcripts | strategy from a successful mission |
| **Kill** | `→ deprecated` (the deprecation path writes it) | the concluded mission's combat log — why it failed (**PRIMARY**) + *[opt]* transcripts | strategy from the failure |
| **Milestone retro** | a human-held retro | the milestone's concluded combat logs | strategy across the milestone |
| **Recurring pattern** | the same correction recurs across missions | the **distilled `cause` recurrence count** in the ledger (maintained mission-over-mission), never a re-scan of many raw logs | strategy to codify the pattern |
| **Drift / staleness** | a now-false convention or governance contradiction | the corpus (conventions, governances) | a **PRUNE** strategy |
| **Token-waste** | a flagged-waste `correction` in the log, **or** session token cost over a **configurable bound** (pre-merge) | the **categorical** efficiency `correction` from the committed log (**post-merge**); raw transcripts add numeric depth (**pre-merge / same-machine only**) | efficiency strategy |

The Scanner **observes** the terminal transitions; it never writes a mission's `status`.

## Inputs: combat log (contract) vs transcripts (enrichment)

The Scanner reads **persisted artifacts post-hoc** — never live subagent context.

- **Combat log** — PRIMARY input, the contract: the concluded mission's combat log (the plan's
  `*.log.jsonl`), read once at retro. Strategy is draftable from it **alone** for **every
  categorical dimension**; raw transcripts are additive, never required.
- **Raw `.jsonl` transcripts** — optional enrichment, harness-specific, and **may be absent
  post-merge** (another machine, the session gone). The **sole** transcript-only piece is the
  *numeric* token-waste depth.

The **token-waste dimension splits**: a coarse, **categorical** efficiency signal rides the
committed log as a `correction` (the conductor flags a class — **no raw counts**), so the
post-merge loop keeps the dimension; the **numeric** breakdown lives only in transcripts and is
**threshold-gated + pre-merge / same-machine only** (run over a configurable bound or on demand,
never under it without a request). No raw token-cost number is written to the committed log — only
the categorical class (the safe-to-publish floor, `sdd:combat-log-governance`).

## Where strategy lands

Every `strategy` entry lands in the **one project ledger** — the `ledger/` directory sibling of the
root `spec.md` — written to the **Scanner's own shard** (`strategy.<hash>.jsonl`; mint `<hash>` as 6
random hex once per session), so two concurrent Scanner runs write distinct shards and never contend.
There is no per-spec log to route to under the project-spec model. The Scanner's `handle` is
`sdd-scanner`. Every entry is **unratified** (`ratified: false`) and carries its **driving evidence**
(the distilled `cause` recurrence that drove it), per the shape in `sdd:combat-log-governance`. The
shard is append-only — the next `seq` within it, never an edit; ledger lines carry **no `ts`**.

**Record the distilled subject.** When the entry is drafted from a **Ship** (`→ implemented`) or
**Kill** (`→ deprecated`), set `distills: <cr-ref>` to the **one mission it was distilled from** —
distinct from the cross-referenced cr-refs in `evidence`. This is the machine-checkable hook
`sdd:plan-retirement` keys on to confirm a plan was distilled before deleting its combat log, so a
Ship/Kill distillation **must** carry it. **Milestone / drift / token-waste** strategy has no single
subject mission and **omits** `distills` (`sdd:combat-log-governance`, *The `distills` subject*).

## Surfacing and ratification

The Scanner **accumulates** unratified strategy and surfaces it **episodically** — never
synchronously blocking a mission. The `sdd` gateway surfaces the **count of pending (unratified)
strategy** when the Council re-enters; that is the entry point to keep-or-cut. On **ratify**, the
strategy re-enters as a **new CR** that re-tunes the doctrine and grows the corpus (a ratified
**PRUNE** removes the stale convention). On **cut**, it stays unratified and absent from the
corpus.

## Plan retirement

Doctrine's **last retro step** — the gated, idempotent **tracked deletion** of a retired plan — is
a separate unit (`sdd:plan-retirement`). The distill (writing `strategy` here) fires early, at
`→ implemented`; the delete is a later step gated on source = `done`/merged **and** distilled.
