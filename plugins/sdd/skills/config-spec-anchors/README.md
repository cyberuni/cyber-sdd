# config-spec-anchors

The concrete engine for the SDD **spec-anchors** config — the opt-in registry of extra spec anchors
`discover-specs` scans on top of the three fixed conventions (ADR-0019). A non-user-invocable skill,
loaded in-session by the `corpus` gateway (Housekeeping), carrying a self-contained `.mjs` script
that lists / CRUDs / induces / previews the anchors so users never hand-edit
`.agents/sdd/spec-anchors.toml`.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/config-spec-anchors.mjs`](./scripts/config-spec-anchors.mjs)
- **Tests:** [`src/config-spec-anchors/config-spec-anchors.test.mts`](../../src/config-spec-anchors/config-spec-anchors.test.mts) (`node:test`)

```bash
node scripts/config-spec-anchors.mjs --list
node scripts/config-spec-anchors.mjs --induce curriculum/web/react/s-01
node scripts/config-spec-anchors.mjs --preview 'curriculum/*/*/<project>'
node scripts/config-spec-anchors.mjs --add 'curriculum/*/*/<project>'
```
