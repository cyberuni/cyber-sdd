# mission-graph

The concrete engine for the **mission-graph kernel** — a git-tracked, append-only work-graph store
(nodes, edges, status, tombstones, schema `v:1`) folded into a read-only `ready` frontier and a
`cycles` repair view, plus an Operation deliverability check. Built for Op1.M1 of the
**cyberfleet-batch** change request; the `mission-graph` node of the SDD project spec (in the
cyberplace repository, not shipped in this package) carries the authoritative behavior description
and the frozen 36-scenario contract.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/mission-graph.mts`](./scripts/mission-graph.mts)
- **Tests:** [`scripts/mission-graph.test.mts`](./scripts/mission-graph.test.mts) (`node:test`) —
  one test per frozen scenario, titled `scenario: <verbatim frozen scenario name>`.
