---
spec-type: behavioral
---

# registry — register ACED as the agent-config SDD plugin

Write the aced role-map entry to .agents/universal-plugin.json so the conductor resolves ACED for agent-config artifact-types (init-aced).

## Use Cases

**Subject** — registering ACED in the project's SDD plugin registry (`.agents/universal-plugin.json`)
so the conductor resolves the ACED production-chain for the agent-config artifact-types by reading
only that one file (the lockfile pattern).
**Non-goals** — resolving roles at runtime (the conductor reads the registry); authoring a spec
(`start-mission`); the global marketplace catalog (a separate layer); editing other plugins' entries.

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Trigger on a registration request | a request to register / init ACED as the SDD plugin, vs. a sibling intent (run evals, change the project spec) carrying agent-config vocabulary | `init-aced` fires for registration and defers when the intent belongs to `run` / `start-mission` |
| Register when absent | no `aced` entry, or no registry file at all | the canonical `squads[]` entry is appended, creating the file and array if needed; other entries are untouched |
| Migrate an old-shape entry | an `aced` entry in a legacy shape (`domains[]` or pre-squad role keys) | it is rewritten to the `squads[]` shape |
| Refresh a stale stamp | an `aced` `squads[]` entry stamped with a different version | the entry is rewritten with the current ACED version (idempotent when already current) |
| Fail closed on a bad payload | a registry file that is malformed JSON, or a squad missing its required `governances` block | it stops with an error and writes nothing, leaving the file untouched |
| Confirm the result | a successful registration | it confirms the entry, its version, and the served artifact-types |
