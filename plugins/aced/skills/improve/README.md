# improve

Improve an existing agent configuration of any kind — a skill, subagent, command, or AGENTS.md section — whether by diagnosing failing ACED evals or by general review against fit and quality bars.

## When to use

Use this skill when a config isn't working as well as it should and you want concrete proposed edits, not just a diagnosis.

Good triggers include:

- "Improve this skill" / "Make this agent better"
- "Why does this config keep failing?"
- Reviewing a config that has no eval suite yet, before deciding whether it's worth building one

Defer to a sibling when the request is really about scaffolding something new (`define-skill` / `define-agent` / `define-governance`), just scoring (`run`), just adding a case (`add-scenario`), just diffing two versions (`compare`), or auditing a `SKILL.md`'s structure specifically (`improve-skill`).

## What it does

If the target is ACED-tracked (has an `eval.md`), it loads the internal impl-producer loop to classify failing cases by pattern and propose before/after edits, then verifies with `compare`. If not yet tracked, it runs a general review — fit classification plus the relevant builder bar — and proposes edits for any gap found, offering to hand off to `sdd:start-mission` to formalize an eval suite.

## Install

```bash
npx skills add cyberuni/cyber-skills --skill aced/improve
```
