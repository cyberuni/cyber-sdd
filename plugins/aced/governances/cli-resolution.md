# CLI Resolution

Rules for running a command line tool from a skill. Apply when authoring or auditing a skill that shells out to a script or to a released npm binary.

## Classify the call first

| What the skill runs | How it runs |
| --- | --- |
| A script the skill ships | `node <skill-dir>/scripts/<file>` |
| A released npm CLI the skill does not ship | Local-first: `upx --local-only <pkg>@^<major>`, pinned `npx` only for a cold machine |
| A tool assumed present (`git`, `gh`, `node`) | Bare name; probe once, fail loudly when missing |

Resolve the runner once at the start of the workflow and reuse it for every later call.

## A script the skill ships

The script is part of the skill folder, built into it, and run with plain `node`.

- Invoke it as `node <skill-dir>/scripts/<file>`. Never through `npx`, `tsx`, a package manager exec, or a global install.
- Use Node built-ins only, or bundle every dependency into the script. The script must run from an unpacked skill folder with no `node_modules`.
- Never reference a path outside the skill folder — a sibling skill, a plugin `bin/`, or the package root. Standalone and symlinked installs break such paths silently.
- A git-sourced install has no built `scripts/`. Document the skill's own pinned fallback for that case: `npx -y <package>@^<version> <command>` with the same arguments.

Script placement and bundling are specified in **skill-design**; this document covers only how the script is invoked.

## A released CLI the skill does not ship

### Preferred — installed copies only

```bash
upx --local-only <pkg>@^<major> <subcommand>
```

- `upx` matches a semver **range** against copies already installed — `node_modules` from the current directory upward, nearest first, then the global root — and spawns that binary directly.
- Pin a **major** range, never an exact version and never a dist tag. One installed copy then serves every caller on that major.
- `--local-only` never falls back to `npx`. It exits **127** when nothing installed satisfies the range. Read 127 as "not installed", not as "the command failed".
- `upx` is `@repobuddy/upx`. It is not ambient: it exists only after a global install, so probe `command -v upx` before using it.

### Cold machine — pinned npx

```bash
npx -y <pkg>@<exact-version> <subcommand>
```

- Exact version only. Never a range, never a dist tag (`@latest`, `@next`).
- Read the exact version with `npm view <pkg> version` when authoring, then write it into the skill. Do not resolve it at run time.
- This is a bootstrap path: it costs a registry lookup on every call and requires network. Use it when `upx` is absent or exited 127 and the call must still succeed.

### Pattern

```bash
# Resolve <pkg> once
if command -v upx >/dev/null 2>&1 && upx --local-only <pkg>@^<major> --version >/dev/null 2>&1; then
  CLI="upx --local-only <pkg>@^<major>"
else
  CLI="npx -y <pkg>@<exact-version>"
fi
$CLI <subcommand>
```

Replace `<pkg>` with the npm package name, `<major>` with the major the skill was tested against, and `<exact-version>` with a released version of that major.

### An optional lookup never falls back

When the call is a lookup that may legitimately find nothing — a governance override, an optional config — stop at the local tier:

```bash
upx --local-only <pkg>@^<major> <subcommand> || true
```

Exit 127, or any other non-zero exit, means "no result". The skill continues with its own default and never reaches for `npx`.

## Error handling

Surface a missing tool; never proceed silently.

```
Error: <pkg> not available. Install one of:
  npm install -g <pkg>            # global
  pnpm add -D <pkg>               # repo-local devDependency
```

Distinguish the two failures when reporting: exit 127 from `upx --local-only` means nothing installed satisfies the range; a non-zero exit from the CLI itself means the command ran and failed.

## Rules

- Never hardcode `node_modules/.bin/<bin>`. The path is implementation-specific and breaks across workspaces and package managers.
- Never rely on repo-specific package scripts (`pnpm <bin>`, `npm run <bin>`) — local conventions, not portable.
- Never pass a range or a dist tag to `npx`; never pass an exact version to `upx --local-only`.
- Never use `npx` for a call the skill makes repeatedly in one run.
- A skill's own script never depends on a package runner. The pinned `npx` fallback belongs to the skill, not to the script.

## References

Related governances (load on demand; read stdout as authoritative):

```bash
governance show skill-design
governance show agent-tool-output
```

- <https://github.com/repobuddy/upx> — `upx` resolution order and the `--local-only` flag
