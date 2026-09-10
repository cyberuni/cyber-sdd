# Validate over freeze — can a criteria judge replace a frozen suite?

## The question

SDD 2 proposes moving the **executable** suite down into the implementation set
`{code, test, story}` while keeping **criteria** in the spec set, and replacing the
frozen `.feature` with a continuously validated connection between them.

[ADR-0034](../../docs/adr/0034-colocate-the-node-spec-keep-the-frozen-suite.md)
rejected the surface form of this (issue #4's Direction A2) on measured evidence. But
it rejected a different proposal: *move the suite down and drop the frozen artifact*.
Its decisive argument was that A2 left [ADR-0016](../../docs/adr/0016-impl-judge-verification-independence.md)
with nothing to re-derive from —

> Agent separation is a **complement** to a frozen artifact, never a substitute.
> Separation governs who may write. ADR-0016 needs something to re-derive *from*.

The SDD 2 proposal leaves it the **criteria**, held in a set with a different owner
that the implementation producer may read but not write. That contradicts an unstated
premise of ADR-0034 — that the only candidate anchor was the `.feature` — rather than
its evidence.

Issue #4 requires a direction be **reasoned and tested, weighted equally, with
disagreement between the two surfaced rather than resolved away**. This dossier is the
test half.

## Hypothesis

An implementation judge reading criteria it did not write can catch the two defect
classes that sank A2, even when the executable suite is producer-authored and lives in
the implementation set:

- **H1** — a criterion with no verification at all is reported as unmet.
- **H2** — a **false green** is reported as unmet: a test whose name asserts a property
  while its assertions do not establish it.

H2 is the load-bearing one. A green suite plus a producer-authored test is exactly the
arrangement in which a false green survives, and ADR-0034 found one on this subject.

## Subject

`place-node` — the same subject ADR-0034's Trial A used, so the two are comparable.

- Criteria: `.agents/specs/sdd/project-spec/place-node/place-node.feature` (7 scenarios)
- Implementation: `plugins/sdd/skills/place-node/scripts/place-node.mts`
- Suite: `plugins/sdd/skills/place-node/scripts/place-node.test.mts` (6 tests, green)

It is the best case for the proposal — a small, already-colocated suite over a small
deterministic tool. A result that fails here fails everywhere.

## Design

Two arms, two cold runs each. Every run is a fresh agent with no conversation context.

- **Arm A — naive coverage.** "For each scenario, does the suite cover it?"
  Establishes what an unremarkable coverage question finds on its own.
- **Arm B — the standing impl-judge bar, verbatim.** "A scenario passes only when it has
  a passing, **behavior-exercising** check," plus ADR-0016's independent re-derivation
  duty: derive the required verification from the scenario's own Given/When/Then, never
  from what the existing tests assert.

Arm B carries no gloss of mine about titles or false greens. If the phrase already in
`sdd-impl-judge` is sufficient, that is a finding. If it needs strengthening, that is
also a finding, and a more useful one.

Comparing the arms separates two explanations: whether the **instruction** does the work,
or the **arrangement** does.

## Blinding

Each run may read exactly three files — the criteria, the implementation, and the suite —
and is forbidden from searching the repository or reading anything under `.research/`.

The ground truth was recorded before this dossier existed, in
[`../next-spec-architecture/evidence.md`](../next-spec-architecture/evidence.md) § E2,
as part of ADR-0034's own trial. It is a genuine pre-registration: it is committed,
dated, and was written to answer a different question.

## What settles it

- **Both arms catch both defects** — the bar is not doing the work; the arrangement is
  sound and the standing instruction suffices.
- **Only Arm B catches them** — the proposal holds, and the judge instruction is
  load-bearing and must be carried explicitly into SDD 2.
- **Neither arm catches H2** — the false green survives a criteria judge, ADR-0034's
  rejection stands on its merits, and the frozen suite keeps its job.

A split across the two runs within an arm is itself a result: it makes the check
unreliable at N=1, which is the regime a gate actually runs in.
