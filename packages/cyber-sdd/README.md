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
`sdd2` gateway skill. It also ships the `spec`
skill, which writes and reviews the design spec. Everything else is still to be
built.

## Next: the functional spec

The `spec` skill covers the design spec: what a consumer of a capability is
judged against. The functional spec beneath it is missing: the spec colocated
with the implementation, holding internal contracts, module behavior, and
scenarios. Until it exists, SDD 2 has no counterpart to the first generation's
`.feature` suite, so work on a first-generation project spec stays with the
`sdd` plugin's `start-mission`.

To settle, in a session of its own:

- What the functional spec holds, and how it binds to the design spec's
  criterion IDs.
- Its test form: native, deterministic tests of the project's stack, with no
  `.feature` file for an agent to run (decision D11 in
  [`.research/design-spec-criteria`](../../.research/design-spec-criteria/conclusion.md)).
- Who produces it and who judges it.
- How the `spec` skill's criteria (C1 to C9) relate to the draft
  [criteria governance](.agents/spec/governances/criteria-governance.md), which
  numbers its own criteria from C1 as well.
- When `start-mission` hands spec work to SDD 2.

## Development

```bash
pnpm --filter cyber-sdd-2 build
pnpm --filter cyber-sdd-2 test
pnpm --filter cyber-sdd-2 typecheck
```
