# manage-spec-anchors

The concrete engine for the SDD **spec-anchors** config — the opt-in registry of extra spec anchors
`discover-specs` scans on top of the three fixed conventions (ADR-0019). A non-user-invocable skill,
loaded in-session by the `manage` gateway (Housekeeping), carrying a self-contained `.mts` script
that lists / CRUDs / induces / previews the anchors so users never hand-edit
`.agents/sdd/spec-anchors.toml`.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/manage-spec-anchors.mts`](./scripts/manage-spec-anchors.mts)
- **Tests:** [`scripts/manage-spec-anchors.test.mts`](./scripts/manage-spec-anchors.test.mts) (`node:test`)

```bash
node scripts/manage-spec-anchors.mts --list
node scripts/manage-spec-anchors.mts --induce curriculum/web/react/s-01
node scripts/manage-spec-anchors.mts --preview 'curriculum/*/*/<project>'
node scripts/manage-spec-anchors.mts --add 'curriculum/*/*/<project>'
```
