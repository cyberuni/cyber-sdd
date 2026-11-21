# config-skill-dirs

The concrete engine for the ACED **skill-dirs** config — the opt-in registry of extra skill-scan
locations `/cyber-agentkit:skill check` scans on top of its two built-in default roots. A
non-user-invocable skill, loaded in-session by the `config-aced` gateway, carrying a self-contained `.mjs`
script that lists / CRUDs / induces / previews the patterns so users never hand-edit the config file.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/config-skill-dirs.mjs`](./scripts/config-skill-dirs.mjs)
- **Tests:** `src/config-skill-dirs/config-skill-dirs.test.mts` in the package source (`node:test`)

```bash
node scripts/config-skill-dirs.mjs --list
node scripts/config-skill-dirs.mjs --induce plugins/aced/skills
node scripts/config-skill-dirs.mjs --preview 'plugins/*/skills'
node scripts/config-skill-dirs.mjs --add 'plugins/*/skills'
```
