---
"cyber-aced": patch
---

chore(aced): update `@cyberuni/agent-harness` to 0.7.1

0.7.1 declares `sideEffects`, so the compiled `bench` script tree-shakes the unused `yaml` import without the local patch.
