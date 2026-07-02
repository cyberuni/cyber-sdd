# init-aced

Registers ACED as an SDD plugin for agent-configuration domains (`skill`, `subagent`, `command`, `agents-section`) by writing a role-map entry to `.agents/universal-plugin.json` under `sdd-plugins[]`. Once registered, the conductor resolves the ACED production-chain roles — `aced-scenario-writer` (spec-producer), `aced-spec-validator` (spec-judge), `aced-impl-judge` (impl-judge) — by reading only that one file at runtime (no plugin-directory scanning).

Idempotent: re-running rewrites an old-shape or version-stale entry in place (rewrite-on-init migration). Spec creation itself is owned by the `sdd` plugin's `start-mission` / `spec-gate`; this skill only wires the registry.
