---
spec-type: behavioral
concept: doctrine
---

# doctrine/scanner/ — the Scanner detect-and-draft loop

The **Scanner** (`sdd-scanner`) is the Strategist's delegate — the **detect-and-draft** half of
the Doctrine loop (`../README.md`). It sits **above any single mission**, in the Bunker, and runs
the **outer loop at lifecycle granularity** parallel to the conductor's inner mission loop. It
reads **persisted artifacts post-hoc**, drafts **unratified `strategy`** to the durable ledger,
and accumulates it for the Council's keep-or-cut. The keep-or-cut half is the human Council's; the
Scanner never ratifies.

> **This is a single behavioral unit, not an overview** — the loop is one skill (`doctrine-loop`)
> run by one agent (`sdd-scanner`). This spec owns the **behavior + suite**
> ([`scanner.feature`](./scanner.feature)). The `strategy` entry shape, the matchable `cause`
> enum, and the ledger are owned by `../../design/provenance-model.md` + `combat-log-governance`;
> this spec references them, it does not restate them.

## Use Cases

**Subject** — the Scanner's outer loop: firing at lifecycle granularity on one of six triggers,
drafting `strategy` from the concluded mission's combat log, landing it unratified in the one
project ledger, and surfacing it episodically — never blocking a mission.

**Non-goals** — it does **not** write a spec's `status` transition (it observes one written
elsewhere), does **not** ratify or prune the corpus (the Council's positional act), does **not**
read live subagent context (only persisted artifacts post-hoc), does **not** write `report` /
`correction` / `gate` lines (the conductor and the gate own those), and does **not** fire on a
single gate passing.

Every scenario in [`scanner.feature`](./scanner.feature) maps to one of these behaviors:

| Behavior | What it covers |
|---|---|
| **Ship** | `→ implemented` (the impl gate writes it) drafts strategy from the successful mission's combat log |
| **Kill** | `→ deprecated` (the deprecation path writes it) drafts strategy from why the mission failed |
| **Milestone retro** | a human-held retro drafts strategy across the milestone's concluded combat logs |
| **Recurring pattern** | the distilled `cause` recurrence count (maintained mission-over-mission) drives a strategy to codify the pattern |
| **Drift / staleness** | a now-false convention or a governance contradiction drafts a **PRUNE** strategy |
| **Token-waste** | a flagged-waste `correction`, or session cost over a configurable bound, drafts efficiency strategy |
| **not per-gate** | a single gate passing without a terminal transition is **not** a trigger — the Scanner drafts nothing |
| **sole writer of strategy** | the Scanner is the only writer of `strategy`; the conductor and producers never write it |
| **observe, not write status** | the Scanner reacts to a terminal transition written elsewhere; it never writes `status` |
| **post-hoc persisted inputs** | the Scanner reads persisted files after a mission ends, never live subagent context |
| **draftable from the combat log alone** | every categorical dimension is draftable from the committed log; transcripts are additive, never required |
| **unratified + carries evidence** | every entry is `ratified: false` and carries the driving evidence (the distilled `cause` recurrence) |
| **lands in the one project ledger** | strategy appends to `ledger.jsonl` (root sibling), next `seq`, append-only — never an edit |
| **episodic surfacing** | strategy accumulates and surfaces episodically via the gateway's pending count, never synchronously blocking a mission |
| **out-of-loop routing** | a build/deprecate request → campaign; a structure observation → formation; a field correction → forge |

## The six triggers — lifecycle granularity, never per-gate

The loop fires only at lifecycle granularity. A single gate passing is **premature codification**
and draws no draft.

| Trigger | Fires on | Primary input | Drafts |
|---|---|---|---|
| **Ship** | `→ implemented` (impl gate) | the concluded mission's combat log + *[opt]* transcripts | strategy from a successful mission |
| **Kill** | `→ deprecated` (deprecation path) | the concluded mission's combat log — why it failed + *[opt]* transcripts | strategy from the failure |
| **Milestone retro** | a human-held retro | the milestone's concluded combat logs | strategy across the milestone |
| **Recurring pattern** | the same `cause` recurs across missions | the distilled count of **distinct CRs** exhibiting the `cause` in the ledger (not raw entry count), never a re-scan of many raw logs | strategy to codify the pattern |
| **Drift / staleness** | a now-false convention or governance contradiction | the corpus (conventions, governances) | a **PRUNE** strategy |
| **Token-waste** | a flagged-waste `correction`, or session cost over a configurable bound (pre-merge) | the categorical efficiency `correction` from the committed log (post-merge); raw transcripts add numeric depth (pre-merge / same-machine only) | efficiency strategy |

## Inputs — the concluded combat log vs transcripts (enrichment)

The Scanner reads **persisted artifacts post-hoc** — never live subagent context (subagents return
only their final message, and the Scanner always fires *after* a mission ends).

- **Combat log** — PRIMARY: the concluded mission's combat log (the plan's `*.log.jsonl`), read
  once at retro. Strategy is draftable from it **alone** for **every categorical dimension**; raw
  transcripts are additive, never required.
- **Raw `.jsonl` transcripts** — optional enrichment, harness-specific, and **may be absent
  post-merge** (another machine, the session gone). The **sole** transcript-only piece is the
  *numeric* token-waste depth.

The **token-waste dimension splits**: a coarse, **categorical** efficiency signal rides the
committed log as a `correction` (the conductor flags a class — **no raw counts**), so the
post-merge loop keeps the dimension; the **numeric** breakdown lives only in transcripts and is
**threshold-gated + pre-merge / same-machine only**. Consistent with the safe-to-publish floor
(`../../design/provenance-model.md`), **no raw token-cost number is written to the committed log**
— only the categorical class.

## Where each strategy entry lands

Every `strategy` entry lands in the **one project ledger** (`ledger.jsonl`, sibling of the root
`spec.md`) — there is no per-spec log to route to under the project-spec model. Every entry is
**unratified** and carries its **driving evidence** (the distilled `cause` recurrence from the
concluded combat logs); the ledger is append-only — the next `seq`, never an edit. The Scanner's
`handle` is `sdd-scanner`. The entry **shape** is owned by `../../design/provenance-model.md` and
`combat-log-governance` and is not restated here.

## Surfacing and the Council

The Scanner **accumulates** unratified strategy and surfaces it **episodically** — at a retro, on
demand, or when a threshold piles up — never synchronously blocking a mission. The `../../gateway/`
surfaces the **count of pending (unratified) strategy** when the Council re-enters; that is the
entry to keep-or-cut. On **ratify**, the strategy re-enters as a **new CR** that re-tunes the
**doctrine** (`design/`) and grows the corpus; on **cut**, it stays unratified and absent. The
Scanner neither convenes the Council nor prunes the corpus itself.

## Scenarios (colocated)

Unit scenarios for the Scanner loop (the six triggers, the sole-writer / observe-not-write / 
post-hoc invariants, the combat-log-alone reader coverage, episodic surfacing) **colocate** in
this folder. The cross-capability outcome — a ratified strategy re-tuning doctrine end-to-end —
lives in `../../acceptance/`.

## Source

- migrated from `plugins/sdd/skills/doctrine-loop/` + `plugins/sdd/agents/sdd-scanner.md`,
  refreshed to the project-spec ledger model (one `ledger.jsonl`, `handle: sdd-scanner`).
