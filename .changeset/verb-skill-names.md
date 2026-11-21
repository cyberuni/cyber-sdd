---
"cyber-aced": minor
---

**Breaking:** ACED skills that used `improve`, `manage`, or a bare common verb are renamed to follow the cyber-agentkit verb rules. The old names no longer resolve; invoke the new ones.

- `aced:improve` → `aced:enhance-aced`
- `aced:compare` → `aced:compare-aced`
- `aced:report` → `aced:report-aced`
- `aced:manage` → `aced:config-aced`
- `aced:manage-model-runners` → `aced:config-model-runners` (loaded by `config-aced`)
- `aced:manage-skill-dirs` → `aced:config-skill-dirs` (loaded by `config-aced`)
