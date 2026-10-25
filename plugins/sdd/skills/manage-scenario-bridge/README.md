# manage-scenario-bridge

The concrete engine for `<project-path>/.agents/sdd/scenario-bridge.toml` — the one-time
per-project wiring the `verify-scenarios` bridge and the impl-judge step-0 consumption both read. A
non-user-invocable skill, loaded in-session by the `manage` gateway (Setup & discovery), carrying a
self-contained `.mjs` script that lists / scaffolds / adds sources so users never hand-author the
config.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/manage-scenario-bridge.mjs`](./scripts/manage-scenario-bridge.mjs)
- **Tests:** [`src/manage-scenario-bridge/manage-scenario-bridge.test.mts`](../../src/manage-scenario-bridge/manage-scenario-bridge.test.mts) (`node:test`)

```bash
node scripts/manage-scenario-bridge.mjs --project-path packages/cyberlegion --list
node scripts/manage-scenario-bridge.mjs --project-path packages/cyberlegion --scaffold \
  --adapter junit --command "vitest run --reporter=junit --outputFile=.agents/.scenario-report.xml" \
  --report-path .agents/.scenario-report.xml
node scripts/manage-scenario-bridge.mjs --project-path packages/cyberlegion --add \
  --adapter junit --report-path .agents/.other-report.xml
```
