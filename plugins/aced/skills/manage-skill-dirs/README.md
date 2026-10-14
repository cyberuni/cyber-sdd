# manage-skill-dirs

The concrete engine for the ACED **skill-dirs** config — the opt-in registry of extra skill-scan
locations `improve-skill`'s validate engine scans on top of its two built-in default roots. A
non-user-invocable skill, loaded in-session by the `manage` gateway, carrying a self-contained `.mjs`
script that lists / CRUDs / induces / previews the patterns so users never hand-edit the config file.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/manage-skill-dirs.mjs`](./scripts/manage-skill-dirs.mjs)
- **Tests:** `src/manage-skill-dirs/manage-skill-dirs.test.mts` in the package source (`node:test`)

```bash
node scripts/manage-skill-dirs.mjs --list
node scripts/manage-skill-dirs.mjs --induce plugins/aced/skills
node scripts/manage-skill-dirs.mjs --preview 'plugins/*/skills'
node scripts/manage-skill-dirs.mjs --add 'plugins/*/skills'
```
