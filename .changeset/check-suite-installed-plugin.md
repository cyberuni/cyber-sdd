---
"cyber-sdd": patch
---

The spec gate's `check-suite` engine now runs from an installed plugin. It imported gherkin-cli as a package, and an installed plugin has no `node_modules`, so the producer's suite self-check failed with module-not-found. The engine now imports a self-contained gherkin-cli bundle shipped beside it.
