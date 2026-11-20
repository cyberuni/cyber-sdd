---
"cyber-aced": patch
---

`skillify` and `define-command` run `cyberplace` through a forwarding script, `scripts/cyberplace.mjs`, pinned to `cyberplace` 0.3.0, instead of `npx cyberplace@<version>` with a run-time `npm view` lookup. The `cli-resolution` and `skill-design` references teach the forwarder model in place of the `upx` and pinned-`npx` fallbacks.
