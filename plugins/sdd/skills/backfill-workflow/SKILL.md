---
name: backfill-workflow
description: "Partial Skill: invoke by name only — the SDD backfill workflow: the five ordered steps that derive a spec + suite from behavior already in code, each owing a named entry in one step record. Loaded by the spec-producer in backfill mode, not user-triggered."
user-invocable: false
---

# Backfill Workflow — derive a spec + suite from behavior that already shipped

The ordered procedure the **spec-producer** runs when the behavior it is specifying **already
exists in code**. Five steps, each owing a **named entry** in one **step record** the producer
returns.

The steps are not new — their content rules live in `sdd:spec-format-governance` and
`sdd:suite-format-governance`, and this workflow **sequences** those homes rather than restating
them. What is new is that each step now owes something a reader can point at, so a **skipped step is
visible** instead of looking exactly like a step that ran and found nothing.

Why the sequencing needed a home: a backfill's input is a working implementation, and a working
implementation is **persuasive**. It answers every question you think to ask, so the cheapest route
is to read it, write down what it does, and stop. That route produces a spec that reproduces the code
and can never say what the code is **missing**. The decision that a backfill *derives rather than
patches* is ADR-0029; this is the workflow that enacts it.

## The five steps

Run them in order — each one's input is the previous one's output.

| # | Step | The entry it owes | Rule it runs under |
|---|---|---|---|
| 1 | **read the source** | the read-set it read — the files, entry points, and tests the behavior lives in | — |
| 2 | **enumerate the actors and their goals** | the actor-to-goal list, **drawn by actor** | `sdd:spec-format-governance` |
| 3 | **recover the unserved goals** | each unserved goal with **where it came from**; or `none` naming **where it looked**; or `none` naming **the limitation** when there is no reachable tracker | `sdd:spec-format-governance` |
| 4 | **draw the graph** | the drawn `## Control Flow` | `sdd:spec-format-governance` |
| 5 | **re-derive the scenario set** | the `## Scenario map` rows and the `.feature`, plus any **stale claims** dropped | `sdd:suite-format-governance` |

Three rules carry most of the value, and each is the one a shortcut skips first:

- **Step 2 enumerates by actor, never by entry point.** Walking the interface returns only the use
  cases the interface already implies and is structurally blind to the one nobody built.
- **Step 3 is not optional and not inferable from source.** Source yields the **served** goals by
  construction; the unserved ones live in the issue tracker, the request history, and recurring
  workarounds. A candidate the search returns that the source **does** serve is not an unserved goal —
  record it among step 2's served goals and leave it out of entry 3. A step-3 entry reading `none`
  must say **why it is empty**, and the two empty cases
  are **different entries**:
  - **searched and found nothing** — the entry names **where it looked**;
  - **no reachable tracker** — the entry names **the limitation** (`none — no reachable tracker`),
    because the step could not run as specified. Recording where you *did* look while staying silent
    about the tracker being unreachable hides the limitation.

  A step that ran and found nothing, a step that could not run, and a step that was never run are
  three different states, and they are indistinguishable unless the entry says which one it was.
- **Step 5 re-derives the whole scenario set from step 4's edges.** Any pre-existing `.feature` is
  **reference only** — each entry is a claim to verify against the current code, never the baseline
  to patch. An entry the current source contradicts is reported as a **stale claim** and dropped; an
  entry survives only where an edge derives it. Every stale claim you drop is named in step 5's entry
  — dropping one silently leaves the record claiming a re-derivation it cannot evidence.

## The step record

Return the record as **`BACKFILL_STEPS`** in your structured output — one entry per step, each
naming **what that step produced**, or `none` **and where it looked**. It is provenance about how the
node was derived: never written into `spec.md` or the `.feature`, and relayed to the spec-judge
alongside the mode the conductor invoked (`sdd:combat-log-governance` for the wider provenance split).

**A record missing an entry means the backfill is incomplete.** Report the missing entry rather than
returning the node as complete. Reporting it does not withhold the work from the gate — an incomplete
record is relayed verbatim and is the gate's finding to make, not yours to suppress.

**The record is corroborated by correspondence, not by length.** The gate checks each entry against
the artifact that entry claims to have produced; the per-step mapping is owned by the spec
gate and stated there, not repeated here. A record with the right number of entries whose content matches nothing is a
fabrication and fails. Counting entries would make the record one more list, which is the shape this
mechanism exists to get away from.

## Re-derivation is the remediation unit

On a `change` verdict against a node this workflow produced, the findings are **evidence about the
derivation**, not a work order against the lines they cite. The general bar is
`sdd:remediation-governance`; this workflow owns the one thing that bar leaves open — **what the unit
of repair is** when the artifact was derived rather than written.

The unit is the **node**, re-derived from its graph:

1. Read each finding for the **step** it implicates.
2. Re-enter at the **earliest** such step.
3. Re-run that step and **every step after it**, each writing a fresh entry.
4. Steps **before** the re-entry point keep the entries they already have — nothing the findings
   touched was derived from them.

It is **not** a re-run from the top, and it is **not** an edit of the cited lines. Editing a later
output while an earlier one it was derived from still stands stale is how three rounds of patching
produce a fourth round of findings.

Bounded on both sides:

- Findings that implicate **no** step — a wording defect in prose the workflow does not produce, a
  reference that no longer resolves — are answered under `sdd:remediation-governance` alone.
  Re-running the workflow for them buys nothing.
- The **regression** rule still governs the loop: a finding naming an artifact the previous round's
  commits changed stops the loop for a **re-plan** rather than opening another round. That decision
  is `sdd:remediation-governance`'s and is not re-made here.

## Scope

Backfill only. A node authored in the producer's `create` or `revise` mode never enters this
workflow and returns no step record.

## Key points (read-check)

1. **Five ordered steps, each owing a named entry** — the entry is the mechanism; a skipped step is
   invisible without it.
2. **Enumerate by actor (step 2), and recover the unserved goals from the tracker (step 3)** — source
   yields only the served goals by construction.
3. **`none` says why it is empty** — *searched and found nothing* names where it looked, *no reachable
   tracker* names the limitation, and an omitted entry is neither.
4. **Re-derive the whole scenario set from the drawn graph (step 5)** — a standing suite is reference
   only, and an entry the source contradicts is a stale claim, not a scenario to keep.
5. **A record missing an entry means the backfill is incomplete** — report it; do not suppress it.
6. **The remediation unit is the node re-derived from its graph** — re-enter at the earliest
   implicated step, re-run everything downstream, leave what precedes it alone.
