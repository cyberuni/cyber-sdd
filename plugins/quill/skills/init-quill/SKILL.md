---
name: init-quill
description: Use this skill to register quill as the SDD documentation plugin for this project — writes a quill role-map entry to .agents/universal-plugin.json so sdd-orchestrator resolves the quill production-chain roles for documentation domain types.
---

# Init Quill

Register quill in the project's SDD plugin registry so `sdd-orchestrator` can resolve quill's production-chain roles by reading **only** `.agents/universal-plugin.json` — no plugin-directory scanning at runtime. This is the lockfile pattern: resolution happens here, at setup.

## Workflow

### 1. Locate the registry file

Look for `.agents/universal-plugin.json` at the project root. If it exists, read it; otherwise create it with `{}`.

### 2. Determine quill's version

Read quill's own version from its plugin manifest (it ships inside the plugin, so it knows its version for free — no scan). Use it as the `version` stamp below.

### 3. Write the quill entry (rewrite-on-init migration)

Find the entry where `"name": "quill"` in the `sdd-plugins` array:

- **Not found** → append the canonical entry (create the array if absent).
- **Found, old shape** (the pre-orchestrator `scenario-advisor` / `implementer` keys) → **rewrite** it to the role-map shape below. The orchestrator never reads the old shape — migration is rewrite-on-init, not a dual-reader.
- **Found, role-map shape, stale `version`** → rewrite when the recorded version differs from quill's own (install / upgrade / manual re-run reconciles drift here; the orchestrator never compares versions at runtime).

Do not reorder or reformat other entries.

**Canonical entry:**

```json
{
  "name": "quill",
  "version": "<quill version>",
  "domains": ["documentation", "guide", "tutorial", "article", "reference"],
  "roles": {
    "spec-producer": "quill-writer",
    "plan-producer": null,
    "spec-judge": null,
    "impl-producer": "quill-doc-writer",
    "impl-judge": "quill-implementer"
  },
  "governances": { "director": null, "builder": null, "architect": null }
}
```

`spec-judge: null` degenerates to static doc criteria that `validate-spec` runs — no judge agent. `plan-producer: null` uses the SDD default planner. Each `null` governance uses the SDD default actor governance.

### 4. Write the updated file

Write `.agents/universal-plugin.json` back with the updated contents.

### 5. Report

Confirm:
- `.agents/universal-plugin.json` written (created or updated)
- quill role-map entry present under `sdd-plugins`, stamped with quill's version
- Domains registered: `documentation`, `guide`, `tutorial`, `article`, `reference`

Next step: use `create-spec` (sdd plugin) to scaffold a documentation spec; the orchestrator resolves the quill roles automatically.
