---
name: manage-skill-dirs
description: "Partial Skill: invoke by name only — config-authoring/skill-dirs' curation engine for the extra skill-scan locations improve-skill's validate engine uses — loaded by the manage gateway, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Manage Skill Dirs

The concrete engine for the ACED **skill-dirs** config — the opt-in registry of **extra** skill-scan
locations the validate engine scans on top of its two built-in default roots. It exists so a user
curates those locations through a clean interface instead of hand-editing the config directly.
Loaded **in-session** by the `manage` gateway; it carries a self-contained `.mts` script (the repo's
node-≥23.6 / no-deps convention).

## The config it curates

A single key — `anchors = [ … ]` — a list of repo-relative directory patterns. `*` globs one
segment; `**` globs **zero or more** segments (any depth, including zero). There is **no capture
token**: a skill's name comes from its own directory basename, not from the pattern, so a pattern
containing `<` or `>` is malformed. Each pattern names a directory whose **immediate children** are
scanned for `SKILL.md`. The two default roots (the repo-root public and private agentskills-standard
skill directories) are **implicit and always scanned** — never listed here, and never curatable.

## Run an operation

```bash
node "<skill>/scripts/manage-skill-dirs.mts" [--root .] <operation>
```

| Operation | Effect |
|---|---|
| `--list` | list the two fixed default roots (each explained) + every custom pattern, flagged fixed/custom |
| `--add <pattern>` | validate + append a custom pattern (creates the config if absent); refuses a fixed default root or a malformed pattern; adding an already-present pattern is a no-op |
| `--remove <pattern>` | drop a custom pattern; a no-op (config unchanged) when the pattern is absent |
| `--edit <old> <new>` | replace one custom pattern; refuses a malformed `<new>`; a no-op when `<old>` is absent |
| `--induce <path>` | from a sample directory that contains skill subdirectories, offer a literal-dir candidate and a `*`-generalization of a variable segment (e.g. a plugin name); refuses a path that is not a directory under the repo |
| `--preview <pattern>` | list the skills a candidate pattern would discover, **without** persisting it; a malformed pattern is refused, a zero-match pattern reports none |

**Curate with preview.** The intended flow: take the user's sample path → `--induce` it → `--preview`
each candidate to show the matched skills → confirm with the user → `--add` the chosen pattern. Never
write a pattern the user has not seen the effect of.

## Boundaries

Writes **only** the skill-dirs config — never a skill, `spec.md`, `status`, `approval`, or a freeze;
it is operational config, not skill content (so `manage`'s write-ownership guard holds). It does
**not** scan or validate skills — that is `improve-skill`'s validate engine, which *reads* this
config. This engine validates on the **write** side so a bad pattern is never persisted.

When `node` is absent, an agent performs the same edits by hand: read the `anchors` array, apply the
CRUD, validate a pattern is repo-relative with only literal / `*` / `**` segments (never `<` or `>`),
and never write a fixed default root.
