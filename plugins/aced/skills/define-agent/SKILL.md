---
name: define-agent
description: 'Use this skill when the user wants to create or improve an agent definition — a named, reusable role that can be delegated to as a subagent, loaded in-context as a persona, or both. Trigger on "create an agent", "write a conductor", "make an agent definition", "define a persona", "build a dual-mode agent", or "add an invokable agent".'
---

# Define Agent

Create or improve an agent definition — a named role encoded in a single file.

When the conductor dispatches this skill as a generic builder (`produced-by sdd:automaton`) for the ACED **impl-producer** role (implement mode, against a frozen `.feature`), it builds the **agent definition** to pass the frozen suite. The **verification is the frozen `.feature` itself** — its inline `@rubric` scenarios and `@trigger` `Examples`, authored by `aced-scenario-writer` at explore — so no separate eval suite is authored here; `eval.md` carries only the `subject` binding and run policy. As impl-producer it self-aligns to `sdd:ownership-governance` plus the resolved **builder-impl + architect-impl** bars (the ACED builder-impl is `aced:aced-builder-impl`). (Invoked standalone — no frozen `.feature` — only the agent definition is produced.) If the impl-judge reports scenario failures, load `aced-impl-producer` to run the diagnose-and-refine loop rather than re-deriving it here.

## First: confirm an agent definition is the right artifact

A skill can set `model`, `effort`, `allowed-tools`, `disallowed-tools`, `paths`, and can run itself in
a subagent via `context: fork` + `agent:`. Wanting a specific model or effort level is **not** a
reason to author an agent definition.

Author an agent definition when the requirement is one of these, which no skill can express:

| Requirement | Field |
| --- | --- |
| A closed tool allowlist — "only these, nothing else" | `tools` |
| A permission mode for the whole run | `permissionMode` |
| A turn ceiling | `maxTurns` |
| Memory that survives across conversations | `memory` |
| Agent-scoped MCP servers | `mcpServers` |
| An isolated git worktree | `isolation: worktree` |

Note that a skill's `allowed-tools` **pre-approves** and `disallowed-tools` **denies** — neither
closes the set, which is why a real allowlist needs the agent definition.

If none of the rows apply and the target is a stance, a voice, or a convention set rather than a
worker, route to `define-skill` and stop here.

## Keep the content in a skill when more than one caller needs it

Content written into an agent body is reachable two ways only: spawn that agent, or read its file by
path. Path-reading is brittle and breaks under plugin distribution.

When the same content must serve both a spawned agent and an in-session load, write it as a skill and
name it in the agent's `skills:` frontmatter. That field injects the skill's full content into the
agent at startup — one body of text, two entry points, no duplication:

```yaml
---
name: <agent-name>
description: <when to delegate to this agent>
model: opus
tools: Read, Write, Edit, Grep, Glob
skills:
  - <shared-content-skill>
---
```

`skills:` is a preload list, not an access list — it does not restrict what the agent may load later.
A skill named there must stay model-invocable: `disable-model-invocation: true` blocks preloading.

The inverse direction — `context: fork` on the skill — is for when the **skill** carries the task and
the agent only supplies tools and system prompt. Do not fork a skill that is pure reference: it
arrives as guidelines with no actionable prompt and returns nothing useful.

## Agent definition modes

Present these three modes to the user and ask which fits their use case:

| Mode | What it does | When to pick it |
|------|-------------|-----------------|
| **Delegated** | Runs as a subagent in its own context; returns a result to the caller | Autonomous workers, fan-out tasks, long-running jobs where interruption isn't needed |
| **Invokable (dual-mode)** | Can be spawned as a subagent AND reached by a thin companion command. The command takes one of **two shapes** — see below; picking the wrong one is what makes an agent bleed | Conductors, reviewers and personas the user steers interactively; and delegated workers the user wants slash-reachable |
| **In-context only** | Loaded via command only; not intended as a subagent | One-off role activations where no other caller needs the content |

**In-context only is rarely the right answer now.** If the content is a stance the user loads into a
session — a voice, a register, a review standard — it is a skill, not an agent definition, and
`define-skill` owns it. Pick this mode only when the file genuinely must stay an agent definition.

For **Invokable**, a companion command file is scaffolded alongside the agent definition. Prefer
putting the shared body in a skill (see above) and having both the command and the agent's `skills:`
field name it. Falling back to a command that reads the agent file by path is acceptable only when no
skill placement is available to the user.

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

1. **Name** — kebab-case slug (e.g. `conductor`, `code-reviewer`). If the agent's role is to **score or verify a specific gate or case**, name it by that gate/scope, not a bare action verb: `<domain>-<gate>-judge` for a gate scorer (e.g. `sdd-impl-judge`, `aced-impl-judge`), `<domain>-case-judge` for a case scorer (e.g. `aces-case-judge`). Flag any gate/case scorer whose name is not in that form — bare verdict verbs (`implementer`, `judge`, `validator`, `reviewer`, `checker`) and non-verdict action names (`eval-runner`, `grader`) alike. A producer/worker agent (e.g. `scenario-writer`, `doc-writer`) keeps its action-oriented name — this convention only applies to gate/case scorers.
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

Write a second file at `.agents/commands/<name>.md` (or the plugin-scoped equivalent). **Ask one
question first, because the two shapes are not interchangeable:**

> **Where does this agent's output go — into the session, or into something it produces?**

| Its output is… | Command shape | Why |
|---|---|---|
| **the session itself** — replies, review remarks, decisions the user reacts to | **Adoption** | The instruction governs the session's own output, so loading it into the session is the point |
| **a produced artifact** — a document, a file, a draft it hands back | **Gateway** | The instruction governs the artifact. Loading it into the session applies it to output it was never written for |

**Getting this wrong is not a style slip — it is the bleed.** An adoption command is a scope statement
made once; every reply after it accumulates as an unlabeled example, and the voice or stance drifts
into output it does not govern.

**When both fit, gateway.** A reviewer that also writes `review.md` matches both rows — its remarks
are what the user reacts to *and* it produces a file. Gateway is the fail-safe direction: a wrongly
gatewayed agent costs a round trip, while a wrongly adopted one bleeds.

That trade looks like it forfeits the steering the Invokable mode is for, and it does not: **a
gateway is steered through the brief, not through the session.** The user shapes the run by what the
command gathers before dispatch, which is why the gateway asks its questions up front — the subagent
cannot be interrupted once it starts, so the steering has to happen before it does.

### Adoption — for an agent whose output is the session

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

### Gateway — for an agent that produces an artifact

The command exists because a subagent is not slash-invokable. It must **not** load the agent's
instructions into the session — it collects what the subagent cannot ask for, dispatches, and relays.

Bind a **bounded** tool set, as the adoption template does. This is the one session that must not do
the work itself, so leaving tools open is leaving the failure available: name the runtime's
subagent-dispatch tool plus whatever read-only tools the command needs to settle the brief, and
nothing that writes. The dispatch tool's name is runtime-specific — use the name the target runtime
actually exposes rather than copying one from another runtime's docs.

```markdown
---
description: <what the user gets> — briefs the <name> subagent and returns its result.
allowed-tools: <dispatch-tool>, Read, Glob, Grep
---

Gateway to the `<name>` subagent. Take the request, brief the subagent, return what it produces.

**Do not load <name>'s instructions into this session.** They govern what it produces, not this
conversation. The subagent holds them in its own context, which is where they belong.

## The request

$ARGUMENTS

## What to do

1. **Read the request.** If it carries enough to act on, go to step 3.
2. **Ask only what would change the result.** The subagent cannot ask anything once it starts, so
   settle what is genuinely undecided here — at most two things, in one message, and only what you
   cannot settle yourself.
3. **Brief the subagent.** It starts blank and inherits nothing from this conversation: state the
   task, name the **source files** (do not paste or summarize their contents), mark what the user
   settled explicitly so it is not re-derived, and name what is out of scope.
4. **Return what came back**, and relay the assumptions it declared rather than burying them. A wrong
   inference is cheapest to catch before the next round.

For a revision, dispatch again with the same completeness — the new subagent has not seen the
previous result. Do not do the work in this session to save a round trip; that does it without the
agent's instructions, which is the drift the gateway exists to prevent.
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
| B9 | A gate- or case-scorer agent is named in `<domain>-<gate>-judge` or `<domain>-case-judge` form; flags any gate/case scorer whose name is not in that form (`implementer`, `judge`, `validator`, `reviewer`, `checker`, and non-verdict action names like `eval-runner`); does not fire for a non-scorer producer agent | HIGH |

Report results. Fix any CRITICAL or HIGH failures before presenting the final file to the user.

## Report

Summarize:

- Canonical file path
- Runtime symlinks created
- Companion command path (Invokable mode only)
- Quality check outcome
- Suggested next step: run `sdd:start-mission` (the conductor resolves the ACED roles) to spec and eval for this agent definition
