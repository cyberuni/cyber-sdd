---
concept: delivery
---

# mission/delivery — the deliver phase (step 3): build to keep

The **deliver phase** of the Mission Loop — step 3, **build to keep**. It runs against the
**frozen** `.feature` (the spec gate has closed) and ends at the **impl gate** (Approved →
Implemented). The orchestrator that sequences this phase is [`README.md`](README.md) (the
[`conductor`](conductor/README.md) unit); this doc holds the deliver-phase production detail,
not the loop logic or the gate-verdict mechanics.

> **This is a `descriptive` phase overview — an index, not a testable spec**
> (see the spec types in `../design/spec-structure.md`). It carries no `spec-type`
> marker, no `.feature`, and no `## Use Cases`; each behavior lives in a sibling **behavioral** unit
> spec — [`impl-producer/`](impl-producer/README.md) and [`impl-judge/`](impl-judge/README.md).

**Explore vs deliver** is the *purpose of the build*: explore (step 2, `../authoring/`) builds
to **learn** against the still-draft contract; deliver builds to **keep** against the frozen
contract. The **freeze is the boundary**. Implementation happens in both — deliver is the one whose
output is kept.

## The deliver read-set — the frozen suite is the contract

At deliver the contract is **the frozen `.feature`**, not the prose. So the read-set is scoped, not
the whole node:

- **read** the frozen `<unit>.feature` (the contract to build against), the optional
  `<unit>.solution.md` (the chosen approach + rejected alternatives — design rationale the code can't
  show), and the **implementation files for the touched artifact-type** (scoped via `produced-by` /
  `resolve-governances`, not the whole tree);
- **do not re-read** the prose unit spec (`README.md` / `## Use Cases`) — that was *explore's* input to
  author the suite; once frozen, the `.feature` carries the contract and the prose adds no constraint
  the suite doesn't already encode. `spec.md` is kept in sync but is not a deliver input
  (`../design/lifecycle-model.md`).

This keeps the per-mission read cost proportional to what changed — the frozen scenarios plus the
touched impl — rather than re-reading the full node every cycle.

## Units

The deliver phase produces the artifacts the impl gate judges. Its two units split on the
**producer ≠ judge** line: the impl-producer builds, the cold impl-judge grades. The unit of test
is the skill — **one `.feature` per unit**. The gate's verdict mechanics, the leash, self-assertion
vs stop, and positional ratification authority are the [`conductor`](conductor/README.md) unit's,
not these. Cross-capability outcome (e2e) scenarios live in `../acceptance/`.

| Unit | Type | Spec | Role |
|---|---|---|---|
| **impl-producer** | behavioral | [`impl-producer/`](./impl-producer/README.md) | the `impl-producer-governance` procedure — build the implementation **and** one verification per frozen scenario against the frozen `.feature`; **spawned builder**, never edits `spec.md` / `.feature`, applies the Builder + Architect lenses |
| **impl-judge** | behavioral | [`impl-judge/`](./impl-judge/README.md) | the cold impl-judge — run the producer's verification + an orthogonal structural/scope read, collapse any graded subject to a boolean per scenario; **spawned cold** (`sdd-implementer`) |

## Where the rules live

- **The impl-gate verdict** (the three actions, layer-scoped `aligned`, verdict-not-station,
  positional authority) → the [`conductor`](conductor/README.md) unit; this phase only **produces**
  what the gate judges.
- **Low-risk in-flight adjustments** the conductor serves while building (clarify a detail, an
  obvious stale-mistake fix) are captured in the **detail-adjustment report**
  (`../design/provenance-model.md`), not escalated. A change that would **narrow** a frozen
  scenario is **Clearance**, and a genuine self-contradiction is **Conflict resolution** — both
  escalate per the conductor's hard-floor logic.
- **Lifecycle / freeze / the autonomy bar / the provenance shape** → `../design/`.
