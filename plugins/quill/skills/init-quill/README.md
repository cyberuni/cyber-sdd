# init-quill

Registers Quill as the SDD documentation plugin for this project by writing a role-map entry to `.agents/universal-plugin.json` under `sdd-plugins[]`. Once registered, the SDD conductor resolves the Quill production-chain roles — `quill-spec-writer` (spec-producer), `quill-doc-writer` (impl-producer), `quill-judge` (impl-judge) — by reading only that one file at runtime (no plugin-directory scanning). The `solution-producer` and `spec-judge` roles degenerate to their SDD defaults: the conductor runs `solution-producer-governance` inline for solution-producer, and `spec-judge: null` degenerates to the static doc criteria `spec-gate` runs itself — no judge agent.

Idempotent: re-running rewrites an old-shape or version-stale entry in place (rewrite-on-init migration). Spec creation itself is owned by the `sdd` plugin's `start-mission` / `spec-gate`; this skill only wires the registry.
