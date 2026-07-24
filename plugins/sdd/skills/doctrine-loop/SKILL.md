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

## Validate before drafting — a plan or log is a hypothesis, not present truth

A persisted plan, combat log, or ledger line is **history**, never authoritative present truth. Every
candidate improvement it surfaces — a gap to build, a defect to fix — is a **hypothesis about the
current codebase** (the repo's own principle: *a source-read is a hypothesis, refuted by a repro
against current code*). **Before you draft**, run a validation gate on each candidate: read the
CURRENT code and decide whether the flagged gap still exists, or has since been **built / fixed /
superseded** (by a later mission, a landed PR, a governance change).

- **Resolved → cut.** A candidate current code already resolves is **cut**: draft **no** build-or-fix
  strategy and emit **no** issue. Record the cut **explicitly, never silently** — append a `strategy`
  entry marked **`disposition: resolved`** to your own shard, carrying the **resolving current-code
  evidence** (the repro that refuted the hypothesis) in `evidence`. A `disposition: resolved` line is
  a **tombstone**: not an actionable recommendation, so it emits no issue and is **not counted toward
  pending strategy** at the gateway. It exists so the cut is auditable and a later run does not
  silently re-surface the same closed candidate.
- **Still open → draft.** A candidate current code does **not** resolve is a real improvement: draft
  `strategy` for it marked **`disposition: open`** (the default; a line without the field grandfathers
  as open), which counts toward pending strategy, and emit its issue (below).

The gate applies to any candidate that asserts an **unmet gap or defect**, whether surfaced by a
**plan or a combat log** (symmetric — each source has both a resolved→cut and a still-open→draft
path). A pure distilled **retro lesson** (a success pattern, not a gap claim) carries no gap to
validate and is drafted without a current-code check. Set the disposition **once at write** — never
flip it (append-only); the Council's later keep-or-cut on a `disposition: open` line is a separate act
(the keep-or-cut plan), not a field edit. The `disposition` field's shape is owned by
`sdd:combat-log-governance`.

This gate is what stops the loop reinforcing a **stale cache** — drafting "build X" for an X a later
mission already built.

## Improvement output — validated-open findings become tracked issues

The loop's **actionable output** for a validated-open improvement is a **new tracked issue**
(`gh issue create`) — one titled, bodied issue per real improvement, **cross-linking the evidence**
that drove it. This grounds the improvement plan in current code, not the stale narrative of a retired
plan. The ledger `strategy` line stays the **provenance**; the issue is what a later mission is started
from.

- **Dedupe first.** Before filing, dedupe against the forge's existing issues — **open and closed**
  (at least two keyword combinations: the full title, then the core noun/verb) — and on a mixed set
  file only the unmatched.
- **Emit is not dispatch.** Emitting an issue leaves the `strategy` **unratified** and spawns **no**
  mission — it opens no CR and admits nothing to the mission graph (that is the graph's single writer's
  act). Keep-or-cut stays the Council's; the issue re-enters SDD only when a **later** mission is
  started from it.
- **Outward-publish floor.** Compose the issue body to the same outward-publish floor the handoff
  follow-up issues meet (owned by the handoff unit — do not restate it): **self-contained** (a reader
  who cannot see the mission's internal artifacts can act on it), **no production-internal artifact
  reference** (no ledger shard filename, no combat-log or plan-brief path), plus everything the
  committed-record floor bans (absolute paths, `$HOME`/`$USER`, usernames, secrets, raw numbers).
  Carry an **agent-filed marker** and name the evidence it was distilled from.

## Where strategy lands

Every `strategy` entry lands in the **one project ledger** — the `ledger/` directory sibling of the
root `spec.md` — written to the **Scanner's own shard** (`strategy.<hash>.jsonl`; mint `<hash>` as 6
random hex once per session), so two concurrent Scanner runs write distinct shards and never contend.
There is no per-spec log to route to under the project-spec model. The Scanner's `handle` is
`sdd-scanner`. Every entry is **unratified** (`ratified: false`) and carries its **driving evidence**
(the distilled `cause` recurrence that drove it), per the shape in `sdd:combat-log-governance`. The
shard is append-only — the next `seq` within it, never an edit; ledger lines carry **no `ts`**. Every
entry also carries its validation **`disposition`** (`open` for a drafted still-open improvement,
`resolved` for a validation tombstone; see *Validate before drafting* above) — set once at write.

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
