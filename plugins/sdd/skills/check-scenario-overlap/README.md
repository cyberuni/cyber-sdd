# check-scenario-overlap

Internal SDD skill — the concrete engine for **cross-node scenario-overlap detection**. Audits across
the nodes of one project spec and emits the candidates where the **same behavior lives in more than
one node's `.feature`**, for the formation Warden: the intra-project **spec-level SSA** partner of the
collision ladder, and the cross-node sibling of `check-spec-structure` (intra-node node-shape).

```bash
node scripts/check-scenario-overlap.mts --spec-dir <spec>          # audit (TOON candidate set)
node scripts/check-scenario-overlap.mts --spec-dir <spec> --check  # CI guard (fails on exact-duplicate)
```

Two deterministic candidate kinds — **exact-duplicate** (blocking: two nodes share an identical
normalized step fingerprint) and **title-overlap** (advisory: two nodes share a scenario title,
differing steps) — plus a Warden `@rubric` arm that confirms real overlap and assigns a single owning
node. The fingerprint is step-bodies-only; detection is cross-node only. Read-only, writes nothing.
See [`SKILL.md`](./SKILL.md) for the full contract. Not user-invocable.
