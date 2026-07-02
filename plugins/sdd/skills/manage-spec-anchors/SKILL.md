---
name: manage-spec-anchors
description: "Internal skill: corpus/spec-anchors' concrete curation engine. A self-contained .mts script that lists the three fixed spec anchors (each explained) plus the opt-in custom anchors, performs CRUD on the custom ones in .agents/sdd/spec-anchors.toml, induces an anchor pattern from a sample path, and previews which project(s) a pattern would discover before saving. Loaded in-session by the manage gateway (Housekeeping) so users curate discovery's extra anchors without hand-editing config; writes only the config, never spec content. Not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Manage Spec Anchors

The concrete engine for the SDD **spec-anchors** config — the opt-in registry of **extra** spec
anchors that `discover-specs` scans on top of the three fixed conventions (ADR-0019). It exists so a
user curates those anchors through a clean interface instead of hand-editing
`.agents/sdd/spec-anchors.toml`. Loaded **in-session** by the `manage` gateway (Housekeeping group);
it carries a self-contained `.mts` script (the repo's node-≥23.6 / no-deps convention).

## The config it curates

`.agents/sdd/spec-anchors.toml` carries one key — `anchors = [ … ]` — a list of repo-relative
directory patterns. `*` globs one segment; `**` globs **zero or more** segments (any depth,
including zero); `<project>` globs **and captures** a segment as the spec's name. Each pattern names
a directory the engine probes for `spec.md`. The three fixed conventions (`.agents/spec/`,
`.agents/specs/<project>/`, `<project-path>/.agents/spec/`) are **implicit and always scanned** —
never listed here, and never curatable.

## Run an operation

```bash
node "<skill>/scripts/manage-spec-anchors.mts" [--root .] <operation>
```

| Operation | Effect |
|---|---|
| `--list` | list the three fixed anchors (each explained) + every custom anchor, flagged fixed/custom |
| `--add <pattern>` | validate + append a custom anchor (creates the config if absent); refuses a fixed convention or a malformed pattern |
| `--remove <pattern>` | drop a custom anchor; a no-op (config unchanged) when the anchor is absent |
| `--edit <old> <new>` | replace one custom anchor; refuses a malformed `<new>` |
| `--induce <path>` | from a sample spec directory, offer a literal-dir candidate and a `<project>` generalization; refuses a path that is not a directory under the repo |
| `--preview <pattern>` | list the project(s) a candidate pattern would discover, **without** persisting it; a malformed pattern is refused, a zero-match pattern reports none |

**Curate with preview.** The intended flow: take the user's sample path → `--induce` it → `--preview`
each candidate to show the matched projects → confirm with the user → `--add` the chosen pattern.
Never write a pattern the user has not seen the effect of.

## Boundaries

Writes **only** `.agents/sdd/spec-anchors.toml` — never a `spec.md`, `status`, `approval`, or a
freeze; it is operational config, not spec content (so `manage`'s write-ownership guard holds). It
does **not** scan or list specs — that is `discover-specs`, which *reads* this config. The
**read-side** fail-safe (an already-corrupted config never breaks discovery) is `discover-specs`'
guarantee, not this engine's; this engine validates on the **write** side so a bad pattern is never
persisted.

When `node` is absent, an agent performs the same edits by hand: read the `anchors` array, apply the
CRUD, validate a pattern is repo-relative with only literal / `*` / `**` / `<project>` segments, and never
write a fixed convention.
