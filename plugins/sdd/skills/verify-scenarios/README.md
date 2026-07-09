# verify-scenarios

The concrete engine for the SDD **scenario-bridge** — a language/runner-agnostic bridge from a
frozen `.feature` scenario to the test that proves it, so an impl-judge runs the project's own test
suite and reads a report instead of re-verifying every scenario by hand. A non-user-invocable
skill, invoked at the impl gate for deterministic artifact-types, carrying a self-contained `.mts`
script that unions one or more junit (today) result sources against the scenario key set.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/verify-scenarios.mts`](./scripts/verify-scenarios.mts)
- **Tests:** [`scripts/verify-scenarios.test.mts`](./scripts/verify-scenarios.test.mts) (`node:test`)

```bash
node scripts/verify-scenarios.mts --feature .agents/spec/identity/identity.feature --node cyberlegion/identity
node scripts/verify-scenarios.mts --feature x.feature --node proj/x --run --config .agents/sdd/scenario-bridge.toml
node scripts/verify-scenarios.mts --feature x.feature --node proj/x --report .agents/.scenario-report.xml --format json
```
