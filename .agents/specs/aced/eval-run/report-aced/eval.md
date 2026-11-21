---
subject: plugins/aced/skills/report-aced/SKILL.md
eval:
  layers:
    - behavior
  judge:
    model: claude-sonnet-4-6
    default_threshold: 4
---

Eval binding for the report-aced capability — binds the frozen `report-aced.feature` suite to its subject
configuration (`plugins/aced/skills/report-aced/SKILL.md`) and its run policy. The suite runs entirely at the `behavior` layer (no
`@trigger` or `@quality` scenarios); judge model and threshold are the ACED defaults, stated
explicitly.
