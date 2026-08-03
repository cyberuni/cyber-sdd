# sdd-roles/ — the ACED SDD production-chain delegates

ACED as the SDD plugin for agent-config domains: the delegate roles it implements against
`sdd:plugin-contract-governance` — `scenario-writer` (spec-producer), `spec-validator` (spec-judge),
`impl-judge` (impl-judge) — plus `judge`, the internal per-case scoring helper those roles (and
`run`/`compare`) invoke rather than a plugin-contract role itself, and `extract-situation`, the
deterministic engine `judge` invokes to compose a simulating context's brief without handing it the
answer key. Each is judged by its own suite.

Beside the roles sits [`actor-bars/`](./actor-bars/README.md), a **reference** node covering the
governances ACED ships and binds into its squad's `governances` slots — `aced-builder-spec`,
`aced-builder-impl`, `aced-architect-impl`, and the `aced-fit` classifier. They are bars rather than
roles, and carry no suite of their own; they sit here because both faces that read them, producer
and judge, are production-chain concerns.
