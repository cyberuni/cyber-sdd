---
name: manage-scenario-bridge
description: "Partial Skill: invoke by name only — the curation engine for a project's scenario-bridge.toml — loaded by the manage gateway (Setup & discovery), not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Manage Scenario Bridge

The concrete engine for `<project-path>/.agents/sdd/scenario-bridge.toml` — the one-time
per-project wiring the [`verify-scenarios`](../verify-scenarios/) bridge and the `sdd-impl-judge`
step-0 consumption both read. It is the **write** side of that config (`verify-scenarios` is the
read side). It exists so a user wires a project's scenario bridge through a clean interface instead
of hand-authoring the TOML. Loaded **in-session** by the `manage` gateway (Setup & discovery group);
it carries a self-contained `.mts` script (the repo's node-≥23.6 / no-deps convention).

## The file it curates

`<project-path>/.agents/sdd/scenario-bridge.toml` is an array-of-tables of result **sources**,
mirroring `verify-scenarios`' own config shape — never diverge the format:

```toml
[[source]]
adapter    = "junit"
command    = "pnpm build && vitest run src --reporter=junit --outputFile=.agents/.scenario-report.xml"
reportPath = ".agents/.scenario-report.xml"
```

A colocated project's `project-path` is its own repo root, so the config lands at the familiar
`.agents/sdd/scenario-bridge.toml` — no behavior change for a single-project repo. A monorepo
member's config sits at `<project-path>/.agents/sdd/scenario-bridge.toml`, beside the code and
reports it covers.

## Run an operation

```bash
node "<skill>/scripts/manage-scenario-bridge.mts" --project-path <dir> <operation>
```

| Operation | Effect |
|---|---|
| `--list` | print every configured `[[source]]` block in order; a missing file lists nothing, no error |
| `--scaffold --adapter <a> [--command <c>] --report-path <p>` | create the config under the project's `project-path` with one source block; refused when the file already exists |
| `--add --adapter <a> [--command <c>] --report-path <p>` | append a source block to an existing config; refused when the file does not exist (names `--scaffold` as the entry point) |

A `--scaffold` or `--add` missing `--adapter` or `--report-path` is refused — no source block is
written.

## Boundaries

Writes **only** `<project-path>/.agents/sdd/scenario-bridge.toml` — never a `spec.md`, `status`,
`approval`, or a freeze; it is operational config, not spec content (so `manage`'s write-ownership
guard holds). It does not author the binding tests a source reports on (the impl-producer does,
`sdd:impl-producer-governance`), and does not run the bridge or judge anything (`verify-scenarios`
and the impl-judge do).

When `node` is absent, an agent performs the same edits by hand: read the file, apply the
list/scaffold/add, and refuse a scaffold over an existing file or a request missing a required
field.
