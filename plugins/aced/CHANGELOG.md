# cyber-aced

## 0.5.1

### Patch Changes

- 60bcb1d: Include `CHANGELOG.md` in the published package.

## 0.5.0

### Minor Changes

- d3fd9fe: Ship ACED's authoring standards as references.
  
  - `skill-design`, `skill-repo-structure`, `agent-tool-output`, and `cli-resolution` move from `governances/` to `references/`, where the `reference` skill of `cyber-agentkit` serves them to any skill by name. The package no longer ships a `governances/` folder.
  - `define-skill` and `improve-skill` load `skill-design` and `agent-tool-output` with the `reference` skill instead of reading paths by hand. A project override now lives at `.agents/references/<name>.md`, not `.agents/governances/<name>.md`.
  - Each skill's own copy moves to `references/<name>.default.md`, the layout the `reference` skill reads as a skill's default.

### Patch Changes

- 31d32fb: `improve-skill` Q3 and Q18 now treat only by-name skills as partial: `user-invocable: false` together with `disable-model-invocation: true` or a `By name only` / `Partial Skill:` description. A hidden skill with a trigger description is model-invoked and no longer warns.
- 2133aa5: `improve-skill` S7 no longer warns on a skill-local `agents/` directory that holds host-interface YAML such as `agents/openai.yaml`, which OpenAI's skill layout documents. Any other entry in `agents/`, such as a subagent definition or a subdirectory, still warns.

## 0.4.3

### Patch Changes

- c7b172d: chore(aced): move from `@cyberuni/agent-harness` to `cyber-agentkit` 1.0.0
- fab0f33: fix(aced): run the skill engines when installed under `node_modules`
  
  Node refuses to strip types from a file under `node_modules`, so every `node <skill>/scripts/<engine>.mts` command failed when the skills came from npm or a pnpm skill link. The engines' sources now live in `src/`, and `universal-plugin plugin build` compiles each one into a self-contained `skills/<skill>/scripts/<engine>.mjs`, which the skills run on every channel. Tests and sources no longer ship inside the skill folders. The canonical manifest moved from `.plugin/plugin.json` to `plugin.json`, and the build now also derives Copilot CLI's `com.github.copilot/agents/`.

## 0.4.2

### Patch Changes

- f017f7c: Resolve the contradictions a prompt audit found in the shipped skills. Eval results are read from the shared `.agents/aced/results/<target-slug>/` directory everywhere, lowering a per-scenario threshold goes through the spec gate, name-only skills carry exactly `By name only` (the `improve-skill` Q3 check accepts it). `init-aced` registers `architect-impl`, the judge model defaults to the session's current model, the `cyberplace` version is resolved instead of pinned, and issue and ADR references are gone from the skill bodies.
- a35b43d: Align the impl-judge with the plugin contract (it now also loads `gate-validation-governance`), resolve `sdd:automaton` to `sdd:sdd-automaton`, use one `cyberlegion@<version>` form, name the `gherkin-cli` pin once, and drop history asides and repo-only references from agent and skill bodies.

## 0.4.1

### Patch Changes

- 0c45202: `define-skill` and `improve-skill` now agree on how a skill description is written: say what the skill does, then when it applies, with no fixed lead-in such as "Use this skill when", and stay within 1024 characters.
  
  - The `skill-design` governance drops the rule that a description must contain "Use this skill when" or "When to use" and the 120-character cap.
  - Both skills read `skill-design` and `agent-tool-output` from a copy committed in the skill (after a `.agents/governances/` override) instead of the stale `cyberplace@0.2.4` CLI.
  - `define-skill`'s audit step runs `improve-skill`'s bundled validator in place of `cyberplace audit validate`, a command that never existed.
  - `improve-skill`'s Q1 accepts a capability-first description with a "Use when" clause, warns on a fixed lead-in, and exempts "By name only".

## 0.4.0

### Minor Changes

- 97b02d2: `check-freshness` now reads measured records. Run `check-freshness --suite <suite> --arm <label>` to find the newest record the bench engine wrote for that arm under `.agents/aced/results/bench/<suite>/` and compare its `evaluated` set with the working tree. A changed `tasks.json`, a changed or removed check, or a changed `file` arm source reads `stale`; a record with nothing to compare reads `absent`. It exits zero only for `current`.

### Patch Changes

- f15619c: `improve-skill`'s validate engine no longer flags a description of exactly `"By name only"` as too short. That description marks a by-name skill on its own (ADR-0031), so a visible by-name skill such as `bench` passes Q2 without padding its description or hiding the command.
- a0f6c39: `improve-skill`'s validate engine no longer crashes with `EISDIR` when a skill's `scripts/` holds a subfolder such as `scripts/vendor/`. It walks the subfolders, so the Q11 and E9 script checks also cover nested scripts.

## 0.3.0

### Minor Changes

- a6e6233: Add the measured layer's engine and its `aced-bench` bin. `plan` prices a run of a suite's tasks without spending; `run --consent` runs them for real in throwaway git worktrees through a headless Claude Code; `compare` tells a real change from noise with permutation tests and a regression verdict. An arm can be a git ref, a package version, or one swapped file. Suites live under `.agents/aced/bench/<suite>/`, records under `.agents/aced/results/bench/<suite>/`.
- 0bdbbd1: Add the `bench` skill: measures a change with the `aced-bench` engine. It checks a measured run fits the question, shows the plan and its price, runs only on an explicit yes to that plan (never with no person present), and reports the verdict without calling an unclear result safe or a price change a regression.
- bdb3c8b: Publish `cyber-aced` to npm so the `aced-bench` bin reaches consumers: a CI job or tool can run `npx aced-bench` without the ACED plugin installed. The bin ships compiled to `dist/aced-bench.js`, because Node does not strip types from files under `node_modules`. `aced-bench help` (or `--help`, `-h`) prints the usage and exits 0.

### Patch Changes

- f4101cb: `aced-fit` gains a second axis, `measured: worth | not-worth`, for the coming measured layer: whether real headless runs answer a question simulation cannot. It is declared under `bench:` in `eval.md` and is opt-in, so an `eval.md` with no `bench:` key is not-worth and no existing subject changes classification.
