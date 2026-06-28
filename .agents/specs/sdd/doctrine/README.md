# doctrine/ — the process outer loop

The **Doctrine loop** (metaphor) / **Process loop** (descriptive) — the step-5 outer loop that
evolves **how we work**: strategy, workflow, conventions. Actor: the **Strategist**. Run by its
delegate the **Scanner in the Bunker** (`sdd-scanner`), parallel to the conductor that runs the
inner mission loop. It fires at **lifecycle granularity, never per-gate**.

Standing subject: **the process — `design/`** (the methodology and its rules), and the broader
corpus of skills, governances, and conventions that doctrine is the principles slice of. The
Scanner watches every spec reach a terminal state, drafts **strategy** (forward recommendations
to revise governances, conventions, skills), and surfaces it to the human **Council** for
keep-or-cut.

## Detect-and-draft vs keep-or-cut

| Half | Holder | Cost | Effect |
|---|---|---|---|
| **Detect and draft** | the Scanner delegate | cheap, continuous, non-blocking | drafts **unratified** strategy |
| **Keep or cut** | the human Council | accountable, high-blast-radius | ratify → strategy re-enters as a CR; cut → it stays out |

The Scanner is the **sole writer** of `strategy` entries; the conductor (`report` / `correction`)
and the producers (nothing) never write them. **No strategy enters the corpus without the
Council's ratification.**

## Output — emits new CRs

The Scanner drafts strategy to the **ledger** (the durable `ledger.jsonl` sibling of the root
`spec.md`) and **accumulates** it, surfacing it **episodically** — at a retro, on demand, or
when a threshold piles up — never synchronously blocking a mission. The `gateway/` surfaces the
**count of pending (unratified) strategy** when the Council re-enters; that is the entry point
to keep-or-cut. On **ratify**,
the strategy re-enters as a **new CR** (`intake/README.md`) that re-tunes the
**doctrine** (`design/`) and grows the corpus; on **cut**, it stays unratified and absent.

The Scanner **observes** the terminal transitions; it **never writes** spec `status`.

## Triggers — the six use cases

A single gate passing is **not** a trigger. The loop fires only at the lifecycle granularity
below:

| Use case | Trigger | Input | Drafts |
|---|---|---|---|
| **Ship** | `→ implemented` (the impl gate writes it) | the concluded mission's combat log (**PRIMARY**) + *[opt]* transcripts | strategy from a successful mission |
| **Kill** | `→ deprecated` (the deprecation path writes it) | the concluded mission's combat log — why it failed (**PRIMARY**) + *[opt]* transcripts | strategy from the failure |
| **Milestone retro** | a human-held retro | the milestone's concluded combat logs | strategy across the milestone |
| **Recurring pattern** | the same correction recurs across missions | the **distilled `cause` recurrence count** in the ledger (maintained mission-over-mission), never a re-scan of many specs' raw logs | strategy to codify the pattern |
| **Drift / staleness** | a now-false convention or governance contradiction | the corpus (conventions, governances) | a **PRUNE** strategy |
| **Token-waste** | mission/session token cost over a **configurable bound**, **or** on-demand retro | the mission's raw `.jsonl` transcripts — **not** the combat log | efficiency strategy |

## Inputs — the concluded combat log vs transcripts (enrichment)

The Scanner reads **persisted artifacts post-hoc** — never live subagent context.

- **Combat log** — PRIMARY input: the **concluded mission's** combat log (the plan's
  `*.log.jsonl`), read once at retro. Strategy is draftable from it **alone**; raw
  transcripts are additive, never required. The combat log is **committed but transient in
  the tree**: the Scanner **distills early** (at `→ implemented`), and the **doctrine loop
  deletes the plan later** as a tracked deletion — a separate retro step gated on source =
  `done`/merged **and** distilled (Plan retirement, `../design/provenance-model.md`).
- **Raw `.jsonl` transcripts** — optional enrichment, harness-specific. The **sole exception**
  is the token-waste dimension, which is transcript-backed (the token-usage breakdown lives only
  in transcripts) and **threshold-gated** — it runs the heavy analysis only over the configurable
  bound or on demand, never under the bound without an on-demand request. No numeric threshold is
  baked in; **no token-cost field is added** to the combat log.

## Where each strategy entry lands

Every `strategy` entry lands in the **one project ledger** (`ledger.jsonl`, sibling of the root
`spec.md`) — there is no per-spec log to route to under the project-spec model. Every entry is
**unratified** and carries its **driving evidence** (the distilled `cause` recurrence that drove
it, from the concluded combat logs); the ledger is append-only — the next CR-scoped `seq`, never
an edit. The entry **shape** is owned by `design/provenance-model.md` and is not restated here.

## Strategy → doctrine → corpus

Three distinct things, by time-direction: **strategy** is the Scanner's *forward* output
(situational, transient until ratified); **doctrine** is the *principles* layer (`design/`,
re-tuned by ratified strategy); the **corpus** is the *full durable body* every other delegate
reads from (skills, governances, conventions, templates), which ratified strategy grows.

## Plan retirement — doctrine's last retro step

Doctrine **owns plan retirement** (`../design/provenance-model.md`, Plan retirement). Because
plans are now **tracked** (committed with the work, not gitignored), they are removed from the
tree by a deliberate, gated act — never a gitignore side effect:

- **Distill and delete are decoupled.** The distill fires at `→ implemented` (step 3, before
  the PR exists); the **delete** is a separate, later act — doctrine's **last retro step**.
- **The retirement sweep** globs `.agents/plans/*.plan.md` and, for each `<cr-ref>`, queries
  its **source** status natively (the `cr-ref` is source-qualified — `github-34` → GH issue
  #34, `asana-<gid>` → Asana, `local-<slug>` → the local store). It deletes
  `<cr-ref>.plan.md` + `<cr-ref>.log.jsonl` (a **tracked deletion**) **only when** the source
  is `done`/merged **AND** the plan has been distilled. It is **idempotent** — a missing plan
  or an open CR is a no-op, so the sweep is safe to re-run (CI post-merge invocation optional).
- Never delete an un-distilled plan (the retro never ran); deletion runs only after the
  distill has written strategy/recurrence to the ledger.

Delivered as a non-user-invocable skill carrying a self-contained `.mts` script (the repo's
node-≥23.6 / no-deps convention; agent fallback when `node` is absent).

## Boundaries — Doctrine owns the process only

It routes out-of-loop requests: a build-or-deprecate request → `campaign/`; a structure
observation → `formation/`; field corrections → `forge/`. Doctrine grows *how we work* and
nothing else.

## Scenarios

Unit scenarios for the loop colocate in this folder; cross-capability outcome scenarios (a
ratified strategy re-tuning doctrine end-to-end) live in `acceptance/`.
