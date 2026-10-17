# manage-ignore

The concrete engine for `.agents/sdd/.sddignore` — the optional gitignore-syntax file
`resolve-tracking` reads to decide whether an artifact is tracked or ignored. A non-user-invocable
skill, loaded in-session by the `manage` gateway (Housekeeping), carrying a self-contained `.mjs`
script that lists / adds / removes / induces / previews the ignore rules so users never hand-edit the
file. Order is meaningful (last-match-wins), so rules are never re-sorted.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/manage-ignore.mjs`](./scripts/manage-ignore.mjs)
- **Tests:** [`src/manage-ignore/manage-ignore.test.mts`](../../src/manage-ignore/manage-ignore.test.mts) (`node:test`)

```bash
node scripts/manage-ignore.mjs --list
node scripts/manage-ignore.mjs --induce build/output/app.log
node scripts/manage-ignore.mjs --preview '*.log'
node scripts/manage-ignore.mjs --preview '!keep.log'
node scripts/manage-ignore.mjs --add '*.log'
```
