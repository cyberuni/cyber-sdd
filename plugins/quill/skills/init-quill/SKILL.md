---
name: init-quill
description: Use this skill to register quill as the SDD documentation plugin for this project — writes a quill entry to .agents/universal-plugin.json so sdd-author resolves quill-implementer and quill-scenario-advisor for documentation domain types.
---

# Init Quill

Register quill in the project's SDD plugin registry so `sdd-author` can resolve quill contracts without per-spec `plan.md` declarations.

## Workflow

### 1. Locate the registry file

Look for `.agents/universal-plugin.json` at the project root.

- If it exists: read it.
- If it does not exist: create it with contents `{}`.

### 2. Write quill entry

Locate the existing entry where `"name": "quill"` in the `sdd-plugins` array:

- If found: replace that entry with the canonical entry below.
- If not found: append the canonical entry to the `sdd-plugins` array (create the array if absent).

Do not reorder or reformat other entries in the file.

**Canonical entry:**

```json
{
  "name": "quill",
  "scenario-advisor": ["documentation", "guide", "tutorial", "article", "reference"],
  "implementer": ["documentation", "guide", "tutorial", "article", "reference"]
}
```

### 3. Write the updated file

Write `.agents/universal-plugin.json` back with the updated contents.

### 4. Report

Confirm:
- `.agents/universal-plugin.json` written (created or updated)
- quill entry present under `sdd-plugins`
- Domain types registered: `documentation`, `guide`, `tutorial`, `article`, `reference`

Next step: use `create-spec` (sdd plugin) to scaffold a documentation spec; quill will be resolved automatically as the scenario advisor and implementer.
