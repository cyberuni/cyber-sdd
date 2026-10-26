# ADR-0036: ACED's authored standards ship as references and load through the `reference` skill

## Status

Accepted

Supersedes the **authored governance** row of [ADR-0035](0035-authored-governances-ship-as-package-files.md).
ADR-0035's other row, that a plugin's own actor bar stays a skill, is unchanged.

## Context

ADR-0035 shipped `skill-design`, `skill-repo-structure`, `agent-tool-output`, and `cli-resolution`
from `plugins/aced/governances/`, for a build-time copy step to place in each consuming skill at
`references/governances/<name>.md`. `define-skill` and `improve-skill` read their copies by hand:
`.agents/governances/<name>.md`, then `references/governances/<name>.md`.

Two things changed:

- The copy step never shipped. `universal-plugin` 0.14 does not copy governances.
- The reference resolver reads only `references/`. Its design (R20, decided 2026-10-18) drops
  `governances/` folders. `cyber-agentkit` 1.2.0, a dependency of `cyber-aced`, ships it as the
  `reference` skill: a name resolves through the managed, project (`.agents/references/`), user,
  plugin (`references/` beside `skills/`), and skill-default (`references/<name>.default.md`) tiers.

cyberuni/cyberplace#522 moves cyberplace's copies of the same four documents to ACED, so ACED is
their one home.

## Decision Drivers

- The four documents must stay loadable once the resolver stops reading `governances/`.
- Any skill, in this repository or another, loads them by name, without knowing a path.
- A project overrides one without editing the plugin.

## Considered Options

### Option 1: Keep `governances/` and the hand lookup

- **Cons**: nothing reads the folder once R20 ships; the skills' lookup order is ACED's alone.

### Option 2: Ship from `references/`, load through the `reference` skill, keep skill defaults

- **Pros**: the plugin tier serves the documents to every installed skill; a project overrides at
  `.agents/references/<name>.md`; the skill default still answers when the command cannot run.
- **Cons**: the load runs `node` through the `reference` skill's bundled script, where the old read
  was a file on disk. A plugin copy and a skill default of the same name warn on every load unless
  one names the other in `extends`.

### Option 3: Ship from `references/` with no skill defaults

- **Pros**: one copy of each document.
- **Cons**: `define-skill` and `improve-skill` lose their rules whenever the command cannot run,
  such as a `cyber-agentkit` plugin installed from git, which carries no bundled script.

## Decision

Option 2.

- The four documents live at `plugins/aced/references/<name>.md`, and `plugins/aced/package.json`
  lists `references` under `files`. Each carries a `description` and `extends: [default]`, so it
  builds on a loading skill's default instead of competing with it. The names stay unprefixed: they
  are the names cyberplace's callers already use, and ACED is their only home.
- `define-skill` and `improve-skill` load `skill-design` and `agent-tool-output` with the `reference`
  skill of `cyber-agentkit`. Each keeps a default copy at `references/<name>.default.md`, equal to the
  plugin's copy without the `extends` line; a smoke test holds them equal.
- The index that was `governances/README.md` moves to the plugin readme, because a `README.md` in
  `references/` would resolve as a reference named `README`.
- Nothing under `plugins/aced` ships or reads a `governances/` folder.

## Consequences

### Positive

- A skill anywhere loads an ACED standard by name once the ACED plugin is installed.
- A project override lives in `.agents/references/`, the same place as every other reference.

### Negative

- The names do not carry the `aced.` prefix the `reference` skill recommends for plugin references.
  A second plugin that ships the same name makes it ambiguous until a user selects one.
- The skill defaults duplicate the plugin's copies.

## Related Decisions

- [ADR-0035](0035-authored-governances-ship-as-package-files.md) — the layout this replaces
- [ADR-0013](0013-governance-skills.md) — actor bars as skills, unchanged
- cyberuni/cyber-sdd#141 — this move
- cyberuni/cyberplace#522 — cyberplace's copies move to ACED
