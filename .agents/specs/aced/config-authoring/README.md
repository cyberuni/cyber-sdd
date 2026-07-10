# config-authoring/ — author + maintain agent configuration

Creating the agent-config artifacts ACED evaluates: workflow skills (`define-skill`), agent
definitions (`define-agent`), governances (`define-governance`), and skills generalized from the
current session (`skillify`). Also **improving** an existing one:
[`improve-skill/`](./improve-skill/README.md) — audit a SKILL.md for structure, quality, and security
(the agent-graded audit plus a ported deterministic mechanical-check engine usable standalone in CI).

The **maintenance** engines — internal, non-invokable, reached via the [`manage/`](../manage/README.md)
gateway — also live here beside the config they touch:

- [`manage-model-runners/`](./manage-model-runners/README.md) — maintains a per-model runner agent-def
  family used to run skills-under-test under a real model for cost/quality benchmarking.
- [`list-skills/`](./list-skills/README.md) — inventories the skills discovered across the repo, the
  user-global install, and the shipped package.
- [`repair-private-skills/`](./repair-private-skills/README.md) — validates and repairs repo-private
  skill metadata under `.agents/skills`.
