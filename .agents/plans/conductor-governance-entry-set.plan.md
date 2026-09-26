---
status: active
todos:
  - content: "explore: spec the conductor's governance entry-set load-and-declare duty"
    status: completed
  - content: "spec gate: cold sdd-spec-judge to convergence, conductor.feature stays frozen (additive)"
    status: completed
  - content: "deliver: start-mission governance section + reconcile the lazy-load clause"
    status: completed
  - content: "impl gate: cold sdd-impl-judge over the frozen scenarios, pnpm verify"
    status: completed
  - content: "handoff: commit, changeset if published surface changed"
    status: completed
---

# CR conductor-governance-entry-set — the conductor loads and declares its governances

Source: user request (no forge issue).

## Intent

`start-mission` named its governances in one dense sentence with no directive to follow them, and
the Resolution paragraph told the conductor to read every fixed-universal body **lazily** — so a
mission could reach intake bound by none of them, invisibly.

The change splits the set in two and makes the load visible:

- **entry set**, read before Step 1 — lifecycle, ownership, spec-format, suite-format,
  spec-producer, combat-log (each governs every mission)
- **deferred**, named up front and read at the decision that invokes it — gate-validation (at a
  gate), remediation (on a `change` verdict), impl-producer (at deliver)
- the conductor **declares its own `governances_loaded`** at entry, and each deferred one when it
  loads it — distinct from the `producer_governances_declared` it already relays

Spec node: `.agents/specs/sdd/mission/conductor/` (a 16th concern). Skill:
`plugins/sdd/skills/start-mission/SKILL.md`.

## NEXT

Landed. Spec gate approved round 2 (round 1 blocked on a defect this CR had introduced: deferring
`gate-validation` made the spec-judge's pre-flight unsatisfiable through the producer relay — fixed
by moving that bar into the entry set under a stated reach-not-phase rule, rather than re-opening the
frozen `spec-gate.feature`). Impl gate approved, `pnpm verify` green. No resume action remains.

## Observations (routed, not acted on)

Both from the cold spec-judge, owner `architect`:

1. **Rationale-in-`Given`.** `conductor.feature`'s "a bar that fires at one moment but is read
   downstream stays in the entry set" grounds its `Given` in a fixed fact about a sibling component
   (the spec-judge's own fixed-universal floor) rather than a conductor-buildable state. Verified
   true against that bar, so not a defect — but the pattern reads as rationale rather than test
   vector. Left as authored; a future author should not copy the shape blindly.
2. **Node-shape gap (corpus-wide, pre-existing).** `mission/conductor/README.md` is
   `spec-type: behavioral` but predates the four-section spec-format bar — it carries a concern
   table and per-concern sections, with no `## What` / `## Control Flow` / `## Scenario map`. This CR
   followed the standing convention additively rather than reshaping the node. Belongs to a Warden
   node-shape pass, not to this CR.
