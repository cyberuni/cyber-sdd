---
name: init-aced
description: Use this skill to register ACED as the SDD plugin for agent-configuration domains — writes an aced role-map entry to .agents/universal-plugin.json so the conductor resolves the ACED production-chain roles for skills, subagents, commands, and AGENTS.md sections.
---

# Init ACED

Register ACED in the project's SDD plugin registry so the conductor resolves the ACED production-chain roles by reading **only** `.agents/universal-plugin.json` — no plugin-directory scanning at runtime (the lockfile pattern).

## Workflow

### 1. Locate the registry file

Look for `.agents/universal-plugin.json` at the project root. If it exists, read and parse it; otherwise create it with `{}`.

**Fail closed on a corrupt file.** If the file exists but contains malformed JSON, **fail with an error and stop — do not overwrite it**. Silently rewriting a corrupt file could destroy valid entries from other plugins; leave the file untouched and let a human repair it.

### 2. Determine the ACED version

Read ACED's own version from its plugin manifest (it ships inside the plugin, so it knows its version for free). Use it as the `version` stamp.

### 3. Write the aced entry (rewrite-on-init migration)

Find the entry where `"name": "aced"` in the `sdd-plugins` array:

- **Not found** → append the canonical entry (create the array if absent).
- **Found, old shape** (the legacy `scenario-advisor` / `implementer` keys, or the legacy `domains[]` + shared `roles`/`governances`) → **rewrite** it to the `squads[]` shape below.
- **Found, `squads[]` shape, stale `version`** → rewrite when the recorded version differs (install / upgrade / manual re-run reconciles drift here; the conductor never compares versions at runtime).

Do not reorder or reformat other entries.

**Canonical entry:**

```json
{
  "name": "aced",
  "version": "<aced version>",
  "squads": [
    {
      "artifact-types": ["skill", "subagent", "command", "agents-section"],
      "roles": {
        "spec-producer": "aced-scenario-writer",
        "solution-producer": null,
        "spec-judge": "aced-spec-validator",
        "impl-producer": null,
        "impl-judge": "aced-impl-judge"
      },
      "governances": {
        "oracle-spec": null,
        "builder-spec": "aced-builder-spec",
        "builder-impl": "aced-builder-impl",
        "architect-spec": null,
        "architect-impl": null
      }
    }
  ]
}
```

ACED serves its four agent-config artifact-types with one squad. `impl-producer: null` — writing the agent config is done by the `define-agent` / `improve` skills or the SDD-default impl-producer (the conductor running `impl-producer-governance` via a spawned builder), not a bound impl-producer agent. `solution-producer: null` uses the SDD default. ACED binds its own `builder-spec` (`aced-builder-spec`) and `builder-impl` (`aced-builder-impl`) bars; each remaining `null` governance uses the SDD default actor-gate bar.

**Each squad's `governances` block is required.** Every squad must carry a `governances` map (each binding may be `null`, but the block itself must be present). Reject a payload with a squad missing its `governances` block — fail with an error and **do not write** the file.

### 4. Write the updated file

Write `.agents/universal-plugin.json` back with the updated contents.

### 5. Ensure ACED run output is git-ignored

Run `scripts/ensure-results-ignored.mts` (this skill's own `scripts/` dir) to ensure `.agents/aced/results/` — the shared ACED run-output directory `run` writes to — is git-ignored at the repo root. Idempotent; a non-zero exit means it could not guarantee the ignore (e.g. not inside a git repo) — surface that to the user rather than continuing silently.

### 6. Report

Confirm the `.agents/universal-plugin.json` aced entry is present under `sdd-plugins`, stamped with the ACED version, with a squad serving artifact-types `skill`, `subagent`, `command`, `agents-section`.

Next step: use `sdd:start-mission` (sdd plugin) to scaffold an agent-configuration spec; the conductor resolves the ACED roles automatically.
