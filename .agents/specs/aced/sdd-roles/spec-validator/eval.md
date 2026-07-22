---
subject: plugins/aced/agents/aced-spec-validator.md
eval:
  layers:
    - behavior
  judge:
    model: claude-sonnet-4-6
    default_threshold: 4
---

Eval binding for the spec-validator capability — binds the frozen `spec-validator.feature` suite to its subject
configuration (`plugins/aced/agents/aced-spec-validator.md`) and its run policy. The suite runs entirely at the `behavior` layer (no
`@trigger` or `@quality` scenarios); judge model and threshold are the ACED defaults, stated
explicitly.
