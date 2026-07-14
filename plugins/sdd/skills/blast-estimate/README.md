# blast-estimate

The concrete engine for **blast-estimate** — a read-only estimate of how much of the project a
Mission could disturb, computed from its touch-set and the project corpus instead of the hand-typed
guess: `count` (how many work areas), `centrality` (dependency fan-in — how many other work areas
reference a touched one), and `sensitivity` (declared, never inferred, in the opt-in
`.agents/sdd/sensitive-paths.toml`). Lines the computed level up against the Mission's declared blast
(`agrees` / `under-called` / `over-called`).

```bash
node scripts/blast-estimate.mts --root <corpus> --touch-set sdd/mission-graph,sdd/blast-estimate --declared medium
```

Read-only, deterministic, reports-never-writes — the mission-graph's single writer records the
computed level. See [`SKILL.md`](./SKILL.md) for the full contract and
[`.agents/specs/sdd/blast-estimate/README.md`](../../../../.agents/specs/sdd/blast-estimate/README.md)
for the authoritative behavior description and
[`blast-estimate.feature`](../../../../.agents/specs/sdd/blast-estimate/blast-estimate.feature) for
the frozen 21-scenario contract.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/blast-estimate.mts`](./scripts/blast-estimate.mts)
- **Tests:** [`scripts/blast-estimate.test.mts`](./scripts/blast-estimate.test.mts) (`node:test`) —
  one test per frozen scenario, titled `scenario: <verbatim frozen scenario name>`.
