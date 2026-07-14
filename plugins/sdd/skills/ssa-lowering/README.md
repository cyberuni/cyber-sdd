# ssa-lowering

The reasoning **front-end** of the CR→mission compiler — the doctrine the conductor runs during
intake/Explore to lower one-or-more change requests into a partitioned set of Missions (SSA: **one
owning Mission per spec-node**). It applies the **Oracle** lens (should we do this at all?) and the
**Architect** lens (where does each piece belong, is it a barrier?), resolves same-node contention into
ordered **versioned-RAW** edges, and lowers only the **frontier** deeply.

It sits **above** the shipped deterministic back-end and cites it, never re-implements it: the
[`mission-graph`](../mission-graph/SKILL.md) store records the partition, the
[`collision-ladder`](../collision-ladder/SKILL.md) classifies node collisions, and
[`touch-set-correction`](../touch-set-correction/SKILL.md) reconciles declared touch-sets against real
diffs. It **decides** the cut; it does not build, store, classify, or automatically emit its
decision-evidence (SQ-F5 #194, deferred).

Built for the Op2 ★ capstone of the cyberfleet-batch change request (GitHub issue #189, the reasoning
front-end above the shipped deterministic back-end); see
[`.agents/specs/sdd/ssa-lowering/README.md`](../../../../.agents/specs/sdd/ssa-lowering/README.md) for
the authoritative behavior description and
[`ssa-lowering.feature`](../../../../.agents/specs/sdd/ssa-lowering/ssa-lowering.feature) for the frozen
behavior suite.

This is a **doctrine, not an engine** — it emits no `.mts`, computes nothing deterministically, and holds
no state. Working node name only (SQ-name #195).

- **Skill contract:** [`SKILL.md`](./SKILL.md)
