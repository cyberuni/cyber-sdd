# run

Run the ACED golden-set eval suite for one target agent configuration and report pass rate, mean score, and per-case results.

## When to use

Use this skill when you want to score a skill, subagent, command, or AGENTS.md section against its existing golden set — typically right after editing it.

Good triggers include:

- "Run the evals for this skill"
- "Score this agent config"
- Checking whether a config still passes after an edit, before deciding whether to `improve` or `compare`

Defer to a sibling when the request is about diagnosing failures (`improve`), diffing two versions (`compare`), adding a new case (`add-scenario`), or a project-wide summary (`report`).

## What it does

Locates the target's `eval.md` and `golden-set/`, invokes `aced-case-judge` once per test case (skipping layers not enabled in `eval.md`), computes pass rate / mean ± std dev / per-layer breakdown, writes a timestamped JSON result file, and reports a summary with the worst-scoring failures first.

## Install

```bash
npx skills add cyberuni/cyber-skills --skill aced/run
```
