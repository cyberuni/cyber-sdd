---
name: define-agent
description: 'Use this skill when the user wants to create or improve an agent definition — a named, reusable role that can be delegated to as a subagent, loaded in-context as a persona, or both. Trigger on "create an agent", "write a conductor", "make an agent definition", "define a persona", "build a dual-mode agent", or "add an invokable agent".'
---

# Define Agent

Create or improve an agent definition — a named role encoded in a single file.

When the conductor dispatches this skill as a generic builder (`produced-by sdd:automaton`) for the ACED **impl-producer** role (implement mode, against a frozen `.feature`), it builds the **agent definition** to pass the frozen suite. The **verification is the frozen `.feature` itself** — its inline `@rubric` scenarios and `@trigger` `Examples`, authored by `aced-scenario-writer` at explore — so no separate eval suite is authored here; `eval.md` carries only the `subject` binding and run policy. As impl-producer it self-aligns to `sdd:ownership-governance` plus the resolved **builder-impl + architect-impl** bars (the ACED builder-impl is `aced:aced-builder-impl`). (Invoked standalone — no frozen `.feature` — only the agent definition is produced.) If the impl-judge reports scenario failures, load `aced-impl-producer` to run the diagnose-and-refine loop rather than re-deriving it here.

## Agent definition modes

Present these three modes to the user and ask which fits their use case:

| Mode | What it does | When to pick it |
|------|-------------|-----------------|
| **Delegated** | Runs as a subagent in its own context; returns a result to the caller | Autonomous workers, fan-out tasks, long-running jobs where interruption isn't needed |
| **Invokable (dual-mode)** | Can be spawned as a subagent AND loaded in-context via a thin command so the user can steer it, interrupt it, and operate at its level | Conductors, reviewers, personas the user wants to collaborate with interactively |
| **In-context only** | Loaded via command only; not intended as a subagent | Short personas, voice/register adopters (e.g. a writing style), one-off role activations |

For **Invokable**, a companion command file is scaffolded alongside the agent definition. The command reads the agent file into the current context. The body is written once; both artifacts share it.

## Determine placement

If the target scope is not clear from context, ask:

> Where should this agent definition live?
> 1. **User-global** (`~/.agents/agents/<name>.md`) — available across all projects
> 2. **Project** (`.agents/agents/<name>.md`) — scoped to this repo
> 3. **Inside a plugin** (`plugins/<plugin-name>/agents/<name>.md`) — distributed with the plugin

After the user selects, derive the canonical path.

Then ask which runtimes to target (select all that apply):

| Runtime | Symlink target |
|---------|---------------|
| Claude Code | `.claude/agents/<name>.md` |
| Cursor | `.cursor/rules/<name>.mdc` |
| Codex | `.codex/agents/<name>.md` |

The canonical file lives at the canonical path. All runtime locations are symlinks to it.

## Gather requirements

Ask the user:

1. **Name** — kebab-case slug (e.g. `conductor`, `code-reviewer`)
2. **Role** — one sentence: "You are a [seniority] [role] focused on [bounded concern]."
3. **Responsibilities** — what does this agent do? (3–6 bounded concerns)
4. **Output format** — what does it produce? (file, report, JSON, confirmation, etc.)
5. **Human-in-the-loop rules** — which actions require user confirmation before proceeding?
6. **Out of scope** — what should it explicitly refuse or defer?
7. **Tools** (Claude Code / Codex) — comma-separated tool names, or `*` for all

If improving an existing file, read it first. Ask only about gaps or issues found.

## Draft the agent definition

Write the file at the canonical path using this structure:

```markdown
---
name: <name>
description: >
  Use this agent when <primary trigger>. Trigger on <phrase 1>, <phrase 2>, or
  when the user <implicit signal> — even if they don't say "<domain word>"
  explicitly.
tools: <tool list or *>
model: <optional: opus | sonnet | haiku>
---

# <Title>

You are a <seniority> <role> focused on <bounded concern>.

## Responsibilities

- <one bounded concern per bullet>

## Output format

<Concrete: file path, JSON shape, Markdown section structure, etc.>

## Human-in-the-loop rules

- <Action requiring confirmation before execution>

## Out of scope

- <Explicit refusal or deferral>
```

Omit `model:` unless the user specifies one. Omit `tools:` for in-context-only agents.

## For Invokable mode: scaffold the companion command

Write a second file at `.agents/commands/<name>.md` (or the plugin-scoped equivalent):

```markdown
---
description: Load <name> as your operating role for this session.
allowed-tools: Read
---

Read `<canonical-path-to-agent-file>` in full and adopt it as your operating
instructions for the rest of this session.

Confirm in one line that the <name> role is active. Do not take any action until
the user gives you a task.

$ARGUMENTS
```

Symlink `.claude/commands/<name>.md` → `.agents/commands/<name>.md` (and other runtime equivalents the user selected).

## Create symlinks

After writing the canonical file(s), create symlinks for each selected runtime. Use relative paths from the symlink location to the canonical file.

Example for a project-scoped agent targeting Claude Code:
```bash
ln -sf ../../.agents/agents/<name>.md .claude/agents/<name>.md
```

Verify each symlink resolves correctly.

## Run quality checks

After writing, evaluate the agent definition against these checks:

| # | Check | Severity |
|---|-------|----------|
| F1 | `name` and `description` fields present | CRITICAL |
| F2 | `name` is kebab-case and matches file stem | HIGH |
| F3 | `description` starts with "Use this agent when…" | HIGH |
| F4 | `description` ≤ 1024 characters | HIGH |
| F9 | `description` includes implicit trigger phrasing | MEDIUM |
| B1 | Body opens with "You are a [seniority] [role]…" | HIGH |
| B5 | Irreversible actions have confirmation rules | HIGH |
| B8 | Body under 200 lines | MEDIUM |

Report results. Fix any CRITICAL or HIGH failures before presenting the final file to the user.

## Report

Summarize:

- Canonical file path
- Runtime symlinks created
- Companion command path (Invokable mode only)
- Quality check outcome
- Suggested next step: run `sdd:start-mission` (the conductor resolves the ACED roles) to spec and eval for this agent definition
