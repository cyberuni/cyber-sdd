---
name: define-skill
description: 'Use this skill when the user wants to create, scaffold, or formalize a workflow skill — a process, tool-based, or standard SKILL.md — from scratch or from an existing ad-hoc workflow. Trigger on "create a skill", "write a skill for X", "I want a skill that…", "turn this workflow into a skill", or "help me build this skill", even if they do not say "skill" explicitly. Not for agent definitions or personas (define-agent), reference-only rule sets (define-governance), or extracting the current session (skillify).'
---

# Define Skill

Create or improve a **workflow skill** — a process, tool-based, or standard SKILL.md — then hand it
to the ACED eval loop to spec and score.

When the conductor dispatches this skill as a generic builder (`produced-by sdd:automaton`) for the
ACED **impl-producer** role (implement mode, against a frozen `.feature`), it builds the **SKILL.md**
to pass the frozen suite. The **verification is the frozen `.feature` itself** — its inline `@rubric`
scenarios and `@trigger` `Examples`, authored by `aced-scenario-writer` at explore — so no separate
eval suite is authored here; `eval.md` carries only the `subject` binding and run policy. As
impl-producer it self-aligns to `sdd:ownership-governance` plus the resolved **builder-impl +
architect-impl** bars (the ACED builder-impl is `aced:aced-builder-impl`). If the impl-judge reports
scenario failures, load `aced-impl-producer` to run the diagnose-and-refine loop rather than
re-deriving it here.

There are two other entry points, both with **no frozen `.feature`** and **only the SKILL.md**
produced:

- **Standalone** — the user invokes this skill directly, outside any CR. Scaffold, then offer the
  ACED eval loop (see "Report and hand off" below) rather than assuming it.
- **Escaped** — the gateway or `start-mission` invokes this skill directly after resolving the
  request `non-durable` (the escape hatch, before any CR opens). There is no mission to hand off
  within: scaffold, audit, report, and **stop** — do not mention the ACED eval loop.

## Route the request first

`define-skill` owns **workflow skills**. Defer when the intent belongs to a sibling that carries the
same config vocabulary:

| The request is really about… | Defer to |
|---|---|
| a named reusable **agent** / delegated worker / an in-context **persona** | `define-agent` |
| a **reference-only rule set / governance** other skills load but never execute as steps | `define-governance` |
| generalizing **the current session's** work into a skill | `skillify` |
| **scoring** an existing config, or **adding** an eval case | `run` / `add-scenario` |
| **diagnosing** why an existing skill's evals fail | `improve` |

A persona request that surfaces mid-authoring is handed to `define-agent` — do not scaffold a persona
skill here.

## Load the governance

Before writing content, load the **skill-design** governance and read stdout as the authoritative
rules for principles, progressive disclosure, description structure, and when to extract deterministic
logic to a script:

```bash
npx cyberplace@0.2.0 governance show skill-design   # resolve <version> via: npm view cyberplace version — never @latest
```

If the skill will ship a `scripts/` directory or document CLI commands agents run, also load
**agent-tool-output** for stdout / JSON / non-interactive / stderr rules.

## Settle the shape — five questions

Answer all five before writing a line of SKILL.md. If any cannot be inferred from what the user has
said, **ask the user to resolve it** — never invent it:

| Question | What to decide |
|---|---|
| Scope | What exactly does this skill do? One workflow only. |
| Trigger condition | When should it fire? List both explicit and implicit phrasings. |
| Output contract | What artifact does it produce — a file path, a report format, a decision? |
| Quality bar | How will you know a run succeeded? A concrete pass condition. |
| Out of scope | What must this skill explicitly NOT do? |

## Choose the pattern

Capture the workflow shape (separate from placement). A persona is **not** a pattern here — route it
to `define-agent`.

| Pattern | When to use it | Body shape |
|---|---|---|
| Process | Ordered multi-step workflow with decision points | Numbered steps |
| Tool-based | Consistent use of tools, systems, or connectors | Tool usage + guardrails |
| Standard | Tone, format, structure, or quality enforcement | Rules + pass conditions |

## Resolve placement and runtimes

Pick placement before scaffolding; if unclear from context, ask:

| Placement | Location | Notes |
|---|---|---|
| User-global | `~/.agents/skills/<name>/` | Personal, across all projects; no README |
| Project-private | `.agents/skills/<name>/` | Contributor tooling; add `metadata: internal: true` |
| Project-public | `skills/<name>/` (or `plugins/<plugin>/skills/<name>/`) | Shipped with a package; **requires a README** |

Check whether `npx skills` is available, then scaffold at the derived path:

```bash
npx skills --version 2>/dev/null && npx skills init <name> --dir <placement-dir>   # else: mkdir -p <placement-dir>/<name>
```

Ask which runtimes to target; the SKILL.md is the canonical file, each runtime location is a symlink
to it. Create and **verify** one symlink per selected runtime:

| Runtime | Symlink location |
|---|---|
| Claude Code | `~/.claude/skills/<name>` (or `.claude/skills/<name>`) |
| Cursor | `~/.cursor/skills/<name>` |
| Codex | `~/.codex/skills/<name>` |

```bash
ln -sf <relative-path-to-canonical> <runtime-location> && ls <runtime-location>   # verify it resolves
```

## Draft the SKILL.md

Write the file at the canonical path:

```markdown
---
name: <name>          # kebab-case, must match the directory name exactly
description: <capability> + "Use when <trigger>" + an implicit-phrasing example ("even if they say …")
---

# <Title>

## When to use
<the trigger condition, restated for the body>

## Instructions
1. <step>
2. <step>
```

- **Description** — the only field loaded at startup; it carries the whole triggering burden. Target
  150–400 characters (≤1024 hard limit): capability + "Use when…" + an implicit phrasing. For a
  **partial skill** (a reusable part other skills call by name, not user-triggered), set
  `user-invocable: false` and lead the description with the `"Partial Skill:"` prefix (recommended
  form `"Partial Skill: invoke by name only — <identity>. <caller>."`), kept minimal and
  non-trigger-shaped so it does not self-activate.
- **Body** — step-by-step, under 500 lines. Keep the *when* here; move any **deterministic,
  fixed-output** step to a `scripts/` file or an existing CLI and have the body only say when to run
  it.
- **Project-public** skills get a `README.md` beside the SKILL.md (title, when-to-use, what-it-does,
  install line). User-global skills get none.

### Improving an existing skill

If the target SKILL.md already exists, **read it first** and change **only** the gaps or issues found
— leave every sound part intact. This fills gaps in a skill's *definition*; diagnosing failing evals
is `improve`.

## Name gate/case scorers by role

For a subagent this skill scaffolds (realized as a partial skill, e.g. loaded via the ACED
impl-producer/impl-judge pattern): if its role is to **score or verify a specific gate or case**,
name it by that gate/scope, not a bare action verb — `<domain>-<gate>-judge` for a gate scorer (e.g.
`aced-impl-judge`), `<domain>-case-judge` for a case scorer (e.g. `aces-case-judge`). Reject
`implementer`, `judge`, `validator`, `reviewer`, `checker` alone. A producer subagent (e.g.
`scenario-writer`, `doc-writer`) keeps its action-oriented name — this check does not fire for it.

Evaluate this **in-skill quality check** — separate from the mechanical `audit validate` below — before
handing the skill back: a drafted gate/case scorer named with a bare action verb is a **HIGH** severity
finding; fix it (rename to the gate-and-scope form) before presenting the skill.

## Audit before handing back

Run the structural audit and fix any CRITICAL or HIGH finding **before** presenting the skill:

```bash
npx cyberplace@0.2.0 audit validate --path <placement-dir>/<name>
```

For a fuller pass, invoke the `improve-skill` skill. Do not present a skill with an
open CRITICAL finding.

## Report and hand off to the ACED eval loop

Summarize:

- Canonical SKILL.md path
- README path (project-public only)
- Runtime symlinks created and verified
- Audit outcome

**Escaped** entry: stop here — the artifact resolved `non-durable`, so there is no mission to hand
off to.

**Standalone or impl-producer** entry: point the user at the **ACED eval loop** to spec and score
the skill — run `sdd:start-mission` (the conductor resolves the ACED roles for the `skill`
artifact-type) to author its frozen `.feature` (with inline `@rubric`), or `add-scenario` / `run` to
grow and score it. Do **not** embed a legacy trigger-query eval file as the test step — scoring is the
ACED loop's job.
