# cyber-sdd-2

The next generation of Spec-Driven Development, built iteratively alongside the
shipped `cyber-sdd` plugin so the two can coexist in one repository and one
marketplace.

It has two sides, following the `cyber-asana` shape:

- **Plugin side** — `plugin.json` plus `skills/`, loaded by Claude Code, Cursor,
  Codex, and Copilot CLI through the repository's local marketplace.
- **CLI side** — `cyber-sdd-2`, the deterministic engine the skills call into
  instead of re-deriving work in prose.

## Status

Scaffold. The CLI exposes `--version` and `--help`; the plugin registers the
`sdd2` gateway skill. Everything else is still to be built.

## Development

```bash
pnpm --filter cyber-sdd-2 build
pnpm --filter cyber-sdd-2 test
pnpm --filter cyber-sdd-2 typecheck
```
