---
"cyber-sdd": patch
---

`classify-edit-class`, `touch-set-correction` and `verify-scenarios` now run from an installed plugin. Each imported gherkin-cli as a package, and an installed plugin has no `node_modules`, so each failed with module-not-found. They now import the same self-contained gherkin-cli bundle the spec gate's `check-suite` uses.
