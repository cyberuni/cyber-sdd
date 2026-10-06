# touch-set-correction

The concrete engine for **touch-set-correction** — a read-only, post-hoc reconciliation of a
Mission's declared touch-set against what its `git diff` actually changed, composing `git diff`,
[`resolve-governances`](../resolve-governances/SKILL.md), and `gherkin-cli diff` into the corrected
touch-set the mission-graph's single writer records at retirement. Built for the Op2 deferral of the
cyberfleet-batch change request; the `touch-set-correction` node of the SDD project spec (in the
cyberplace repository, not shipped in this package) carries the authoritative behavior description
and the frozen 21-scenario contract.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/touch-set-correction.mts`](./scripts/touch-set-correction.mts)
- **Tests:** [`scripts/touch-set-correction.test.mts`](./scripts/touch-set-correction.test.mts)
  (`node:test`) — one test per frozen scenario, titled `scenario: <verbatim frozen scenario name>`.
  [`scripts/touch-set-correction-installed.test.mts`](./scripts/touch-set-correction-installed.test.mts)
  runs the engine from a copy of the plugin's files, with no `node_modules`.

The engine imports gherkin-cli from the spec gate's committed bundle
(`../spec-gate/vendor/gherkin-cli.mjs`), so it runs from an installed plugin.
