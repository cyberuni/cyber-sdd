# ADR-0029: Backfilling a spec draws the CFG and re-derives the suite from it

## Status

Accepted

## Context

When a spec is written **after** the implementation already exists (a *backfill*), two failure modes
recur, and a sweep of the ACED eval-suite corpus (CR-304-M1) surfaced both at scale.

1. **Incomplete specs.** The `spec.md` shape is four sections — `## What`, `## Use Cases`,
   `## Control Flow` (the control-flow graph), `## Scenario map` — a stated gate requirement
   (`spec-format-governance`). An audit of the ACED corpus found **only 3 of ~22 leaf nodes carried
   all four**; every other node stopped at `## Use Cases`, with no CFG drawn and no scenario map. The
   backfill producer specified entry points and nothing more.

2. **Patched, not derived, suites.** Even where a suite existed, the method used was "read the
   standing `.feature`, patch the gaps a diff notices." On the `contribute-skill` node the retired
   golden set was 16/16 "covered," yet drawing the CFG and re-deriving from it still surfaced a
   missing positive companion for the fork guard (an *always-fork* mutant survived the suite) and an
   uncovered multi-skill edge.

Nothing caught either: `check-spec-structure` checked only `untagged-node` and `oversized-node`, so a
spec missing its CFG and scenario map passed every mechanical gate. "The producer skipped the CFG"
never became "the gate blocks."

## Decision Drivers

- A backfilled spec must be as complete as a greenfield one — the code existing is not a licence to
  stop at Use Cases.
- The suite must be a faithful projection of the capability's decisions, not an accretion patched
  around a stale corpus.
- The requirement must be enforced, not merely stated, or it silently rots corpus-wide.

## Decision

On a **backfill**, the producer **draws the `## Control Flow` CFG from the code and re-derives the
whole scenario set from its edges** — one scenario per `(path class, edge)` pair, every guard paired
with a positive companion, the `## Scenario map` bound 1:1. Any pre-existing `.feature` or retired
golden set is **reference only**: each entry is a *claim to verify against the current code*, never the
baseline to patch.

The rule is split by ownership across the two format governances both spec-producers already load:

- **`spec-format-governance`** carries the *structure* duty — on backfill the four sections stay
  mandatory; draw the `## Control Flow` CFG and `## Scenario map`.
- **`suite-format-governance`** carries the *derivation* duty — re-derive the scenario set from the
  CFG edges; the standing suite / corpus is reference only.

`spec-producer-governance` and `aced-scenario-writer` point at each at their `spec.md` and `.feature`
steps. Enforcement lives in **`check-spec-structure`**'s new `incomplete-node` check — **advisory**
while a corpus is migrated to the four-section shape, then flipped to **blocking** by a follow-up.

## Rationale

Reading the standing suite and filling only the diff's gaps leaves stale scenarios in place (a rule
the implementation reversed still specified) and misses the edges the CFG mandates but the old corpus
never covered — a fully-mined corpus is not evidence of a healthy suite. Deriving from the CFG forces
every edge to justify a scenario and every scenario to trace to an edge, so the suite becomes a
projection of the design rather than an artifact of what a diff happened to notice.

Placing the rule in the two format governances (rather than duplicating it into each producer's
procedure) means every producer that loads them — the SDD default, ACED's `aced-scenario-writer`, and
any future plugin producer — inherits it from one source with no mirror to drift.

## Consequences

### Positive

- Backfilled specs carry the CFG and scenario map, so coverage is visible and the suite is auditable.
- The `incomplete-node` check makes the four-section requirement real and surfaces the backlog
  (23 advisory findings across the ACED corpus at introduction).

### Negative

- Backfill is more work up front — the CFG must be drawn, not skipped.

### Risks

- Flipping `incomplete-node` to blocking before a corpus is fully migrated would red CI; the advisory
  stage is timed to the remediating sweep.

## Implementation Notes

- `check-spec-structure` `incomplete-node` ships advisory; a follow-up flips it to blocking once the
  corpus is clean.
- The ACED CR-304-M1 sweep is the remediation, rebuilding each leaf node to the four-section shape
  one at a time.

## Related Decisions

- [ADR-0028](0028-suite-design-test-levels.md) — suite design and test levels; this refines how a
  backfilled suite is produced.
