---
name: repair-private-skills
description: "Internal skill: the ACED manage-gateway engine that validates and repairs repo-private skill hygiene — loaded in-session by the ACED manage gateway, not user-triggered."
user-invocable: false
metadata:
  internal: true
---

# repair-private-skills

The concrete engine for repo-private skill hygiene under `.agents/skills`. It catches two problems
a private skill can drift into:

- a **stray symlink** whose target resolves into the public `skills/` tree (should be a real
  repo-private directory, not a link into the public one)
- a **SKILL.md missing `metadata.internal: true`** in its YAML frontmatter (the marker that keeps a
  repo-private skill from leaking as a public one)

A directory holding only `SKILL.local.md` / `SKILL.project.md` (no `SKILL.md`) is an
**augmentation-only** entry and is never flagged. Loaded **in-session** by the `manage` gateway
(Config runners / hygiene group); it carries a self-contained `.mts` script (the repo's
node-≥23.6 / no-deps convention).

## Run an operation

```bash
node "<skill>/scripts/repair-private-skills.mts" [--root .] <validate|repair> [--format json]
```

| Operation | Effect |
|---|---|
| `validate` | read-only; reports every issue found; **makes no filesystem changes**; exits nonzero when issues exist, 0 when clean |
| `repair` | writes fixes — deletes a stray public-tree symlink, inserts the missing `metadata.internal: true`; exits 0 |
| `--format json` | (either operation) emit the result as a single JSON object instead of one line per entry |

Issue kinds `validate` reports: `public_skill_symlink`, `missing_skill_file`, `missing_frontmatter`,
`missing_metadata_internal`. Action kinds `repair` records: `removed_public_symlink`,
`updated_metadata`, `already_internal`, `local_augmentation_only`, `skipped_missing_skill`,
`skipped_no_frontmatter`.

**Curate with validate first.** The intended flow: run `validate` to see what is wrong, then run
`repair` to fix it. `repair` is idempotent — a clean tree makes no writes.

## Boundaries

`validate` performs **zero filesystem writes** — it only reads and reports. `repair` writes/deletes
**only under `.agents/skills`** — it never creates, modifies, or deletes anything under the public
`skills/` tree, even though it reads that tree (via a resolved realpath comparison) to detect a stray
symlink pointing into it.

`repair-private-skills` does not discover skills across all sources — that is `list-skills`. It does
not maintain the per-model runner-def family — that is `manage-model-runners`.

When `node` is absent, an agent performs the same checks by hand: for each entry under
`.agents/skills`, `lstat` it — if it is a symlink whose realpath resolves inside the public `skills/`
tree, delete it; otherwise read `SKILL.md` (skip if absent and a `SKILL.local.md` /
`SKILL.project.md` exists instead; flag if neither exists), skip if its first line is not `---`
(malformed frontmatter is never auto-fixed), and insert `metadata.internal: true` under an existing
`metadata:` block (or append a new one) when it is missing.
