# run

Run the frozen `.feature` suite for one target agent configuration and report pass rate, mean score, and per-scenario results.

## When to use

Use this skill when you want to score a skill, subagent, command, or AGENTS.md section against its frozen `.feature` suite — typically right after editing it.

Good triggers include:

- "Run the evals for this skill"
- "Score this agent config"
- Checking whether a config still passes after an edit, before deciding whether to `improve` or `compare`

Defer to a sibling when the request is about diagnosing failures (`improve`), diffing two versions (`compare`), adding a new case (`add-scenario`), or a project-wide summary (`report`).

## What it does

Locates the target's `eval.md` and frozen `.feature`, invokes `aced-case-judge` once per scenario (skipping layers not enabled in `eval.md`'s `eval.layers`), computes pass rate / mean ± std dev / per-layer breakdown, writes a timestamped JSON result file, and reports a summary with the worst-scoring failures first.

## Install

```bash
npx skills add cyberuni/cyberplace --skill aced/run
```
