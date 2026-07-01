---
spec-type: behavioral
concept: plugin-registry
---

# registry — register Quill as the documentation SDD plugin

Write the quill role-map entry to `.agents/universal-plugin.json` so the conductor resolves Quill for the
documentation artifact-types (`init-quill`).

## Use Cases

**Subject** — registering Quill in the project's SDD plugin registry (`.agents/universal-plugin.json`) so the
conductor resolves the Quill production-chain for the documentation artifact-types by reading only that one
file (the lockfile pattern), including version-stamp refresh and old-shape migration.
**Non-goals** — resolving roles at runtime (the conductor reads the registry); authoring a spec
(`start-mission`); the global marketplace catalog; editing other plugins' entries.

_The use-case table + the `registry.feature` are authored in per-unit explore._
