---
"cyber-sdd": patch
---

Fix the `sdd-check-specs` bin from an npm install. It pointed at the `.mts` source, which Node refuses to run under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`). The bin and every engine it spawns now ship compiled to `dist/`; the skill still runs the `.mts` source in place.
