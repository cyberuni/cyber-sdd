# define-agent

Create or improve an agent definition — a named, reusable role that can be delegated as a subagent, loaded in-context as a persona, or both.

## When to use

Use this skill when you want to author a new agent definition or improve an existing one.

Good triggers include:

- Building a conductor, orchestrator, or persona for a workflow
- Adding a reusable role to a plugin or project
- Deciding between a delegated worker and an interactive in-context persona
- Scaffolding the canonical file + runtime symlinks + companion command in one pass

## What it does

The skill walks you through three decisions before writing anything:

1. **Mode** — Delegated (subagent only), Invokable (dual-mode: subagent + in-context via a companion command), or In-context only
2. **Placement** — user-global (`~/.agents/agents/`), project (`.agents/agents/`), or inside a plugin (`plugins/<name>/agents/`)
3. **Runtimes** — which runtime symlinks to create (Claude Code, Cursor, Codex)

It then collects the role, responsibilities, output format, human-in-the-loop rules, and out-of-scope list — drafts the agent definition, runs quality checks (F1–F9, B1–B8), and for Invokable mode scaffolds a thin companion command file that loads the agent into the current session.

## Dual-mode (Invokable) pattern

The Invokable mode implements the **dual-mode persona** pattern:

- The agent definition file is the single source of truth for the role
- A companion command reads that file into the current context at session start
- The same role body backs both delegation (subagent spawn) and in-context adoption (interactive steering)

This lets you hand off work to the agent autonomously, or step into its role yourself and operate at the same level.

## Install

```bash
npx skills add cyberuni/cyberplace --skill aced/define-agent
```
