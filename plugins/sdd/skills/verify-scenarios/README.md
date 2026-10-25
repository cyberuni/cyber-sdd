# verify-scenarios

The concrete engine for the SDD **scenario-bridge** — a language/runner-agnostic bridge from a
frozen `.feature` scenario to the test that proves it, so an impl-judge runs the project's own test
suite and reads a report instead of re-verifying every scenario by hand. A non-user-invocable
skill, invoked at the impl gate for deterministic artifact-types, carrying a self-contained `.mjs`
script that unions one or more junit (today) result sources against the scenario key set.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/verify-scenarios.mjs`](./scripts/verify-scenarios.mjs)
- **Tests:** [`src/verify-scenarios/verify-scenarios.test.mts`](../../src/verify-scenarios/verify-scenarios.test.mts) (`node:test`);
  [`src/verify-scenarios/verify-scenarios-installed.test.mts`](../../src/verify-scenarios/verify-scenarios-installed.test.mts)
  runs the engine from a copy of the plugin's files, with no `node_modules`

The build inlines gherkin-cli into the compiled script from the committed bundle
`src/vendor/gherkin-cli.mjs`, so it runs from an installed plugin.

```bash
node scripts/verify-scenarios.mjs --feature .agents/spec/identity/identity.feature --node cyberlegion/identity
node scripts/verify-scenarios.mjs --feature x.feature --node proj/x --run --config .agents/sdd/scenario-bridge.toml
node scripts/verify-scenarios.mjs --feature x.feature --node proj/x --report .agents/.scenario-report.xml --format json
```
