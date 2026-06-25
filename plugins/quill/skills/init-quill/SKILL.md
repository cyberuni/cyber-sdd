---
name: init-quill
description: Use this skill to register quill as the SDD documentation plugin for this project — writes a quill role-map entry to .agents/universal-plugin.json so sdd-operator resolves the quill production-chain roles for documentation domain types.
---

# Init Quill

Register quill in the project's SDD plugin registry so `sdd-operator` can resolve quill's production-chain roles by reading **only** `.agents/universal-plugin.json` — no plugin-directory scanning at runtime. This is the lockfile pattern: resolution happens here, at setup.

## Workflow

### 1. Locate the registry file

Look for `.agents/universal-plugin.json` at the project root. If it exists, read and parse it; otherwise create it with `{}`.

**Fail closed on a corrupt file.** If the file exists but contains malformed JSON, **fail with an error and stop — do not overwrite it**. Silently rewriting a corrupt file could destroy valid entries from other plugins; leave the file untouched and let a human repair it.

### 2. Determine quill's version

Read quill's own version from its plugin manifest (it ships inside the plugin, so it knows its version for free — no scan). Use it as the `version` stamp below.

### 3. Write the quill entry (rewrite-on-init migration)

Find the entry where `"name": "quill"` in the `sdd-plugins` array:

- **Not found** → append the canonical entry (create the array if absent).
- **Found, old shape** (the pre-operator `scenario-advisor` / `implementer` keys) → **rewrite** it to the role-map shape below. The operator never reads the old shape — migration is rewrite-on-init, not a dual-reader.
- **Found, role-map shape, stale `version`** → rewrite when the recorded version differs from quill's own (install / upgrade / manual re-run reconciles drift here; the operator never compares versions at runtime).

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

**The `governances` block is required.** Every entry must carry a `governances` map (each binding may be `null`, but the block itself must be present). Reject a payload with no `governances` block — fail with an error and **do not write** the file.

### 4. Write the updated file

Write `.agents/universal-plugin.json` back with the updated contents.

### 5. Report

Confirm:
- `.agents/universal-plugin.json` written (created or updated)
- quill role-map entry present under `sdd-plugins`, stamped with quill's version
- Domains registered: `documentation`, `guide`, `tutorial`, `article`, `reference`

Next step: use `create-spec` (sdd plugin) to scaffold a documentation spec; the operator resolves the quill roles automatically.
