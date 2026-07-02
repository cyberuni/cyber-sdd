# define-skill

Create or improve a workflow skill — a process, tool-based, or standard SKILL.md — then hand it to the ACED eval loop to spec and score.

## When to use

Use this skill when you want to author a new workflow skill or formalize an existing ad-hoc workflow into one.

Good triggers include:

- "Create a skill that does X" / "I want a skill for X"
- Turning a documented multi-step process into a reusable skill
- Filling out an incomplete or weakly-triggering existing SKILL.md
- Scaffolding the SKILL.md + README + runtime symlinks in one pass

Defer to a sibling when the request is really about an agent or persona (`define-agent`), a reference-only rule set (`define-governance`), extracting the current session (`skillify`), or scoring / diagnosing an existing config (`run` / `add-scenario` / `improve`).

## What it does

The skill walks you through the shape before writing anything:

1. **Route** — confirm this is a workflow skill, not an agent, governance, or session extraction
2. **Settle scope** — the five design questions (scope, trigger, output contract, quality bar, out-of-scope)
3. **Pattern** — process, tool-based, or standard (personas go to `define-agent`)
4. **Placement** — user-global, project-private, or project-public, plus which runtime symlinks to create

It then drafts the SKILL.md (kebab-case name, a 150–400 char trigger-bearing description, a step body under the size bar), adds a README for a public skill, runs the structural audit and fixes CRITICAL/HIGH findings, and points you at the ACED eval loop (`start-mission` / `add-scenario` / `run`) to spec and score it.

## Enhanced from create-skill

`define-skill` is the ACED-native successor to the legacy `create-skill` skill: same scaffold → audit → link lifecycle, but the test step is the ACED eval loop (a frozen `.feature` with inline `@rubric` scenarios scored over N runs) instead of a one-shot trigger-query file, and fit is classified up front so authoring effort matches the subject.

## Install

```bash
npx skills add cyberuni/cyber-skills --skill aced/define-skill
```
