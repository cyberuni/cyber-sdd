---
subject: plugins/aced/skills/bench/SKILL.md
eval:
  layers:
    - behavior
  judge:
    model: claude-sonnet-4-6
    default_threshold: 4
---

Eval binding for the bench skill — binds the `skill.feature` suite to its subject configuration
(`plugins/aced/skills/bench/SKILL.md`, built in a later change) and its run policy. The suite runs
entirely at the `behavior` layer (no `@trigger` or `@quality` scenarios: the skill is reached by name);
judge model and threshold are the ACED defaults, stated explicitly. No `bench:` key — the skill's own
outcomes are graded by simulation, not measured.
