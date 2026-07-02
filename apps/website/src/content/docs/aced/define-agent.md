---
title: define-agent
description: Create or improve an agent definition — a named role delegated to as a subagent, loaded as a persona, or both.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Trigger:** "create an agent", "write a conductor", "make an agent definition", "define a persona", "build a dual-mode agent", "add an invokable agent"

Creates or improves an agent definition — a named, reusable role encoded in a single file.

## Agent definition modes

| Mode | What it does | When to pick it |
|---|---|---|
| **Delegated** | Runs as a subagent in its own context; returns a result to the caller | Autonomous workers, fan-out tasks |
| **Invokable (dual-mode)** | Spawnable as a subagent AND loadable in-context via a companion command | Conductors, reviewers, personas the user steers interactively |
| **In-context only** | Loaded via command only, not a subagent | Short personas, voice/register adopters |

Invokable mode scaffolds a companion command file alongside the agent definition, sharing one body.

## What it does

1. Determines placement (user-global, project, or inside a plugin) and target runtimes (Claude Code, Cursor, Codex), then derives the canonical path and symlinks.
2. Gathers name, role, responsibilities, output format, human-in-the-loop rules, out-of-scope, and tools.
3. Drafts the agent definition, and for Invokable mode, the companion command.
4. Runs quality checks (frontmatter shape, description trigger phrasing, body structure) and fixes CRITICAL/HIGH failures before presenting the file.

## Role as ACED impl-producer

When the SDD conductor dispatches this skill against a frozen `.feature`, it co-produces the agent definition **and** its verification — the scenario→rubric eval suite (`eval.md` + `golden-set/`) that the impl-judge runs. Invoked standalone (no frozen `.feature`), it produces only the agent definition.

## Next step

Run [`sdd:start-mission`](/sdd/overview/) to spec and eval the agent definition; the conductor resolves the ACED roles automatically.
