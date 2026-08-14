---
name: define-command
description: 'Use this skill when the user wants to create or improve a command — a user-invoked-only slash workflow (`/name`) that never auto-triggers from the model. Trigger on "create a command", "add a slash command", "make a /deploy command", "add a user-only workflow", "convert this skill to a command", or "stop this skill from auto-triggering", even if they do not say "command" explicitly. Not for a companion command scaffolded alongside an agent definition — whether it adopts that agent in-session or gateways to it as a subagent (define-agent) — an auto-triggered workflow skill (define-skill), or a reference-only rule set (define-governance).'
---

# Define Command

Create or improve a **command** — a workflow the user invokes explicitly via `/name`, never
triggered automatically by the model.

When the conductor dispatches this skill as a generic builder (`produced-by sdd:automaton`) for the
ACED **impl-producer** role (implement mode, against a frozen `.feature`), it builds the **command
file** to pass the frozen suite. The **verification is the frozen `.feature` itself** — its inline
`@rubric` scenarios and `@trigger` `Examples`, authored by `aced-scenario-writer` at explore — so no
separate eval suite is authored here; `eval.md` carries only the `subject` binding and run policy. As
impl-producer it self-aligns to `sdd:ownership-governance` plus the resolved **builder-impl +
architect-impl** bars (the ACED builder-impl is `aced:aced-builder-impl`). If the impl-judge reports
scenario failures, load `aced-impl-producer` to run the diagnose-and-refine loop rather than
re-deriving it here.

There are two other entry points, both with **no frozen `.feature`** and **only the command file**
produced:

- **Standalone** — the user invokes this skill directly, outside any CR. Scaffold, then offer the
  ACED eval loop (see "Report and hand off" below) rather than assuming it.
- **Escaped** — the gateway or `start-mission` invokes this skill directly after resolving the
  request `non-durable` (the escape hatch, before any CR opens). There is no mission to hand off
  within: scaffold, audit, report, and **stop** — do not mention the ACED eval loop.

## Route the request first

`define-command` owns **standalone user-invoked workflows**. Defer when the intent belongs to a
sibling that carries the same config vocabulary:

| The request is really about… | Defer to |
|---|---|
| a thin command that loads an **agent definition** into context (the Invokable-mode companion) | `define-agent` |
| a workflow that should **auto-trigger** from the model's own judgment | `define-skill` |
| a **reference-only rule set / governance** other skills load but never execute as steps | `define-governance` |
| **scoring** an existing config, or **adding** an eval case | `run` / `add-scenario` |
| **diagnosing** why an existing command's evals fail | `improve` |

A request that turns out to want an agent loaded into context (not a self-contained workflow) is
handed to `define-agent` — do not scaffold a companion-command shape here.

## Choose the mechanism

Two mechanisms suppress model auto-invocation; pick one based on target harnesses (ask the user which
harnesses to target if not stated):

| Mechanism | File | Portability | When to pick it |
|---|---|---|---|
| **`commands/` folder** (legacy) | A standalone markdown file, not a `SKILL.md` | Widest support — Claude Code, and GitHub Copilot CLI (reads `.claude/commands/`); the only option for cross-harness plugin commands targeting Cursor too | Default choice; use for anything shipped in a plugin or targeting more than Claude Code |
| **`disable-model-invocation: true`** (modern) | A `SKILL.md` with the frontmatter flag | Claude Code, Windsurf; **not** Copilot CLI, Codex CLI, or Gemini CLI; has a known Cursor bug hiding plugin-delivered skills from the `/` menu (Mar 2026) | Only when targeting Claude Code / Windsurf exclusively and the command benefits from full `SKILL.md` progressive disclosure (a `references/` or `scripts/` dir) |

If improving an existing file, read it first and keep its current mechanism unless the user asks to
migrate.

## Determine placement

If the target scope is not clear from context, ask:

> Where should this command live?
> 1. **User-global** (`~/.claude/commands/<name>.md`) — available across all your projects
> 2. **Project** (`.claude/commands/<name>.md`) — scoped to this repo
> 3. **Inside a plugin** (`plugins/<plugin-name>/commands/<name>.md`) — distributed with the plugin, native in Claude Code and Cursor

For the `disable-model-invocation` mechanism, placement instead follows the skill convention — write
the canonical `SKILL.md` at `~/.agents/skills/<name>/`, `.agents/skills/<name>/`, or
`plugins/<plugin-name>/skills/<name>/`, then symlink `.claude/skills/<name>` (and other targeted
runtime locations) to it.

## Gather requirements

Ask the user:

1. **Name** — kebab-case slug, becomes `/name`
2. **Purpose** — one sentence: what does invoking this command do?
3. **Arguments** — does it accept free text after the command (`$ARGUMENTS`)? What does the caller
   pass?
4. **Pre-approved tools** — which tools should run without a permission prompt during this
   command's turn? (`allowed-tools:` frontmatter). This grants; it does not fence. Every other tool
   stays callable under normal permission settings. If the requirement is "this command must never
   touch X", that is `disallowed-tools:`, not `allowed-tools:`.
5. **Steps** — the actual workflow body, numbered

If improving an existing file, read it first. Ask only about gaps or issues found.

## Draft the command file

**`commands/` folder mechanism:**

```markdown
---
description: <one sentence — shown in the `/` menu, keep it scannable, no token-budget pressure since it never enters trigger matching>
allowed-tools: <tools to pre-approve, comma-separated — omit if nothing needs pre-approval>
---

<Body — the workflow itself, written as if the user just typed `/name`.>

$ARGUMENTS
```

**`disable-model-invocation` mechanism:**

```markdown
---
name: <name>
description: <capability the command performs — never matched for auto-trigger, but still keep it accurate for the `/` menu>
disable-model-invocation: true
---

# <Title>

## Instructions
1. <step>
2. <step>
```

## Create symlinks (`disable-model-invocation` mechanism only)

After writing the canonical `SKILL.md`, create symlinks for each selected runtime, same as any skill:

```bash
ln -sf <relative-path-to-canonical> <runtime-location> && ls <runtime-location>   # verify it resolves
```

The `commands/` folder mechanism has no canonical+symlink step — the file at its placement path is
the whole artifact, unless distributed via a plugin's `commands/` subfolder (already native, no
symlink needed).

## Audit before handing back

For the `disable-model-invocation` mechanism, run the structural audit and fix any CRITICAL or HIGH
finding before presenting the skill:

```bash
npx cyberplace@0.2.2 audit validate --path <placement-dir>/<name>   # resolve <version> via: npm view cyberplace version — never @latest
```

The `commands/` folder mechanism is not a `SKILL.md` — the audit tool does not apply; check by hand
that `description` is present and the body reads correctly as a `/name` invocation.

## Run quality checks

After writing, evaluate the command against these checks:

| # | Check | Severity |
|---|-------|----------|
| C1 | `description` field present | CRITICAL |
| C2 | Body reads correctly as a standalone `/name` invocation, not dependent on prior conversational context | HIGH |
| C3 | Irreversible or destructive steps are called out explicitly, not buried mid-body | HIGH |
| C4 | `$ARGUMENTS` used only if the command actually accepts caller input | MEDIUM |
| C5 | `disable-model-invocation` mechanism: `name` matches the file's directory stem | HIGH |
| C6 | `commands/` folder mechanism: no stray `disable-model-invocation` field (meaningless outside a `SKILL.md`) | MEDIUM |

Report results. Fix any CRITICAL or HIGH failures before presenting the final file to the user.

## Report and hand off to the ACED eval loop

Summarize:

- Canonical file path (and runtime symlinks, `disable-model-invocation` mechanism only)
- Mechanism chosen and why
- Audit outcome (or the by-hand check result for the `commands/` folder mechanism)

**Escaped** entry: stop here — the artifact resolved `non-durable`, so there is no mission to hand
off to.

**Standalone or impl-producer** entry: point the user at the **ACED eval loop** to spec and score
the command — run `sdd:start-mission` (the conductor resolves the ACED roles for the `command`
artifact-type) to author its frozen `.feature` (with inline `@trigger` Examples exercising `/name`
invocation), or `add-scenario` / `run` to grow and score it. Do **not** embed a legacy trigger-query
eval file as the test step — scoring is the ACED loop's job.
