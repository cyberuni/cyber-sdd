---
title: contribute-skill
description: Contribute a local improvement to an installed skill back to its source repo via PR.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Trigger:** "send this skill fix upstream", "contribute this back", "open a PR for my skill change"

When you've improved a skill installed from another repo (global `~/.agents/skills/<name>/` or repo-internal `.agents/skills/<name>/`), this skill guides contributing that improvement back via pull request. Not for repo-native skills under this repo's own `skills/<name>/` — if you're the author here, this repo IS the source.

## Steps

1. **Identify the skill and its source** — `npx cyberplace@<version> skill source <skill-name>` resolves `{ name, source, sourceUrl, skillPath, foundIn }` from the repo-local lock, the global lock, or `npx skills find`, in that order.
2. **Diff against upstream** — map each local file to `skills/<skill-name>/<relative-path>` on the source repo's default branch and diff. No diffs across every mapped file → nothing to contribute.
3. **Check write access** — push directly if you have it; otherwise fork.
4. **Branch and push as one commit** — via the GitHub Git Data API (blobs → tree → commit → ref update), never one `PUT /contents` call per file, which would create a noisy multi-commit diff.
5. **Open the PR** — with a summary scoped to `skills/<skill-name>/` and a test-plan checklist.
6. **Report the PR URL.** After merge, the consumer repo runs `npx skills update` to refresh `skills-lock.json` hashes.

## What NOT to do

- Include `SKILL.local.md` content in the PR (machine-local augmentations stay local)
- Push without showing diffs and getting user confirmation
- Update `.agents/skills/` or any path outside `skills/<skill-name>/` in the source repo

## Install

```bash
npx skills add cyberuni/cyberplace --skill contribute-skill -g
```

## Related

- [skillify](/aced/skillify/) — generalizes a session workflow into a new skill (this skill contributes an existing one upstream)
- `improve-skill` (`aced` plugin) — validate before opening the PR
