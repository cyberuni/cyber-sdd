---
name: doctrine-loop
description: "Internal skill: the SDD doctrine loop — the Strategist's outer loop run by the Scanner. Fires at lifecycle granularity (terminal transition, milestone retro, recurring pattern, drift, token-waste), drafts unratified strategy to the combat log, and surfaces it for the Council's keep-or-cut. Invoked by the doctrine-loop delegate — not triggered by users directly."
metadata:
  user-invocable: false
  internal: true
---

# SDD Doctrine Loop

The **outer loop** of the SDD model. Owned by the **Strategist** and run by its delegate, the **Scanner in the Bunker** (`sdd-scanner`), parallel to the Operator running the mission loop. It fires at **lifecycle granularity, never per-gate**: it watches every spec reach a terminal state, drafts **strategy** (forward recommendations to revise governances, conventions, skills) from persisted artifacts post-hoc, and surfaces it to the human **Council** for keep-or-cut. Ratified, strategy re-tunes the **doctrine** and grows the **corpus**.

Load `sdd:combat-log-governance` for the **shape** of a `strategy` log entry and the matchable `cause` enum — this skill defers the entry shape there and never restates it.

## The split: detect-and-draft vs keep-or-cut

| Half | Holder | Cost | Effect |
|---|---|---|---|
| **Detect and draft** | the Scanner delegate | cheap, continuous, non-blocking | appends an **unratified** `strategy` entry to the combat log |
| **Keep or cut** | the human Council | accountable, high-blast-radius | ratify → re-tune doctrine + grow corpus; cut → strategy stays out |

No strategy enters the corpus without the Council's ratification. The Scanner is the **sole writer** of `strategy` entries; the orchestrator (`report` / `correction`) and the producers (nothing) never write them.

## The six use cases

Each is an entry-point: a lifecycle-grained trigger, its post-hoc input, and the strategy drafted. **A single gate passing is not a trigger** — the loop fires only at the lifecycle granularity below.

| Use case | Trigger | Input | Drafts |
|---|---|---|---|
| **Ship** | `→ implemented` (impl gate writes it) | the finished spec's combat log (**PRIMARY**) + *[opt]* transcripts | strategy from a successful mission |
| **Kill** | `→ deprecated` (deprecation path writes it) | the dead spec's combat log — why it failed (**PRIMARY**) + *[opt]* transcripts | strategy from the failure |
| **Milestone retro** | a human-held retro | the milestone's specs' combat logs | strategy across the milestone |
| **Recurring pattern** | the same correction recurs across missions | corrections-with-cause across N specs' combat logs, **grouped + counted by `cause`** | strategy to codify the pattern |
| **Drift / staleness** | a now-false convention or governance contradiction | the corpus (conventions, governances) | a **PRUNE** strategy |
| **Token-waste** | mission/session token cost over a **configurable bound**, **or** on-demand retro | the mission's raw `.jsonl` transcripts — **not** the combat log | efficiency strategy |

The Scanner **observes** the terminal transitions; it never writes spec `status`.

## Inputs: combat log (contract) vs transcripts (enrichment)

The Scanner reads **persisted artifacts post-hoc** — never live subagent context.

- **Combat log** — PRIMARY input, the contract. Strategy is draftable from it **alone**; raw transcripts are additive, never required.
- **Raw `.jsonl` transcripts** — optional enrichment, harness-specific. The **sole exception** is the token-waste dimension, which is transcript-backed (the token-usage breakdown lives only in transcripts) and **threshold-gated**: it runs the heavy analysis only over the configurable bound or on demand, and **not** under the bound without an on-demand request. No numeric threshold is baked in; no token-cost field is added to the combat log.

## Where each strategy entry lands

In the combat log of the spec the strategy is **about**, so every entry has one unambiguous home:

| Case | Lands in |
|---|---|
| Ship / kill / pattern-from-one-spec | that spec's combat log |
| Milestone retro | the milestone's anchoring spec's combat log |
| Recurring pattern across N specs | the spec where the pattern most strongly recurs |
| Drift | the spec carrying the now-false convention |

Every entry is **unratified** (`ratified: false`) and carries its **driving evidence** (the corrections-with-cause that drove it), per the shape in `combat-log-governance`. The ledger is append-only — the next `seq`, never an edit.

## Surfacing and ratification

The Scanner **accumulates** unratified strategy and surfaces it **episodically** — never synchronously blocking a mission. The `sdd` gateway surfaces the **count of pending (unratified) strategy** when the Council re-enters; that is the entry point to keep-or-cut. On **ratify**, the strategy re-tunes the doctrine and grows the corpus (a ratified **prune** removes the stale convention from the corpus). On **cut**, it stays unratified and absent from the corpus.
