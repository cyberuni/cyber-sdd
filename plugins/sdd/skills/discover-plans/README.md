# discover-plans

The concrete engine for SDD **plan discovery**. A non-user-invocable skill carrying a self-contained
`.mts` script that scans `.agents/plans` for `*.plan.md` mission briefs, treats each present brief as
an unretired/resumable mission, tallies its todos, reads its top-level `status` dispatch flag
(`active` when unset) and its `## NEXT` resume lead, and emits a TOON list. The plan sibling of
[`discover-specs`](../discover-specs/README.md).

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/discover-plans.mts`](./scripts/discover-plans.mts)
- **Tests:** [`scripts/discover-plans.test.mts`](./scripts/discover-plans.test.mts) (`node:test`)

```bash
node scripts/discover-plans.mts --root . --format toon
node scripts/discover-plans.mts --root . --status approved   # the dispatch queue: approved briefs only
```
