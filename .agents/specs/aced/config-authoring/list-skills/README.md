---
spec-type: behavioral
concept: [config-authoring]
---

# list-skills — discover and summarize installed skills

Discover **agent skills across the repo, the user's global install, and the cyberplace package's
shipped skills**, and report a name-sortable summary of each — its name, where it was found, its
description, and whether it is package-managed. An **internal, non-invokable** engine reached only
through the ACED `manage` gateway (`../../manage/`); it inspects and reports on skill config
artifacts, so it lives beside `manage-model-runners` and `repair-private-skills` in
`config-authoring/`.

> **This is a single behavioral unit, not an overview** — one engine skill. This spec owns the
> behavior + suite ([`list-skills.feature`](./list-skills.feature)); the impl is the non-invokable
> `list-skills` skill in `plugins/aced/skills/list-skills/`.

## Use Cases

**Fit:** partial — the operation is mechanical (scan fixed directories, parse frontmatter, dedupe,
report), reached via the `manage` gateway rather than by an activation decision, so trigger
near-miss balance is N/A; the behavior layer still carries signal (source precedence, dedupe,
filter matching, and the reported field set).

**Subject** — an internal engine, loaded by the `manage` gateway, that scans the four fixed skill
sources — repo-private (`.agents/skills`), repo-public (`skills`), user-global
(`~/.agents/skills`), and the cyberplace package's shipped skills dir — parses each `SKILL.md`'s
frontmatter, dedupes by name with repo taking precedence over global and package, applies an
optional glob-style name filter, and reports each surviving skill's name, `foundIn` source, and
description, plus whether it is package-managed per its `skill.json` manifest.

**Non-goals** — validating or repairing skill content (`repair-private-skills` — read-only checks
and writes live there, this engine never mutates a file); maintaining the per-model runner agent-def
family (`manage-model-runners`); installing or scaffolding a skill (`create-skill`, `contribute-skill`).
It is **not user-invocable** — it is reached via `manage`.

Every scenario in [`list-skills.feature`](./list-skills.feature) maps to one of these behaviors:

| Behavior | What it covers |
|---|---|
| **reached via the gateway** | the engine is loaded by the `manage` gateway, not triggered directly by a bare user invocation |
| **scans the four fixed sources** | discovery covers repo-private `.agents/skills`, repo-public `skills`, user-global `~/.agents/skills`, and the cyberplace package's shipped skills dir |
| **only directories with a SKILL.md count** | a directory entry under a source is only reported as a skill when it contains a `SKILL.md` file |
| **dedupes by name, repo wins** | when the same skill name appears in more than one source, only the first-scanned (repo-precedence) copy is reported |
| **optional glob-style name filter** | a `--grep` pattern (`*`/`?` glob syntax) restricts the report to skills whose name matches; omitting it reports everything |
| **reports name, foundIn, description per skill** | each reported skill carries its name, its `foundIn` source, and its description parsed from frontmatter |
| **falls back to the directory name** | a skill whose frontmatter has no `name` field is reported under its directory name instead |
| **package-managed detection via the manifest** | a skill whose `skill.json` declares `distribution.install_via: package_manager` is reported as package-managed; a skill with no manifest or a different install path is not |
| **sorted by name** | the reported list is sorted alphabetically by skill name |

## Scenarios (colocated)

The behavior suite is [`list-skills.feature`](./list-skills.feature) — gateway reach, the
fixed-source scan, the SKILL.md-presence filter, dedupe-by-precedence, the optional grep filter, the
reported field set (name / foundIn / description / package-managed), the directory-name fallback,
and the sorted output. Cross-capability e2e scenarios live in `../../acceptance/`.
