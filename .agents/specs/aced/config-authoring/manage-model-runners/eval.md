---
subject: plugins/aced/skills/manage-model-runners/SKILL.md
eval:
  layers:
    - behavior
  judge:
    model: claude-sonnet-4-6
    default_threshold: 4
---

Eval binding for the manage-model-runners capability — binds the frozen `manage-model-runners.feature` suite to its subject
configuration (`plugins/aced/skills/manage-model-runners/SKILL.md`) and its run policy. The suite runs entirely at the `behavior` layer (no
`@trigger` or `@quality` scenarios); judge model and threshold are the ACED defaults, stated
explicitly.
