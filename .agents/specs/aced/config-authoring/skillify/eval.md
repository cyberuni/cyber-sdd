---
subject: plugins/aced/skills/skillify/SKILL.md
eval:
  layers:
    - trigger
    - behavior
    - quality
  judge:
    model: claude-sonnet-4-6
    default_threshold: 4
  trigger:
    activation_threshold: 0.5
    runs: 3
---

Eval binding for the skillify capability — binds the frozen `skillify.feature` suite to its subject
configuration (`plugins/aced/skills/skillify/SKILL.md`) and its run policy. The suite spans the `trigger`, `behavior`, and `quality`
layers; the trigger layer is scored over 3 runs against a 0.5 activation threshold; judge model and
threshold are the ACED defaults, stated explicitly.
