# doctrine/ — the process outer loop

The **Doctrine loop** (metaphor) / **Process loop** (descriptive) — the step-5 outer loop that
evolves **how we work**: strategy, workflow, conventions. Actor: the **Strategist**. Run by its
delegate the **Scanner in the Bunker** (`sdd-scanner`), parallel to the conductor that runs the
inner mission loop. It fires at **lifecycle granularity, never per-gate**.

> **This README is a `descriptive` capability overview — an index, not a testable spec**
> (see the spec types in `../design/spec-structure.md`). It carries no `spec-type` marker,
> no `.feature`, and no `## Use Cases`; each behavior lives in a **behavioral** unit spec below,
> where the use cases map to that unit's suite. (Only a behavioral node carries `## Use Cases`; a
> descriptive index carries none.)

Standing subject: **the process — `design/`** (the methodology and its rules), and the broader
corpus of skills, governances, and conventions that doctrine is the principles slice of. The
Scanner watches every **mission** reach a terminal state, drafts **strategy** (forward
recommendations to revise governances, conventions, skills), and surfaces it to the human
**Council** for keep-or-cut.

## Detect-and-draft vs keep-or-cut

The loop splits into a cheap continuous half the delegate owns and an accountable half the human
holds:

| Half | Holder | Cost | Effect |
|---|---|---|---|
| **Detect and draft** | the Scanner delegate | cheap, continuous, non-blocking | drafts **unratified** strategy |
| **Keep or cut** | the human Council | accountable, high-blast-radius | ratify → strategy re-enters as a CR; cut → it stays out |

The Scanner is the **sole writer** of `strategy` entries; the conductor (`report` / `correction`)
and the producers (nothing) never write them. **No strategy enters the corpus without the
Council's ratification.**

## Units

The capability's behavior is realized by **two units of code**, each its own behavioral spec with
one `.feature`. The freeze grain is **per `.feature` file**. Cross-capability outcome (e2e)
scenarios — a ratified strategy re-tuning doctrine end-to-end — live in `../acceptance/`, never
here.

| Unit | Type | Spec | Role |
|---|---|---|---|
| **scanner** | behavioral | [`scanner/`](./scanner/README.md) | the Scanner detect-and-draft loop — the six lifecycle triggers, sole-writer of `strategy`, observe-not-write, post-hoc inputs (the combat log alone, transcripts additive), episodic surfacing; realized by the `sdd-scanner` agent loading the `doctrine-loop` skill |
| **plan-retirement** | behavioral | [`plan-retirement/`](./plan-retirement/README.md) | doctrine's last retro step — the gated, idempotent **tracked deletion** of a retired plan (`<cr-ref>.plan.md` + `<cr-ref>.log.jsonl`) once its source is done/merged **and** distilled; realized by the `plan-retirement` `.mts` skill |

## Strategy → doctrine → corpus

Three distinct things, by time-direction: **strategy** is the Scanner's *forward* output
(situational, transient until ratified); **doctrine** is the *principles* layer (`design/`,
re-tuned by ratified strategy); the **corpus** is the *full durable body* every other delegate
reads from (skills, governances, conventions, templates), which ratified strategy grows. The
entry **shape** and the ledger it lands in are owned by `../design/provenance-model.md` and
`combat-log-governance`; this index does not restate them.

## Boundaries — Doctrine owns the process only

It routes out-of-loop requests: a build-or-deprecate request → `campaign/`; a structure
observation → `formation/`; field corrections → `forge/`. Doctrine grows *how we work* and
nothing else.
