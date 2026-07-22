---
subject: plugins/aced/skills/define-skill/SKILL.md
eval:
  layers:
    - behavior
  judge:
    model: claude-sonnet-4-6
    default_threshold: 4
---

Eval binding for the define-skill capability — binds the frozen `define-skill.feature` suite to its
subject configuration (`plugins/aced/skills/define-skill/SKILL.md`) and its run policy. The suite is
entirely boolean/behavior-layer (no `@trigger` or `@rubric` scenarios), so only the `behavior` layer
runs; judge model and threshold are the ACED defaults, stated explicitly.
