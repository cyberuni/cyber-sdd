# config-ignore

The concrete engine for `.agents/sdd/.sddignore` — the optional gitignore-syntax file
`resolve-tracking` reads to decide whether an artifact is tracked or ignored. A non-user-invocable
skill, loaded in-session by the `corpus` gateway (Housekeeping), carrying a self-contained `.mjs`
script that lists / adds / removes / induces / previews the ignore rules so users never hand-edit the
file. Order is meaningful (last-match-wins), so rules are never re-sorted.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/config-ignore.mjs`](./scripts/config-ignore.mjs)
- **Tests:** [`src/config-ignore/config-ignore.test.mts`](../../src/config-ignore/config-ignore.test.mts) (`node:test`)

```bash
node scripts/config-ignore.mjs --list
node scripts/config-ignore.mjs --induce build/output/app.log
node scripts/config-ignore.mjs --preview '*.log'
node scripts/config-ignore.mjs --preview '!keep.log'
node scripts/config-ignore.mjs --add '*.log'
```
