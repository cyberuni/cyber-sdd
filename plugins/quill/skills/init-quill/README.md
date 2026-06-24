# init-quill

Registers Quill as the SDD documentation plugin for this project by writing a role-map entry to `.agents/universal-plugin.json` under `sdd-plugins[]`. Once registered, `sdd-operator` resolves the Quill production-chain roles — `quill-writer` (spec-producer), `quill-doc-writer` (impl-producer), `quill-implementer` (impl-judge) — by reading only that one file at runtime (no plugin-directory scanning). The `plan-producer` and `spec-judge` roles degenerate to their SDD defaults (`sdd-planner` and the static `validate-spec` format gate).

Idempotent: re-running rewrites an old-shape or version-stale entry in place (rewrite-on-init migration). Spec creation itself is owned by the `sdd` plugin's `create-spec` / `validate-spec`; this skill only wires the registry.
