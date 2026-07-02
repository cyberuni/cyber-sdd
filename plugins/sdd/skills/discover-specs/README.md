# discover-specs

The concrete engine for SDD **spec discovery**. A non-user-invocable skill carrying a self-contained `.mts`
script that scans the three fixed SDD spec locations — plus any opt-in extra anchors declared in
`.agents/sdd/spec-anchors.toml` (ADR-0019, curated via `manage-spec-anchors`) — filters candidates by
the lifecycle `status` shape, parses each `spec.md`'s frontmatter only, and emits a TOON list of the
specs found.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/discover-specs.mts`](./scripts/discover-specs.mts)
- **Tests:** [`scripts/discover-specs.test.mts`](./scripts/discover-specs.test.mts) (`node:test`)

```bash
node scripts/discover-specs.mts --root . --format toon
```
