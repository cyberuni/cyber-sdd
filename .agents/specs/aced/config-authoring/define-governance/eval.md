---
subject: plugins/aced/skills/define-governance/SKILL.md
eval:
  layers:
    - behavior
  judge:
    model: claude-sonnet-4-6
    default_threshold: 4
---

Eval binding for the define-governance capability — binds the frozen `define-governance.feature` suite to its subject
configuration (`plugins/aced/skills/define-governance/SKILL.md`) and its run policy. The suite runs entirely at the `behavior` layer (no
`@trigger` or `@quality` scenarios); judge model and threshold are the ACED defaults, stated
explicitly.
