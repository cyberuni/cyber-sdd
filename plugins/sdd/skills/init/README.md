# init

The onboarding front door for an SDD project — offers SDD's opt-in, repo-scoped conveniences and
wires the ones the user enables into operational config. v1 offers exactly one: the **mission
statusline**, which surfaces the current mission phase in the Claude Code status line while a
mission runs. A user-invocable setup skill (sibling to `start-mission` / `manage`); it opens no CR
and invokes no gate.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/wire-statusline.mts`](./scripts/wire-statusline.mts)
- **Tests:** [`scripts/wire-statusline.test.mts`](./scripts/wire-statusline.test.mts) (`node:test`)

```bash
node scripts/wire-statusline.mts --root . --wire --mode own-line
node scripts/wire-statusline.mts --root . --wire --mode same-line
```

The engine writes only project `.claude/settings.json` (never the global settings file) and, in a
git repo, `.gitignore`. It composes with — never replaces — an existing `statusLine` command, and
re-running it is idempotent (no duplicated segment, no duplicated gitignore entry). The reader it
wires falls through to nothing beyond the composed base when `.agents/sdd/statusline` is absent —
the conductor (realized by `../start-mission/`) is the only writer of that file's value, during the
mission loop.
