---
status: active
todos:
  - content: "explore: place + draft authoring/backfill (ordered workflow, per-step output)"
    status: completed
  - content: "explore: draft mission/resume (bar re-establishment on resume)"
    status: completed
  - content: "explore: revise authoring/spec-gate (behavior-correlated preflight corroboration)"
    status: completed
  - content: "explore: revise authoring/spec-producer (backfill mode enters the workflow)"
    status: completed
  - content: "spec gate: cold sdd-spec-judge to convergence, freeze touched .feature files"
    status: completed
  - content: "deliver: realize the four units as skills + the spec-judge agent"
    status: completed
  - content: "impl gate: cold sdd-impl-judge, pnpm verify green"
    status: in_progress
  - content: "BLOCKED on Council: regression stop at 61/62 — sequence github-24 first, override, or land at 61/62"
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

**HALTED at the impl gate a second time — a regression stop, and the decision is the Council's.**
Spec gate remains APPROVED (`c4ad9ec`); the frozen contract is intact and untouched by every round
since. The branch is rebased onto the current target and `pnpm verify` is green.

**Round 5 scored 61 of 62** (rounds: 61, 61, 62, 57, 61), no structural blocker, no absorption
finding. The prior halt's scope question was answered by the Council in the mission graph: the
mechanical reconciler is its own mission, `github-24-prose-block-reconciler` (issue #24), with
`github-25-plugin-judge-preflight` (#25) and `github-26-gate-spawn-scenario` (#26) split out beside
it, each carrying a `discovered-from` edge from this CR. That freed the round to sweep the six open
instances by hand, which it did (`bc9ad45`), plus two spec-body desyncs the finding list had not
named.

**The one failure.** `conductor.feature`, *"a backfill mode with no returned record still relays the
mode"*. The canonical dispatch payload block in `plugins/sdd/skills/start-mission/SKILL.md` states
`PRODUCER_BACKFILL_STEPS` is *"OMITTED on create/revise"* and never says what the conductor does when
it invoked **backfill** and the producer returned no record — the exact case the scenario tests. This
CR's own spec body for that node (`.agents/specs/sdd/mission/conductor/README.md`) resolves it
correctly; the skill a session actually loads does not carry the sentence.

**Why the loop stopped rather than patching it.** Rule 4 of `sdd:remediation-governance` is
diff-derived, not causation-derived: a finding is a **regression** when the artifact it names was
changed by the previous round's commits. `start-mission/SKILL.md` was changed by `bc9ad45`, and the
cited region is the block that commit edited. The rule is mechanical precisely so a producer cannot
argue its way past the stop, and the substance backs it here — **that block has been the failing
artifact two rounds running**, on two different completeness defects (round 4: a missing field;
round 5: an unstated case). Patching it a sixth time is the shape this CR exists to prevent.

**The decision needed — three options, none the agent's to self-assert.**

1. **Sequence #24 before this CR.** Add a RAW edge `github-24-prose-block-reconciler → github-3` so
   this CR waits on the reconciler that would catch the class mechanically. Structurally the honest
   answer: the CR installs a property it cannot self-verify. Cost: this CR does not land until #24
   does. The judge's strategist observation asks that #24's scope also widen to **cross-document**
   sweeps (a node's spec body vs. its enacting skill), not only within-file token matching — this
   round's failure is exactly what such a differ catches cheaply, and is the fifth instance of that
   shape across five rounds.
2. **Override the stop and land 62/62.** One sentence in the payload block mirroring the README's
   resolution. Determinate and almost certainly correct — and exactly the patching-past-the-signal
   the doctrine forbids. A deliberate, recorded Council override, not an agent self-assertion.
3. **Land this CR at 61/62** with the failing scenario carried as a known gap against #24. Requires
   an Oracle-lens judgment that the scenario is not fatal, which the impl gate's rollup rule does not
   currently permit — every frozen scenario needs a passing check to advance.

**State of the branch.** PR #7 is `MERGEABLE` and still a **draft**; CI green. It does not go
ready-for-review until this decision lands, since the impl gate has not passed.
