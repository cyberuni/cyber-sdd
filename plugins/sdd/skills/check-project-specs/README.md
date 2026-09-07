# check-project-specs

Runs every project-spec check — over the whole corpus, or over one project's spec.

```bash
node scripts/check-project-specs.mts --corpus         # every project-spec + the coverage guard
node scripts/check-project-specs.mts                  # one project, resolved from cwd
node scripts/check-project-specs.mts --project <dir>  # one project, explicit dir
```

The **corpus** scope is the repo's commit floor, wired as the root `check:specs`; it is total by
construction — the engine sweep and the coverage guard together, because neither alone sees a spec
the other misses. The **project** scope is each project's `check:spec` script through the
`sdd-check-specs` bin, so every project — `plugins/*` and `packages/*` alike — runs the identical,
path-free command.

A flag the harness does not define is an error, never a default scope.

Resolution is spec-first: the spec's own `project-path` names the project dir, and
`check-project-specs` inverts that map. The reverse map cannot be derived by name
(`plugins/cyberfleet` → `.agents/specs/cyberfleet-plugin`).

A project no spec governs prints a skip and exits zero. Two specs claiming one project is an error.

See `SKILL.md` for the engine set and the cwd contract, and
`.agents/specs/sdd/corpus/spec-floor/` for the spec.
