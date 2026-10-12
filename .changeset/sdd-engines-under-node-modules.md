---
"cyber-sdd": patch
---

Make the skill engines run when the package is installed from npm. Node will not strip types from a file under `node_modules`, so `node <skill>/scripts/<engine>.mts` failed with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. The skills now document `node <skill>/scripts/<engine>.mjs`, a launcher that runs the `.mts` source in a checkout and a self-contained bundle (built into the package at pack time, with sibling skills inlined) under `node_modules`. `retire-plans` gains `--distilled <ledger-dir>` so the doctrine loop no longer imports the `.mts` directly.
