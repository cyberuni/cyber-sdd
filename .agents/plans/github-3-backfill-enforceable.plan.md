---
status: active
todos:
  - content: "explore: place + draft authoring/backfill (ordered workflow, per-step output)"
    status: pending
  - content: "explore: draft mission/resume (bar re-establishment on resume)"
    status: pending
  - content: "explore: revise authoring/spec-gate (behavior-correlated preflight corroboration)"
    status: pending
  - content: "explore: revise authoring/spec-producer (backfill mode enters the workflow)"
    status: pending
  - content: "spec gate: cold sdd-spec-judge to convergence, freeze touched .feature files"
    status: in_progress
  - content: "deliver: realize the four units as skills + the spec-judge agent"
    status: pending
  - content: "impl gate: cold sdd-impl-judge, pnpm verify green"
    status: pending
  - content: "handoff: changeset, commits, PR against main referencing issue #3"
    status: pending
---

# CR github-3 — make the backfill workflow enforceable

Source: https://github.com/cyberuni/cyber-sdd/issues/3

## Intent

The backfill procedure is already correctly specified across `spec-format-governance` and
`suite-format-governance`. Nothing in the workflow makes the specified steps *happen*: declaring a
governance is free, reading it is not, and no check correlates the declaration with behavior. This CR
closes that seam at four points.

## Scope (four units)

1. `authoring/backfill/` (new behavioral node) — backfill as an ordered workflow whose every step
   emits a checkable output, replacing rules distributed across two governance documents.
2. `authoring/backfill/` remediation face — on a `change` verdict against a backfilled node the
   remediation unit is **re-derivation of the node from its CFG**, not edits to the cited lines.
3. `mission/resume/` (new behavioral node) — resume re-establishes the **bars** for the role being
   resumed, not only the decisions; today a resumed session can run a whole gate with no bar opened.
4. `authoring/spec-gate/` (revise) — the governance pre-flight gains a **corroboration** stage: a
   mechanically checkable tell per declared bar that only a producer who read it satisfies.

## Working method

SDD's own mission loop, conductor in-session. Producer inline under `spec-producer-governance`; cold
`sdd-spec-judge` at the spec gate, cold `sdd-impl-judge` at the impl gate. Commit per unit of work.
`pnpm verify` before every commit.

## Resolved decisions

- Placement: `authoring/backfill/` and `mission/resume/` are `<capability>/<unit>` under the declared
  `capability-first` strategy. `mission/checkpoint/` already records resume as its un-noded sibling.
- The re-derivation remediation rule is homed on the backfill node (its remediation face) and
  referenced from `remediation-governance` — one home, no duplication.
- No new engine: the corroboration tells are checked by the spec-judge, keeping the CR spec+doc only.
- **Council input (relayed via operator).** Producers repeatedly declare bars they did not read —
  recurring, not the issue's honest-omission case. Proposal 4 is therefore the priority: every check
  that reads the declaration is defeated by the same move, so a second list-shaped check buys
  nothing. The corroboration stage ships **four tells** across both bars, preferring properties whose
  wrong behavior is silent rather than an obvious blank.
- **Council question answered — a cold spec-producer is a complement of already-realized value, not
  a substitute, and no new cold-spawn mechanism ships here.** Three reasons, in order of weight:
  (1) the spec-producer is architecturally **inline** — it holds the live grill that defines explore
  (`start-mission` step 2); spawning it cold removes the user channel from the phase, a large
  structural cost for a mechanism that does not change what the check reads. (2) Coldness is already
  applied where it is cheap and it did not close the gap: both judges are cold by ADR-0016, and the
  mission the issue describes ran **three cold judge rounds** without surfacing four skipped bars.
  (3) The part of coldness that does pay — discarding context that could substitute for a file read —
  is exactly proposal 3's per-segment bar re-establishment, which buys it without breaking the grill.
- **The tells are a mirrored duty.** The producer self-checks them before returning and the judge
  corroborates them at pre-flight. The ledger shows the declaration check catching skipped bars at
  round 1 repeatedly — each costing a full cold round; a producer-side self-check spends none.

## Re-plan (after the round-2 regression stop)

The remediation loop stopped: two of round 2's findings were regressions against round 1's own
remediation. These are changes of approach, not another round of edits.

- **Fork 1 — the step-record tell was opt-in by the party it polices.** Gating it on the producer
  *declaring* `sdd:backfill-workflow` lets a producer that skipped the workflow omit the declaration
  and never be checked. **New approach: gate on the mode.** The conductor invokes the producer in
  create / revise / backfill mode, so the mode is the *conductor's* knowledge, not the producer's
  claim; it relays `producer_mode` and the tell fires on `backfill` whatever the producer declared.
  Rejected alternative: adding the bar to the resolution matcher, which would fire on every revise CR.
- **Fork 2 — "added or changed" is undefined for a table row.** A one-clause edit to one cell
  inherits the node's whole history, which is the failure the rule exists to prevent, moved from file
  scope to row scope. **New approach: the unit is a use case the CR *added*** — the unit the producer
  is actually accountable for. Same narrowing for the surface-trace and guard-companion tells.
- **Fork 3 — the coverage overclaim.** State the limit: for a CR touching none of the applicable
  elements, no tell applies and the stage is a no-op. 36 of 42 behavioral nodes carry no scenario map.
- **The backfill node is rewritten whole**, not patched — its own rule, and the file is truncated.

## NEXT

Spec gate: round 1 FAIL (5 findings), round 2 FAIL (4 findings, 2 of them regressions) → loop
stopped and re-planned per the block above. Explore covers six units:
`authoring/backfill/` (new), `mission/resume/` (new), and additive revisions to
`authoring/spec-gate/`, `authoring/spec-producer/`, `mission/conductor/`, and `workflows/`.
Every frozen `.feature` touched classifies ADDITIVE, so each self-clears and stays `@frozen`;
no Clearance is owed. `pnpm verify` green 6/6.

Two producer-side corrections were made before dispatch, both self-found:
1. the step record had no relay seam — the corroboration stage read an artifact nothing carried
   to the judge. Added `producer_backfill_steps` on `mission/conductor/` (README + 3 scenarios),
   mirroring the existing `producer_governances_declared` relay.
2. four scenarios sat on plain sequence edges no wrong subject could fail. Re-authored so an
   enumerate-by-entry-point subject, a patcher, and a bar-inheriting resumed segment each lose.

After the gate: deliver the six units as skills + the spec-judge agent, changeset, PR.
