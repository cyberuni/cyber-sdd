# contribute-skill

Contribute local improvements to an installed skill back to its source repository via pull request.

## When to use

Use this skill when you improved a skill installed from another repo and want to send the change upstream.

Good triggers include:

- "Patch this skill upstream"
- "Contribute my skill fix back to the source repo"
- After editing a skill under `~/.agents/skills/` or `.agents/skills/`

Do not use for skills native to the current repo under `skills/<name>/` — that repo is already the source.

## What it does

The skill maps local changes to `skills/<skill-name>/` in the upstream repo, opens a branch, and creates a PR. It never includes `SKILL.local.md` or paths outside the canonical skill folder.

## Install

```bash
npx skills add cyberuni/cyberplace --skill contribute-skill
```
