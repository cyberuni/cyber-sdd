# config-authoring/ — author agent configuration

Creating the agent-config artifacts ACED evaluates: workflow skills (`define-skill`), agent
definitions (`define-agent`), governances (`define-governance`), and skills generalized from the
current session (`skillify`).

Also here: [`manage-model-runners/`](./manage-model-runners/README.md) — an internal, non-invokable
engine (reached via the `manage/` gateway) that maintains a per-model runner agent-def family used to
run skills-under-test under a real model for cost/quality benchmarking.
