---
name: dedupe-specs
description: Use this skill when two specs cover overlapping behavior or two artifacts contradict each other — produce a dedupe-or-reconciliation proposal naming the artifacts, so each behavior has exactly one home and no contradiction stands, with human confirmation of both the plan and the result.
metadata:
  internal: true
---

# dedupe-specs

Resolve **overlap** between specs and **contradictions** between artifacts so the corpus holds each behavior in exactly one home and no internal contradiction stands. The Formation-loop station for the Warden's dedupe and reconcile acts — the structural counterpart to `split-spec` (which decomposes a monolith; this one merges overlap and reconciles contradiction).

A dedupe is **not mechanical deletion**, and a reconciliation is **not picking a winner at random**. A behavior may genuinely belong in one spec over another; a contradiction may resolve either way. This station therefore pairs **actor-owned structural correctness** with **two human confirmation checkpoints** — the human owns where each behavior lives and which artifact wins.

Load `sdd:lifecycle-governance` (status transitions, the freeze re-open transition), `sdd:ownership-governance` (write-ownership, freeze write-constraint), and `sdd:spec-governance` (the `## Use Cases` rule and the one-behavior-one-home expectation).

## Actors

- **Architect leads** — overlap and contradiction are structural-fit problems: which spec is the true home for the overlapping behavior, and which artifact's claim holds? The Architect proposes the resolution.
- **Oracle** — checks the surviving home is a **coherent scope unit** and that resolving the contradiction does not orphan a real behavior.
- **Builder** — checks **coverage survives**: every overlapping scenario lands in exactly one home, none orphaned, none left duplicated; the reconciliation leaves the contract testable.
- **Council (human)** — owns the corpus; confirms both the plan and the result.

## Precondition — the targets must be writable

If a target spec is `approved` or `implemented`, its `.feature` is **frozen**. Deduping or reconciling is a structural change; confirm the freeze re-open was ratified by the Council (carried by the relay) before editing. Never rewrite a frozen `.feature` without the ratified re-open.

## Phase 1 — produce the proposal (Architect-led)

Produce a **human-readable proposal that names the artifacts**, not a diff:

- **the artifacts**: name the overlapping specs (for a dedupe) or the contradicting artifacts (for a reconciliation) explicitly — by path — so the proposal is unambiguous about what it touches.
- **the resolution**: for overlap, which spec becomes the **single home** for the shared behavior and what moves where (each behavior one home — no duplication left standing); for contradiction, **which claim holds** and how the losing artifact is amended so the contradiction is removed (no contradiction stands).
- **the coverage check**: each overlapping scenario → exactly one home (Builder check — no orphans, no remaining duplicates).
- **the edges**: any `blocked-by` / `subtasks` changes the resolution implies.
- a one-line **rationale**: why this home / this winning claim is the right structural call.

## Checkpoint 1 — Council confirms the plan

Escalate the proposal to the Council through the relay (`STATUS: needs-input`) **before changing anything**. The Council may pick the other home, choose the other claim, or reject the merge entirely. Execute only the confirmed proposal.

## Phase 2 — execute the confirmed proposal

- Move each overlapping behavior into its single home; remove the duplicate from the loser (or deprecate the absorbed spec per `lifecycle-governance`).
- Amend the losing artifact so the contradiction is gone; the corpus holds no internal contradiction.
- Rewire any `blocked-by` / `subtasks` edges the resolution implies.
- Builder verifies total coverage is preserved; Oracle verifies each surviving home is coherent; Architect verifies no overlap or contradiction remains.

## Checkpoint 2 — Council confirms the result

Escalate the resulting set to the Council through the relay (`STATUS: needs-input`) **before committing** — a review that each behavior now has one home and no contradiction stands, not just that the edit applied. The Council may send the resolution back for reshaping.

## Report

- The artifacts named; the home chosen (dedupe) or the claim that held (reconciliation)
- Coverage check: every overlapping scenario in exactly one home, none orphaned or duplicated; no contradiction remains
- `blocked-by` / `subtasks` edges changed
- Both confirmations recorded; any reshaping done
- Next step: each touched spec flows through its own gate (`validate-spec`); refresh the graph (`render-spec-graph`)

## Commit

Only commit after **both** confirmations and a clean coverage/contradiction check. Stage every touched spec together (one coherent resolution):

```
refactor(specs): dedupe <domains> into one home / reconcile <artifacts>
```
