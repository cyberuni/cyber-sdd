---
name: manage-model-runners
description: "Partial Skill: invoke by name only — the ACED manage-model-runners engine — loaded in-session by the ACED manage gateway, not user-triggered."
user-invocable: false
metadata:
  internal: true
---

# manage-model-runners

Maintain a family of **runner agent definitions — one per model**. Each runner is a **neutral
executor** pinned to a single model so a skill-under-test can be run as a real subagent under that
model, giving ACED a real (not judge-simulated) signal for effectiveness and token/cost. Loaded
in-session by the `manage` gateway; **not user-invocable**.

Three operations, all **additive**: **add** the missing runners, **list** the family, **remove** only
the runners the user explicitly names. This engine **never auto-removes** — a model missing from a
target list is left alone (the user may run multiple harnesses, so a runner this engine did not just
create must not be culled).

Canonical files live at user-global `~/.agents/agents/model-runner-<model>.md`, with runtime symlinks
— the exact placement + `ln -sf` procedure `define-agent` uses.

## Determine the operation

Read the request for the operation. If it is unclear, ask (add / list / remove).

## Resolve the target model list (add)

Before writing anything, resolve which models to cover, in order:

1. **Explicit** — models named in the request/args.
2. **Curated config** — `.agents/aced/models.toml`, a `models = ["opus", "sonnet", ...]` list the
   user maintains (nothing in the environment enumerates available models, so this is the source of
   truth when present).
3. **Proposed default** — when neither is given, propose the known model aliases the agent-definition
   `model:` field accepts (`opus`, `sonnet`, `haiku`) and any newer aliases the user names.

**Propose and confirm — never guess.** Show the resolved list and confirm it before writing. A model
value is whatever the runtime's agent-definition `model:` field accepts.

## add — create the missing runners

For each target model:

- If `~/.agents/agents/model-runner-<model>.md` **already exists**, leave it untouched (add is
  **idempotent** — no duplicate, no overwrite).
- Otherwise write a **new runner def** (below) at the canonical path and create one runtime symlink
  per selected runtime.

Exactly **one def per model** — model is the only axis. Do not fan out over effort (see the effort
note below).

### The runner def (neutral executor)

Write the canonical file. The body is **identical across the family** — only `name` and `model`
differ:

```markdown
---
name: model-runner-<model>
description: >
  Use this agent to run an ACED skill-under-test as a real subagent under the <model> model, so its
  effectiveness and token/cost can be measured. Delegated runner — it executes the given task exactly
  and returns the result.
tools: *
model: <model>
---

# model-runner-<model>

You are a neutral executor pinned to the **<model>** model. Run the skill or task you are given
**exactly as specified** — invoke the named skill, follow its steps, and return its result.

## Responsibilities

- Execute the given skill/task faithfully, adding no scope of your own.
- Return exactly what the task asks for (a result, an artifact path, or a confirmation).

## Out of scope

- Do not reinterpret, expand, or optimize the task beyond what it states.
- Do not choose a different model — you exist to exercise **<model>** specifically.
```

Then create the runtime symlinks (Claude Code `~/.claude/agents/<name>.md`, and Cursor / Codex if the
user selected them) with relative `ln -sf`, and verify each resolves — as in `define-agent`.

## list — report the family

Scan `~/.agents/agents/` for `model-runner-*.md` and report each: the model, the canonical path, and
any `effort:` stamp. Show nothing else.

## remove — only what the user names

Remove **only** the runner def(s) the user **explicitly names** (by model or path). For each:

- Show the file to be deleted and **confirm before deleting** the user-global file and its symlinks.
- **Never** remove a runner just because it is absent from a target list — this engine does no
  reconcile-delete. If the user asks to "clean up", list the family and let them name which to remove.

## Effort stamp (optional)

A plain `Agent`/`Task` spawn can override a subject's `model` but **not** its `effort` (effort lives
in the def frontmatter); a Workflow `agent()` call can pass `effort` per call. So one def per model
serves a Workflow-based runner directly. When a **plain-spawn** runner needs a fixed effort, stamp it
on request: add/update writes an `effort: <low|medium|high|xhigh|max>` field on the named model's def,
still keeping exactly one def per model. Do not create model×effort defs.

## Report

Summarize what changed: models added (with canonical paths + symlinks), the current family (list), or
the runners removed. Point the user at the future ACED eval-run sweep that will use these runners.
