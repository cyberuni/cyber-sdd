# touch-set-correction

The concrete engine for **touch-set-correction** — a read-only, post-hoc reconciliation of a
Mission's declared touch-set against what its `git diff` actually changed, composing `git diff`,
[`resolve-governances`](../resolve-governances/SKILL.md), and `gherkin-cli diff` into the corrected
touch-set the mission-graph's single writer records at retirement. Built for the Op2 deferral of the
cyberfleet-batch change request; see
[`.agents/specs/sdd/touch-set-correction/README.md`](../../../../.agents/specs/sdd/touch-set-correction/README.md)
for the authoritative behavior description and
[`touch-set-correction.feature`](../../../../.agents/specs/sdd/touch-set-correction/touch-set-correction.feature)
for the frozen 21-scenario contract.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/touch-set-correction.mts`](./scripts/touch-set-correction.mts)
- **Tests:** [`scripts/touch-set-correction.test.mts`](./scripts/touch-set-correction.test.mts)
  (`node:test`) — one test per frozen scenario, titled `scenario: <verbatim frozen scenario name>`.
