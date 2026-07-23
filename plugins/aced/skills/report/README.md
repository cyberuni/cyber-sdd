# report

Generate a project-wide health dashboard across every ACED eval suite — pass rate, mean %max, trend vs. the previous run, and which agent configurations need attention.

## When to use

Use this skill when you want a status overview of ACED coverage across the whole project rather than a single suite.

Good triggers include:

- "How are our agent configs doing?" / "Give me an ACED health check"
- Before a release, to confirm nothing has regressed unnoticed
- Deciding what to work on next across many tracked skills/agents

Defer to a sibling when the request is about one specific target: `run` to score it, `improve` to fix failures, `compare` to diff two versions.

## What it does

Scans the project spec (`.agents/specs/`) for behavioral-leaf nodes' `eval.md`, computes per-suite pass rate, mean %max (each scenario's total over its own maximum, normalized before averaging), and trend from the two most recent `results/` files, classifies each suite as healthy / degraded / critical / no-data / trending-down, and prints a dashboard with a "needs attention" list and suggested next action per suite.

## Install

```bash
npx skills add cyberuni/cyberplace --skill aced/report
```
