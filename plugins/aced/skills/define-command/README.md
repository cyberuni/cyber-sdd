# define-command

Create or improve a command — a user-invoked-only slash workflow (`/name`) that never auto-triggers from the model — then hand it to the ACED eval loop to spec and score.

## When to use

Use this skill when you want to author a new command or formalize an existing user-only workflow into one.

Good triggers include:

- "Create a command that does X" / "add a `/deploy` command"
- Suppressing a skill's auto-invocation because accidental firing would be disruptive
- Converting an existing workflow skill into a `/name`-only command
- Deciding between the `commands/` folder and `disable-model-invocation: true` mechanisms

Defer to a sibling when the request is really about a companion command that loads an agent definition into context (`define-agent`), a workflow that should keep auto-triggering (`define-skill`), a reference-only rule set (`define-governance`), or scoring / diagnosing an existing config (`run` / `add-scenario` / `improve`).

## What it does

The skill walks you through the shape before writing anything:

1. **Route** — confirm this is a standalone command, not an agent companion, an auto-triggered skill, or governance
2. **Mechanism** — `commands/` folder (widest cross-harness support) or `disable-model-invocation: true` (modern, Claude Code / Windsurf only)
3. **Placement** — user-global, project, or inside a plugin's `commands/` subfolder

It then drafts the command file for the chosen mechanism, creates runtime symlinks (`disable-model-invocation` mechanism only), audits it, and points you at the ACED eval loop (`start-mission` / `add-scenario` / `run`) to spec and score it.

## `command` is a registered ACED artifact-type

ACED already serves `command` as one of its four agent-config artifact-types (alongside `skill`, `subagent`, `agents-section`) — see `init-aced`. Before `define-command`, authoring one fell to `define-agent` (for the agent-companion case) or ad hoc editing; this skill gives standalone commands their own dedicated producer.

## Install

```bash
npx skills add cyberuni/cyberplace --skill aced/define-command
```
