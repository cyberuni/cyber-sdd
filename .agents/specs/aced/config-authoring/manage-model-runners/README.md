---
spec-type: behavioral
concept: [config-authoring, benchmarking]
---

# manage-model-runners — manage the per-model runner agent-def family

Maintain a family of **runner agent definitions — one per model** at user-global
`~/.agents/agents/model-runner-<model>.md`, each a neutral executor pinned to a single model so a
skill-under-test can be run as a real subagent under that model for cost/quality benchmarking. An
**internal, non-invokable** engine reached only through the ACED `manage` gateway (`../../manage/`);
it authors agent-definition artifacts, so it lives beside `define-agent` in `config-authoring/`.

> **This is a single behavioral unit, not an overview** — one engine skill. This spec owns the
> behavior + suite ([`manage-model-runners.feature`](./manage-model-runners.feature)); the impl is
> the non-invokable `manage-model-runners` skill in `plugins/aced/skills/manage-model-runners/`.

## Use Cases

**Fit:** partial — the operations are mechanical (add / list / remove runner def files), reached via
the `manage` gateway rather than by an activation decision, so trigger near-miss balance is N/A; the
behavior and structural layers still carry signal (the additive-only invariants — idempotent add,
never auto-remove, confirm before removal — and the one-def-per-model runner-def shape).

**Subject** — an internal engine, loaded by the `manage` gateway, that manages a per-model runner
agent-def family with three **additive** operations — **add** the missing runners, **list** the
family, **remove** only runners the user explicitly names — writing each runner as a neutral,
model-pinned executor at its user-global canonical path plus runtime symlinks.

**Non-goals** — authoring a bespoke single agent definition (`define-agent`); formalizing a workflow
skill (`define-skill`); **auto-removing** runners a target list omits (a model this engine did not
just create is never culled — the user may run multiple harnesses); running the skills-under-test or
capturing token/cost (a future `eval-run` capability); varying **effort** as a def axis (one def per
model; effort is stamped only on request). It is **not user-invocable** — it is reached via `manage`.

Every scenario in [`manage-model-runners.feature`](./manage-model-runners.feature) maps to one of
these behaviors:

| Behavior | What it covers |
|---|---|
| **reached via the gateway** | the engine is loaded by the `manage` gateway, not triggered directly by a bare user invocation |
| **resolve + confirm the model list** | `add` resolves a target model list (explicit args → curated config → a proposed default of the known model aliases) and confirms it, never guessing |
| **add the missing runners** | `add` creates a runner def for every target model that has no def yet |
| **add is idempotent** | `add` leaves existing runner defs untouched and creates no duplicates on re-run |
| **one def per model** | the family varies over model only; each model has exactly one runner def |
| **neutral model-pinned executor** | each runner def is a neutral executor whose body is identical across the family, differing only in its pinned `model` |
| **canonical path + symlinks** | a runner def is written at its user-global canonical path and one runtime symlink is created per selected runtime |
| **list the family** | `list` reports the current runner family — each model, its def path, and any effort stamp |
| **remove only what is named** | `remove` deletes only the runner def(s) the user explicitly names |
| **never auto-remove** | a model absent from a target list is left intact — the engine never reconcile-deletes |
| **confirm before removal** | a user-global runner def is deleted only after confirmation |
| **optional effort stamp** | `add`/update may stamp an `effort` on an existing def when requested, supporting a plain-spawn runner |

## Why runner defs, one per model

A skill's effectiveness and token/cost depend on the model (and effort) it runs under, but ACED's
eval loop only *simulates* behavior via a judge — it never runs a skill under a real model. A neutral
runner def pinned to a model turns "run this skill under model X" into a real subagent spawn. Model is
the only def axis because a plain `Agent`/`Task` spawn can override the subject's `model` but not its
`effort` (effort lives in the def frontmatter); a Workflow `agent()` call can pass `effort` per call.
So one-per-model serves a Workflow runner directly, and the optional effort stamp serves a plain-spawn
runner — without a model×effort def explosion.

## Scenarios (colocated)

The behavior suite is [`manage-model-runners.feature`](./manage-model-runners.feature) — gateway
reach, the add/list/remove operations, the additive-only invariants (idempotent add, never
auto-remove, confirm before removal), and the runner-def shape (one per model, neutral executor,
canonical path + symlinks). Cross-capability e2e scenarios live in `../../workflows/`.
