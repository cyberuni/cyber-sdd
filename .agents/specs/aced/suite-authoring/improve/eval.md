---
subject: plugins/aced/skills/improve/SKILL.md
eval:
  layers:
    - behavior
  judge:
    model: claude-sonnet-4-6
    default_threshold: 4
---

Eval binding for the improve capability — binds the frozen `improve.feature` suite to its subject
configuration (`plugins/aced/skills/improve/SKILL.md`) and its run policy. The suite runs entirely at the `behavior` layer (no
`@trigger` or `@quality` scenarios); judge model and threshold are the ACED defaults, stated
explicitly.
