# check-project-specs

Runs every project-spec check against the one spec governing the invoking package.

```bash
node scripts/check-project-specs.mts                  # resolve from cwd
node scripts/check-project-specs.mts --project <dir>  # resolve an explicit project dir
```

Wired as each project's `check:spec` script through the `sdd-check-specs` bin, so every project —
`plugins/*` and `packages/*` alike — runs the identical, path-free command.

Resolution is spec-first: the spec's own `project-path` names the project dir, and
`check-project-specs` inverts that map. The reverse map cannot be derived by name
(`plugins/cyberfleet` → `.agents/specs/cyberfleet-plugin`).

A project no spec governs prints a skip and exits zero. Two specs claiming one project is an error.

See `SKILL.md` for the engine set and the cwd contract.
