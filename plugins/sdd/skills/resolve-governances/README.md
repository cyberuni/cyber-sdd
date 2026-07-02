# resolve-governances

The concrete engine for **SDD governance resolution**.
A non-user-invocable skill carrying a self-contained `.mts` script that, for a touched file's
artifact-type, resolves each production-chain role to its agent plus the resolved-actor bars it loads
— matching candidates across the project's `.agents/governances/` anchors, the matched plugin squad,
and the sdd defaults.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/resolve-governances.mts`](./scripts/resolve-governances.mts)
- **Tests:** [`scripts/resolve-governances.test.mts`](./scripts/resolve-governances.test.mts) (`node:test`)

```bash
node scripts/resolve-governances.mts --root . --artifact-type skill
```

Consumed by the conductor (`start-mission`) and the cold judges (`sdd-spec-judge`, `sdd-impl-judge`)
to load the right bars without hand-enumerating.
