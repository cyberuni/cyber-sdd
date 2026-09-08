---
name: check-project-specs
description: "Partial Skill: invoke by name only — corpus/spec-floor's engine that runs every project-spec check, over the whole corpus or over one project — the commit-floor and CI entrypoint, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Check Project Specs

The **entrypoint** for the project-spec checks — the harness behind `corpus/spec-floor`. It resolves
which spec governs which project and runs each project-spec engine against it. It carries a
self-contained `.mts` script (the repo's node-≥23.6 / no-deps convention).

Two scopes:

| Scope | Flag | Who runs it |
|---|---|---|
| **corpus** — every project-spec, plus the coverage guard | `--corpus` | the repo's `check:specs` chain, so every commit and every CI run |
| **project** — one project-spec | `--project <dir>`, or no flag (the cwd) | a maintainer inside one project; each project's own `check:spec` |

**The corpus scope is total, and that is the point.** It runs *both* the engine sweep and the
coverage guard, because neither subsumes the other: the sweep only visits the specs discovery
**recognizes**, so a spec whose lifecycle `status` is a typo is invisible to it and the sweep would
report clean; the coverage guard sees that file on disk and escalates it, but says nothing about
whether the engines pass. Run either alone and a whole project-spec leaves the floor silently.

**An unrecognized flag is an error.** The scope is chosen by a flag, so a flag that falls through to
a default silently downgrades the run — and project scope, which is what a fall-through reaches,
resolves no governing spec at a repo root and exits **0**. That is exactly how a coverage-only flag
guarded this repo's commits and CI while running no engine at all (issue #5).

## Resolution — spec-first, never by name

A package knows its own directory; exactly one spec declares `project-path` pointing at it. The
engine inverts that map via `discover-specs`' `collectSpecs`:

1. The project dir is the **cwd** (`--project <dir>` overrides — the cwd is what a package-manager
   script gives you for free).
2. Walk up for `pnpm-workspace.yaml` → the repo root.
3. Match the repo-relative project dir against each spec's `project-path`.

The reverse map is **irregular and not derivable by name** — `plugins/cyberfleet` is governed by
`.agents/specs/cyberfleet-plugin`, and two different projects both own a skill named `init`. Only
`project-path` inverts reliably, which is why the spec stays the single source of truth for the
mapping and no path is ever written into a package's scripts.

## Run it

```bash
node "<skill>/scripts/check-project-specs.mts" --corpus          # the whole corpus — the commit floor
node "<skill>/scripts/check-project-specs.mts" [--project <dir>] # one project-spec
```

The corpus scope is wired as the repo's root `check:specs`; the project scope is wired as each
project's `check:spec` script, via the `sdd-check-specs` bin. `--corpus` and `--project` name
contradictory scopes and are refused together.

## Outcomes

**Corpus scope**

- **Clean** — every recognized project-spec passed every engine and every spec file is covered; exits zero.
- **A coverage gap** — reports each gap with its reason, **then sweeps anyway**, and exits non-zero.
- **A failing engine** — names the engine and the project-spec, **continues to the next**, exits non-zero.
- **An empty corpus** — reports that plainly and exits zero. A repo with no project-spec is not a defect.
- **No repo root** — names the missing workspace marker and exits non-zero; it never falls back to the cwd.

**Project scope**

- **Resolved** — runs every engine against the spec dir, reports `ok` / `FAIL` per engine, and exits
  non-zero if any failed.
- **No spec governs this project** — prints that and exits **zero**. The script is uniform across
  every workspace member, and some members are governed by no spec; a project without one is not a
  failure.
- **Two specs claim the project** — exits non-zero. One project is one spec.

## The engines it runs

`check-spec-state` and `check-suite` (each `--root <specDir>`), then `concept-index`,
`check-spec-structure`, `align-spec`, and `check-scenario-overlap` (each `--spec-dir <specDir>
--check`), and `check-spec-references` (`--spec-dir <specDir>`).

**`check-spec-references` takes no `--check`.** Every other engine here has a second mode a `--check`
selects between — write-vs-verify, or audit-vs-gate. This one does not: it is read-only and
single-severity, so a report mode would differ from the guard by exit code alone. A path that is
correct but not resolvable from the file carrying it (prose quoting a symlink target, say) is
excused inline by the engine's own marker, not by a severity.

Every engine is spawned with **cwd = the repo root**, never the project dir — they resolve
repo-root-relative references against the cwd.

The two `--root` engines are corpus-shaped (they read the first path segment under root as a project
slug), but a single project-spec dir is a legal root: the slug is only a message tag.

A failing engine never stops the ones after it, at either scope: a floor that returns at the first
defect reports one defect per invocation, so an author fixes the tree one run at a time.

## Boundaries

It owns no checks of its own — it resolves and delegates. It writes nothing, and it never decides
what a finding means. Adding a project-spec engine means adding it here, which is what keeps every
project's coverage identical.
