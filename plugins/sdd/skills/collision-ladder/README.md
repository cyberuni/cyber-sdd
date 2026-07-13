# collision-ladder

The concrete engine for **collision-ladder** — a read-only, pairwise collision classifier that, at a
**known** node-level collision between two Missions, descends the finer-than-node ladder (file →
region → semantic) to classify the clash **hard** (must serialize) or **soft** (can run in parallel),
plus the shared-thin-file **hard→soft downgrade** + smell flag. It reuses the sibling
[`touch-set-correction`](../touch-set-correction/SKILL.md) composition (`resolve-governances` +
`gherkin-cli diff`) and adds a `git diff -U0` region source. Built for the Op2 second-bullet of the
cyberfleet-batch change request; see
[`.agents/specs/sdd/collision-ladder/README.md`](../../../../.agents/specs/sdd/collision-ladder/README.md)
for the authoritative behavior description and
[`collision-ladder.feature`](../../../../.agents/specs/sdd/collision-ladder/collision-ladder.feature)
for the frozen 18-scenario contract.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/collision-ladder.mts`](./scripts/collision-ladder.mts)
- **Tests:** [`scripts/collision-ladder.test.mts`](./scripts/collision-ladder.test.mts)
  (`node:test`) — one test per frozen scenario, titled `scenario: <verbatim frozen scenario name>`.
