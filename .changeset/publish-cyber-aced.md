---
"cyber-aced": minor
---

Publish `cyber-aced` to npm so the `aced-bench` bin reaches consumers: a CI job or tool can run `npx aced-bench` without the ACED plugin installed. The bin ships compiled to `dist/aced-bench.js`, because Node does not strip types from files under `node_modules`. `aced-bench help` (or `--help`, `-h`) prints the usage and exits 0.
