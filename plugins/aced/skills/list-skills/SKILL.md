---
name: list-skills
description: "Internal skill: by name only — the ACED manage-gateway skill-inventory engine — loaded in-session by the manage gateway, not user-triggered."
user-invocable: false
metadata:
  internal: true
---

# list-skills

The concrete **discovery engine** for the ACED skill inventory — scans the four fixed skill
sources, dedupes, filters, and reports what is installed. It is **read-only**: it never writes a
`SKILL.md`, a manifest, or any other file. Validating or repairing skill content is a different
engine (`repair-private-skills`); maintaining the per-model runner family is
`manage-model-runners`. Loaded **in-session** by the `manage` gateway; **not user-invocable**.

## The four sources (scan order, dedupe precedence)

| Source | Location | `foundIn` |
|---|---|---|
| Repo-private | `<root>/.agents/skills` | `repo` |
| Repo-public | `<root>/skills` | `repo` |
| User-global | `~/.agents/skills` | `global` |
| Package | the cyberplace package's shipped `skills/` directory | `package` |

A directory counts as a skill only when it contains a `SKILL.md`. A name found in more than one
source is reported **once** — the earlier-scanned source wins, so `repo` beats `global`/`package`.

## Run the engine

```bash
node "<skill>/scripts/list-skills.mts" [--root .] [--grep <pattern>] [--format json]
```

| Flag | Effect |
|---|---|
| `--root <path>` | repo root to scan for the two repo sources (default `.`) |
| `--grep <pattern>` | `*`/`?` glob filter over skill **name** only; omitted = every discovered skill |
| `--format json` | emit the report as JSON (`name`, `description`, `foundIn`, `packageManaged`); default is a human-readable text list |

Each reported skill carries: **name** (frontmatter `name:`, falling back to the directory name when
omitted), **foundIn** (`repo` \| `global` \| `package`), **description** (frontmatter
`description:`), and **packageManaged** (`true` when the skill's `skill.json` declares
`distribution.install_via: "package_manager"`). The report is sorted **alphabetically by name**.

## Boundaries

Read-only inventory — it inspects `SKILL.md` frontmatter and an optional `skill.json` manifest per
directory and writes nothing. It does not validate skill content, repair broken frontmatter, or
touch the per-model runner family; those are separate engines.

When `node` is absent, an agent performs the same scan by hand: walk the four source directories,
keep only subdirectories with a `SKILL.md`, parse the `name:`/`description:` frontmatter (directory
name as fallback), dedupe by name keeping the first-scanned (repo-first) copy, apply the glob
filter if one was given, and sort the result alphabetically by name.
