# manage-skill-dirs

The concrete engine for the ACED **skill-dirs** config — the opt-in registry of extra skill-scan
locations `improve-skill`'s validate engine scans on top of its two built-in default roots. A
non-user-invocable skill, loaded in-session by the `manage` gateway, carrying a self-contained `.mts`
script that lists / CRUDs / induces / previews the patterns so users never hand-edit the config file.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/manage-skill-dirs.mts`](./scripts/manage-skill-dirs.mts)
- **Tests:** [`scripts/manage-skill-dirs.test.mts`](./scripts/manage-skill-dirs.test.mts) (`node:test`)

```bash
node scripts/manage-skill-dirs.mts --list
node scripts/manage-skill-dirs.mts --induce plugins/aced/skills
node scripts/manage-skill-dirs.mts --preview 'plugins/*/skills'
node scripts/manage-skill-dirs.mts --add 'plugins/*/skills'
```
