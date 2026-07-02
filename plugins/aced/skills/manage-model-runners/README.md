# manage-model-runners

Internal, non-invokable ACED engine — loaded in-session by the `manage` gateway, not triggered
directly. It maintains a family of **runner agent definitions, one per model**, at user-global
`~/.agents/agents/model-runner-<model>.md`.

## What it does

Each runner is a **neutral executor** pinned to a single model, so an ACED skill-under-test can be run
as a real subagent under that model and its effectiveness / token-cost measured (ACED's eval loop
otherwise only *simulates* behavior via a judge).

Three **additive** operations:

- **add** — resolve + confirm a target model list (explicit args → `.agents/aced/models.toml` → the
  known model aliases), then create a runner def for each model that has none. Idempotent.
- **list** — report the current family (model → path → any effort stamp).
- **remove** — delete only the runner def(s) the user explicitly names, after confirmation.

It **never auto-removes**: a model absent from a target list is left intact — the user may run
multiple harnesses, so a runner this engine did not just create is never culled.

One def per model; effort is not a def axis. Because a plain subagent spawn can override `model` but
not `effort`, an optional `effort:` stamp can be written on a def on request (for a plain-spawn
runner) without creating model×effort defs.
