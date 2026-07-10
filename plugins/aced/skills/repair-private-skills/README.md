# repair-private-skills

The concrete validate/repair engine for repo-private skill hygiene under `.agents/skills`. A
non-user-invocable skill, loaded in-session by the ACED `manage` gateway, carrying a self-contained
`.mts` script that flags (`validate`, read-only) or fixes (`repair`, writes) a stray symlink into the
public `skills/` tree and a `SKILL.md` missing `metadata.internal: true`. `repair` writes/deletes only
under `.agents/skills` — it never touches the public `skills/` tree.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/repair-private-skills.mts`](./scripts/repair-private-skills.mts)
- **Tests:** [`scripts/repair-private-skills.test.mts`](./scripts/repair-private-skills.test.mts) (`node:test`)

```bash
node scripts/repair-private-skills.mts --root . validate
node scripts/repair-private-skills.mts --root . validate --format json
node scripts/repair-private-skills.mts --root . repair
```
