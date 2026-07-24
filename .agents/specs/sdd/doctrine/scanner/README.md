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
**validating each plan/log-surfaced candidate against current code before it drafts** (a persisted
plan or log is history, not present truth — each candidate is a *hypothesis* refuted by a repro
against current code), drafting `strategy` only from the validated-still-open findings, landing it
unratified in the one project ledger, **emitting each validated-open improvement as a new tracked
issue**, and surfacing it episodically — never blocking a mission.

**Non-goals** — it does **not** write a spec's `status` transition (it observes one written
elsewhere), does **not** ratify or prune the corpus (the Council's positional act), does **not**
read live subagent context (only persisted artifacts post-hoc), does **not** write `report` /
`correction` / `gate` lines (the conductor and the gate own those), does **not** fire on a
single gate passing, and — **emitting a tracked issue is not dispatching work** — does **not**
ratify the strategy or open/spawn a mission from the issue (the issue is the actionable output; the
ledger line is the provenance; keep-or-cut stays the Council's).

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
| **leash block is not strategy** | the conductor's run-start block is `kind: leash`, never `strategy`; it does not collide with the Scanner's `strategy` nor count toward pending strategy |
| **observe, not write status** | the Scanner reacts to a terminal transition written elsewhere; it never writes `status` |
| **post-hoc persisted inputs** | the Scanner reads persisted files after a mission ends, never live subagent context |
| **validate before drafting** | a plan/log-surfaced candidate improvement is a *hypothesis* validated against current code before drafting; a gap the code already resolves is **cut**, a still-open gap is drafted; symmetric across plan and combat-log sources; validation reads current code, not the plan's assertion; a distilled retro lesson (not a gap claim) needs no check |
| **the cut disposition** | a cut is recorded durably as a `strategy` entry marked **`disposition: resolved`** carrying the resolving current-code evidence — a tombstone that emits no issue and is **not counted toward pending strategy**; a drafted still-open entry is **`disposition: open`** and counts; disposition is set once at write, never flipped (shape owned by `sdd:combat-log-governance`) |
| **issue emission** | each validated-**open** improvement is emitted as a **new tracked issue** (deduped against existing open/closed issues), cross-linking its evidence; a cut candidate emits none; the issue is the actionable output, the ledger line the provenance |
| **issue is not dispatch** | emitting an issue leaves the strategy **unratified** and spawns **no** mission — it neither ratifies nor dispatches; the issue body meets the outward-publish floor (self-contained, no production-internal reference) |
| **draftable from the combat log alone** | every categorical dimension is draftable from the committed log; transcripts are additive, never required |
| **unratified + carries evidence** | every entry is `ratified: false` and carries the driving evidence (the distilled `cause` recurrence) |
| **lands in the Scanner's own ledger shard** | strategy appends to the Scanner's own shard in the root-sibling `ledger/` dir, next `seq` within that shard, append-only — never an edit |
| **concurrent runs never contend** | two Scanner runs recording at the same time each write a distinct hash-suffixed shard file; neither edits the other's, so the appends never conflict |
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

## Validate before drafting — a plan or log is a hypothesis, not present truth

A persisted plan, combat log, or ledger line is **history**, not authoritative present truth. Every
candidate improvement it surfaces — a gap to build, a defect to fix — is a **hypothesis about the
current codebase**, refuted by a repro against current code (the repo's own principle: *a source-read
is a hypothesis*). The Scanner runs a **validation gate before the draft**: for each candidate, it
checks the CURRENT code — does the flagged gap still exist, or has it since been built / fixed /
superseded (by a later mission, a landed PR, a governance change)?

- **Resolved → cut.** A candidate current code already resolves is **cut**: the Scanner drafts **no**
  build-or-fix strategy for it and emits **no** issue. The cut is **explicit, never silent** — it is
  recorded durably as a `strategy` entry marked **`disposition: resolved`**, carrying the resolving
  current-code evidence (the repro that refuted the hypothesis), in the Scanner's own append-only
  ledger shard. The **shape of the `disposition` field is owned by `sdd:combat-log-governance`** (the
  same governance that owns the `strategy` entry) and is not restated here. A `disposition: resolved`
  entry is a **tombstone** — it is **not** an actionable recommendation, so it emits no issue and is
  **not counted toward pending strategy** at the gateway; it exists so the cut is auditable and so a
  later run does not silently re-surface the same closed candidate. The append-only invariant holds:
  the disposition is set **once at write**, never flipped — the Scanner's pre-draft validation cut
  (`disposition: resolved`) is a different act from the **Council's** keep-or-cut on a drafted
  `disposition: open` line (that verdict lives in the keep-or-cut plan, still not a field flip).
- **Still open → draft.** A candidate current code does **not** resolve is a real improvement: the
  Scanner drafts `strategy` for it marked **`disposition: open`** (unratified, evidence-carrying, as
  always — `open` is the default; legacy lines without the field grandfather as open), which **counts
  toward pending strategy**, and emits its issue.

This gate is what stops the loop reinforcing a **stale cache** — drafting "build X" for an X a later
mission already built. It applies to any candidate that asserts an **unmet gap or defect**, whether
surfaced by a **plan or a combat log** (symmetric: each source has both a resolved→cut and a
still-open→draft path); a pure distilled retro lesson (a success pattern, not a gap claim) carries no
gap to validate and is drafted without a current-code check.

## Improvement output — validated-open findings become tracked issues

The loop's **actionable output** for a validated-open improvement is a **new tracked issue**
(`gh issue create`) — a titled, bodied issue per real improvement, **cross-linking the evidence** that
drove it. This grounds the improvement plan in current code rather than the stale narrative of a
retired plan. The ledger `strategy` line remains the **provenance**; the issue is what a later mission
is started from.

- **Dedupe first.** Before filing, the Scanner dedupes against the forge's existing issues — **open
  and closed** (a still-open gap whose issue was already filed, or whose fix issue was since closed, is
  a match) — using at least two keyword combinations; on a mixed set it files only the unmatched.
- **Emit is not dispatch.** Emitting an issue **neither ratifies** the strategy **nor dispatches** work
  — it opens no CR and spawns no mission (admission to the mission graph is that graph's single writer's
  act; the issue re-enters SDD only when a **later** mission is started from it). Keep-or-cut stays the
  Council's.
- **Outward-publish floor.** The issue body meets the same **outward-publish floor** the handoff
  follow-up issues meet — that floor is defined in `../../mission/handoff/` and is **not restated
  here**: **self-contained**, no production-internal artifact reference, an **agent-filed marker**,
  and it names the evidence it was distilled from. The Scanner's issue is a doctrine-loop improvement
  (not a mission follow-up), so it reuses that floor rather than owning a second copy.

## Where each strategy entry lands

Every `strategy` entry lands in the **one project ledger** — the `ledger/` directory sibling of the root
`spec.md`, in the **Scanner's own hash-suffixed shard** (`strategy.<hash>.jsonl`); there is no per-spec
log to route to under the project-spec model, and two concurrent Scanner runs write distinct shards so
they never collide. Every entry is **unratified** and carries its **driving evidence** (the distilled
`cause` recurrence from the concluded combat logs); the shard is append-only — the next `seq` within it,
never an edit. The Scanner's `handle` is `sdd-scanner`. The entry **shape** is owned by
`../../design/provenance-model.md` and `combat-log-governance` and is not restated here.

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
lives in `../../workflows/`.

## Source

- migrated from `plugins/sdd/skills/doctrine-loop/` + `plugins/sdd/agents/sdd-scanner.md`,
  refreshed to the project-spec sharded-ledger model (`ledger/` dir of per-writer shards, `handle: sdd-scanner`).
