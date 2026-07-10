# list-skills

Internal, non-invokable ACED engine — loaded in-session by the `manage` gateway, not triggered
directly. It reports what skills are installed.

## What it does

Scans the four fixed skill sources — repo-private (`.agents/skills`), repo-public (`skills/`),
user-global (`~/.agents/skills`), and the cyberplace package's shipped skills directory — keeping
only directories that contain a `SKILL.md`. Duplicate names are deduped with **repo taking
precedence** over global/package. An optional `--grep` glob (`*`/`?`) filters by skill name.

Each surviving skill is reported with its **name**, **foundIn** source, **description**, and
whether it is **package-managed** (its `skill.json` declares `distribution.install_via:
"package_manager"`). The report is sorted alphabetically by name and can be printed as text
(default) or `--format json`.

Read-only — it never writes a `SKILL.md`, manifest, or any other file. Ported from the cyberplace
CLI's `skill list` command (`packages/cyberplace/src/skill/list.ts`).
