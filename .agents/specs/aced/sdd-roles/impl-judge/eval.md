---
subject: plugins/aced/agents/aced-impl-judge.md
eval:
  layers:
    - behavior
  judge:
    model: claude-sonnet-4-6
    default_threshold: 4
---

Eval binding for the impl-judge capability — binds the frozen `impl-judge.feature` suite to its subject
configuration (`plugins/aced/agents/aced-impl-judge.md`) and its run policy. The suite runs entirely at the `behavior` layer (no
`@trigger` or `@quality` scenarios); judge model and threshold are the ACED defaults, stated
explicitly.
