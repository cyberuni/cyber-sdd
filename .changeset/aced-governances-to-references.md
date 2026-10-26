---
"cyber-aced": minor
---

Ship ACED's authoring standards as references.

- `skill-design`, `skill-repo-structure`, `agent-tool-output`, and `cli-resolution` move from `governances/` to `references/`, where the `reference` skill of `cyber-agentkit` serves them to any skill by name. The package no longer ships a `governances/` folder.
- `define-skill` and `improve-skill` load `skill-design` and `agent-tool-output` with the `reference` skill instead of reading paths by hand. A project override now lives at `.agents/references/<name>.md`, not `.agents/governances/<name>.md`.
- Each skill's own copy moves to `references/<name>.default.md`, the layout the `reference` skill reads as a skill's default.
