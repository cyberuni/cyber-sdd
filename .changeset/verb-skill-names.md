---
"cyber-aced": minor
"cyber-sdd": minor
---

**Breaking:** skills that used `improve`, `manage`, or a bare common verb are renamed to follow the cyber-agentkit verb rules. The old names no longer resolve; invoke the new ones.

ACED:

- `aced:improve` → `aced:enhance-aced`
- `aced:compare` → `aced:compare-aced`
- `aced:report` → `aced:report-aced`
- `aced:manage` → `aced:config-aced`
- `aced:manage-model-runners` → `aced:config-model-runners` (loaded by `config-aced`)
- `aced:manage-skill-dirs` → `aced:config-skill-dirs` (loaded by `config-aced`)

SDD:

- `sdd:init` → `sdd:init-sdd`
- `sdd:manage` → `sdd:corpus`, the router for non-mission work on the spec corpus
- `sdd:manage-ignore` → `sdd:config-ignore` (loaded by `corpus`)
- `sdd:manage-scenario-bridge` → `sdd:config-scenario-bridge` (loaded by `corpus`)
- `sdd:manage-spec-anchors` → `sdd:config-spec-anchors` (loaded by `corpus`)
