---
spec-type: behavioral
concept: corpus-structure
---

# dedupe-specs — propose collapsing overlapping scope

The **dedupe-specs** procedure: read a candidate set of project specs, find where their **What**,
design decisions, and `.feature` scenarios **substantially overlap** (not incidental shared
vocabulary), and **propose a dedupe plan** — which spec survives and which fold into it. It owns the
overlap **analysis only**: it never scaffolds, rewrites, or deletes an artifact, never writes
`status`/`approval`/freeze, and requires **explicit approval** before any structural change. The
*act* of executing a confirmed plan belongs to [`../../formation/`](../../formation/README.md); this
tool computes and proposes.

## Use Cases

**Subject** — analyzing a candidate set for overlap and proposing a survivor + folds.
**Non-goals** — it executes nothing, runs no human checkpoints (that is formation's act), and never
reconciles prose↔suite drift (that is `align-specs`). It compares whole specs at the cross-project
tier; intra-project folder reorg is plain editing and needs no tool.

| Trigger | Inputs | Outcome |
|---|---|---|
| **dedupe a candidate set** — two-or-more specs may overlap | a candidate set of spec folders | a **dedupe plan**: the proposed survivor, the specs that fold into it, what moves, and a per-choice rationale — or, where no winner is clear, the peers handed to the user |

Every scenario in [`dedupe-specs.feature`](./dedupe-specs.feature) maps to this entry point or to
the write-free / freeze boundary that closes this spec.

## What counts as overlap

Overlap is **substantial shared scope** — the same What, the same design decisions, or the same
asserted behavior — not two specs that merely share vocabulary. Incidental shared terms are not
overlap and are not proposed for merge.

## Survivor selection is proposed, never assumed

The survivor (most complete coverage, most advanced status) is **proposed with reasons**. Where the
candidates are peers with no clear winner, the choice is handed to the **user** rather than guessed.

## The write-free boundary

- The tool **writes nothing** and applies no change; it emits a plan and stops.
- A structural change requires **explicit approval** first.
- A **frozen** survivor (`approved`/`implemented`) routes through the **draft re-open** path before
  any scenario moves — a frozen `.feature` is never rewritten without the ratified re-open.
