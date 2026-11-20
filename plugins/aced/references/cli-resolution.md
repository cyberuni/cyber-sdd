---
description: How a skill runs its own scripts and a CLI it does not compile in — call classification, forwarding scripts, pinned npx for a skill with no forwarder, optional lookups, and error handling.
extends: [default]
---

Rules for running a command line tool from a skill. Apply when authoring or auditing a skill that shells out to a script or to a released npm binary.

## Classify the call first

| What the skill runs | How it runs |
| --- | --- |
| A script compiled into the skill | `node <this skill's folder>/scripts/<file>.mjs <args>` |
| A CLI, the plugin's own or another package's | A forwarder: `node <this skill's folder>/scripts/<bin>.mjs <args>` |
| A released CLI from a skill that has no plugin build | Pinned `npx -y <pkg>@<exact-version>` |
| A tool assumed present (`git`, `gh`, `node`) | Bare name; probe once, fail loudly when missing |

Every call a plugin skill makes to a CLI goes through a script in its own `scripts/`. The choice of what to run belongs in that script, not in the model's judgment: a smaller model runs exactly the line the skill gives it.

## A script compiled into the skill

The script is part of the skill folder and runs with plain `node`.

- Invoke it as `node <this skill's folder>/scripts/<file>.mjs`. Never through `npx`, `tsx`, a package manager exec, or a global install.
- Use Node built-ins only, or bundle every dependency into the script. The script must run from an unpacked skill folder with no `node_modules`.
- Never reference a path outside the skill folder — a sibling skill, a plugin `bin/`, or the package root. Standalone and symlinked installs break such paths silently.
- Commit the built script. A git-sourced install has no build step, so the committed file is what it runs.

Script placement and bundling are specified in **skill-design**; this document covers only how the script is invoked.

## A CLI the skill runs through a forwarder

A forwarder is a small script named after the CLI. It holds none of the CLI's code and passes every argument, stdio, and the exit code through. Each time it runs, it picks the CLI:

1. Walking up from its own real path, a `package.json` that is the package and declares the bin: run that checkout's bin. This is the development case, and a symlinked skill resolves to it too.
2. Otherwise: `npx -y <package>@<version>`, with the version written in at build time.

### Declare it

Declare one forwarder per skill that runs the CLI, under `extensions["org.cyberuni.universal-plugin"].scripts` in `plugin.json`:

```json
"scripts": {
  "skills/<skill>/scripts/<bin>.mjs": { "forward": "<bin>" },
  "skills/<other-skill>/scripts/<other-bin>.mjs": { "forward": "<other-bin>", "package": "<other-pkg>", "version": "<exact-version>" }
}
```

- With `forward` alone, the bin belongs to the plugin's own package. `plugin version` stamps its version with the plugin's.
- For another package's CLI, name the `package` and pin an exact `version`. Read it with `npm view <pkg> version` when authoring. No stamp moves this pin; raise it by editing the entry.
- Never a range and never a dist tag (`@latest`, `@next`).

### Build and check it

- Run `universal-plugin plugin build` and commit the forwarder it writes. Never edit the forwarder by hand.
- Run `universal-plugin plugin build --check` in CI. It fails when a forwarder is missing, stale, or on another version.

### Call it

```bash
node <this skill's folder>/scripts/<bin>.mjs <subcommand> <args>
```

- Write the same subcommand and arguments the CLI takes.
- Write no `@<version>`, no run-time version lookup, and no runner fallback beside the line. The forwarder carries the pin and the fallback.

## A skill with no forwarder

A skill outside a plugin build, such as a standalone skill installed by `npx skills add`, has no forwarder. It calls the released CLI with a pinned `npx`:

```bash
npx -y <pkg>@<exact-version> <subcommand>
```

- Exact version only. Never a range, never a dist tag.
- Read the exact version with `npm view <pkg> version` when authoring, then write it into the skill. Do not resolve it at run time.
- In your own checkout this runs the published CLI, not your change. Move the skill under a plugin build and use a forwarder when that matters.

## An optional lookup never fails the skill

When the call is a lookup that may legitimately find nothing — an optional override, an optional config — read any non-zero exit as "no result":

```bash
node <this skill's folder>/scripts/<bin>.mjs <subcommand> || true
```

The skill continues with its own default.

## Error handling

Surface a failed call; never proceed silently. A non-zero exit from a forwarder is the CLI's own exit code: the command ran and failed. A forwarder that cannot reach the CLI at all (no checkout and no network for `npx`) reports the cause on stderr and exits 1.

## Rules

- Never hardcode `node_modules/.bin/<bin>`. The path is implementation-specific and breaks across workspaces and package managers.
- Never rely on repo-specific package scripts (`pnpm <bin>`, `npm run <bin>`) — local conventions, not portable.
- Never write `npx`, `upx`, or `pnpm exec` for a CLI that has a forwarder in the skill.
- Never pass a range or a dist tag to `npx`.
- A skill's own compiled script never depends on a package runner.

## References

Related references (load on demand): Load `skill-design` and `agent-tool-output` with the `reference` skill of `cyber-agentkit`.

- <https://github.com/cyberuni/universal-plugin/blob/main/apps/web/src/content/docs/concepts/running-your-cli-from-skills.md> — the forwarder model and its setup
- <https://github.com/cyberuni/universal-plugin/blob/main/packages/universal-plugin/.agents/spec/design/decisions/0022-skills-run-the-own-cli-through-a-forwarding-script.md> — ADR 0022, why a forwarder and not a bare `npx`
