# compare

Run the golden set against two versions of a target agent configuration and diff the results — the regression check before committing a change.

## When to use

Use this skill when you've edited a skill, subagent, command, or AGENTS.md section and want to confirm the edit actually helped before committing it.

Good triggers include:

- "Did this change actually improve things?"
- "Check for regressions before I commit"
- Verifying an `improve`-proposed edit worked as intended

Defer to a sibling when you just want a single version's score (`run`), or you're diagnosing why a version fails rather than diffing two of them (`improve`).

## What it does

Scores the golden set against a "before" version (default: previous git revision) and an "after" version (default: current working tree), computes per-case and aggregate deltas, and reports improved / regressed / unchanged cases with an explicit regression warning if any case got worse.

## Install

```bash
npx skills add cyberuni/cyber-skills --skill aced/compare
```
