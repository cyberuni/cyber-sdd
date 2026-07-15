# sdd-roles/ — the ACED SDD production-chain delegates

ACED as the SDD plugin for agent-config domains: the delegate roles it implements against
`sdd:plugin-contract-governance` — `scenario-writer` (spec-producer), `spec-validator` (spec-judge),
`impl-judge` (impl-judge) — plus `judge`, the internal per-case scoring helper those roles (and
`run`/`compare`) invoke rather than a plugin-contract role itself, and `extract-situation`, the
deterministic engine `judge` invokes to compose a simulating context's brief without handing it the
answer key. Each is judged by its own suite.
