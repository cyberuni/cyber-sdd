---
"cyber-aced": patch
---

fix(aced): run the skill engines when installed under `node_modules`

Node refuses to strip types from a file under `node_modules`, so every `node <skill>/scripts/<engine>.mts` command failed when the skills came from npm or a pnpm skill link. The engines' sources now live in `src/`, and `universal-plugin plugin build` compiles each one into a self-contained `skills/<skill>/scripts/<engine>.mjs`, which the skills run on every channel. Tests and sources no longer ship inside the skill folders. The canonical manifest moved from `.plugin/plugin.json` to `plugin.json`, and the build now also derives Copilot CLI's `com.github.copilot/agents/`.
