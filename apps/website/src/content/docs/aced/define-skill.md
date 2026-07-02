---
title: define-skill
description: Create, scaffold, or formalize a workflow skill — a process, tool-based, or standard SKILL.md.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Trigger:** "create a skill", "write a skill for X", "I want a skill that…", "turn this workflow into a skill", "help me build this skill" — even without the word "skill"

Creates or improves a **workflow skill** — a process, tool-based, or standard `SKILL.md` — then hands it to the ACED eval loop to spec and score.

## What it does

1. Routes away requests that belong to a sibling skill: agents/personas → [`define-agent`](/aced/define-agent/), reference-only rule sets → [`define-governance`](/aced/define-governance/), extracting the current session → `skillify`, scoring/adding cases → [`run`](/aced/run/) / [`add-scenario`](/aced/add-scenario/), diagnosing failing evals → [`improve`](/aced/improve/).
2. Loads the `skill-design` governance for authoring rules.
3. Settles scope, trigger condition, output contract, quality bar, and out-of-scope before writing — asks the user to resolve anything that can't be inferred.
4. Chooses a pattern (process / tool-based / standard) and a placement (user-global / project-private / project-public), scaffolds the file, and creates a symlink per targeted runtime (Claude Code, Cursor, Codex).
5. Runs the structural audit (`cyber-skills audit validate`) and fixes any CRITICAL or HIGH finding before presenting the skill.

## Three entry points

- **Impl-producer** (dispatched by the SDD conductor against a frozen `.feature`) — co-produces the `SKILL.md` **and** its verification (`eval.md` + `golden-set/`, one eval per frozen scenario) that [`run`](/aced/run/) will score.
- **Standalone** — the user invokes it directly, outside any change request. Scaffolds the skill, then offers the ACED eval loop rather than assuming it.
- **Escaped** — invoked directly after the request resolves `non-durable` (before any change request opens). Scaffolds, audits, reports, and stops — no eval loop.

## Next step

Standalone or impl-producer entries: run [`sdd:start-mission`](/sdd/overview/) to author the skill's `.feature` and eval suite, or use [`add-scenario`](/aced/add-scenario/) / [`run`](/aced/run/) to grow and score a golden set.
