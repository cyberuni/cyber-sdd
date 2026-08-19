---
name: check-project-specs
description: "Partial Skill: invoke by name only — project-spec/check-project-specs' engine that runs every project-spec check against the one spec governing the invoking package — the per-project CI entrypoint, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Check Project Specs

The **per-project entrypoint** for the project-spec checks. It resolves the one spec that governs
the invoking package and runs each project-spec engine against it, so a project's spec checks are a
task **the project owns** rather than a path some root script hardcodes. It carries a self-contained
`.mts` script (the repo's node-≥23.6 / no-deps convention).

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
node "<skill>/scripts/check-project-specs.mts" [--project <dir>]
```

Wired as each project's `check:spec` script, via the `sdd-check-specs` bin.

## Outcomes

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

## Boundaries

It owns no checks of its own — it resolves and delegates. It writes nothing, and it never decides
what a finding means. Adding a project-spec engine means adding it here, which is what keeps every
project's coverage identical.
