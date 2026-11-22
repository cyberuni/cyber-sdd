---
"cyber-aced": minor
---

**Breaking:** four more ACED skills are renamed to follow the cyber-agentkit verb rules. The old names no longer resolve; invoke the new ones.

- `aced:manage-model-runners` → `aced:config-model-runners`
- `aced:manage-skill-dirs` → `aced:config-skill-dirs`
- `aced:compare` → `aced:compare-aced`
- `aced:report` → `aced:report-aced`

The skill-dirs engine script is renamed with its skill: `skills/manage-skill-dirs/scripts/manage-skill-dirs.mjs` is now `skills/config-skill-dirs/scripts/config-skill-dirs.mjs`.
