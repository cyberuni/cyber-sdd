---
"cyber-aced": patch
---

`improve-skill` Q3 and Q18 now treat only by-name skills as partial: `user-invocable: false` together with `disable-model-invocation: true` or a `By name only` / `Partial Skill:` description. A hidden skill with a trigger description is model-invoked and no longer warns.
