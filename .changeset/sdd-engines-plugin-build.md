---
"cyber-sdd": patch
---

fix(sdd): run the skill engines on Node 22.11 to 22.17

Git and marketplace installs ran each engine's `.mts` source directly, which Node runs without a flag only from 22.18. The engines' sources now live in `src/`, and `universal-plugin plugin build` compiles each one into a self-contained `skills/<skill>/scripts/<engine>.mjs` that runs on every install channel and on Node 22.11 or later. The `.mjs` launchers, the `.bundle.mjs` files, and the separate `dist/` build are gone. The `sdd-check-specs` bin now runs the compiled `check-project-specs.mjs`, and the package has no runtime dependencies. The canonical manifest moved from `.plugin/plugin.json` to `plugin.json`.
