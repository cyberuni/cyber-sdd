---
name: verify-scenarios
description: "Partial Skill: invoke by name only — the Gherkin-scenario-to-test-report bridge verifier — invoked by the impl-judge at the impl gate, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Verify Scenarios

The concrete engine for the SDD **scenario-bridge** — a language/runner-agnostic bridge from a
frozen `.feature` scenario to the test that proves it, so the impl-judge runs the project's own
test suite and reads a report instead of re-verifying every scenario by hand. Deterministic
test-running is the SDD **default** verification path (not a plugin specialty — an unmatched
artifact-type already falls through to SDD defaults).

## Binding convention

- **Key = the scenario's `@id:<slug>` tag if present, else its verbatim name.** No synthetic ID
  registry — node-path + name is globally unique in the repo.
- **A test declares its node** with a `describe('spec:<node>', …)` wrapper (or the equivalent in a
  non-JS runner) around its cases. The node segment is found at **any depth** in the test-report's
  `" > "`-joined name, so nesting the wrapper deeper never breaks the bind.
- **A test's leaf title is the exact scenario name**, pasted verbatim from the frozen `.feature` —
  or `@id:<slug>` when the scenario carries that tag.
- **A Scenario Outline is ONE key** (its outline name). Give an `it.each`/table-driven leaf a
  **static** title equal to the outline name (no per-row interpolation) — every row folds into the
  same key; a failing row fails the whole key.
- **Many-to-one is fine.** Two tests can bind the same key; the fold is PASS only if none of them
  fail. A test that maps to an already-covered key and isn't the canonical rename shows up as an
  EXTRA (diagnostic, not a failure) — leave it.

## Config schema

`.agents/sdd/scenario-bridge.toml`, resolved beneath `--root` (**not** a single repo-root path — see
"Monorepo rooting" below) — an array-of-tables of result **sources** (a `.feature` is not assumed to
map to one runner: vitest + playwright + pytest can all contribute to one node):

```toml
[[source]]
adapter    = "junit"
command    = "pnpm build && vitest run src --reporter=junit --outputFile=.agents/.scenario-report.xml"
reportPath = ".agents/.scenario-report.xml"
```

- `adapter` — `junit` today; `tap`/`aced` are a `switch` case away, same interface.
- `command` — optional; run only with `--run` (omit to just read an already-produced report).
- `reportPath` — resolved relative to `--root`.

Add `.agents/.scenario-report.xml` (or wherever `reportPath` points) to the project's `.gitignore`.

## JUnit adapter mechanics

Hand-rolled regex parse, no xml dependency — verified against vitest 4.1.7's JUnit reporter:

- One `<testsuite>` per test file; `classname` = file path; `name` = describe-chain joined by
  `" > "` + leaf title.
- `classname`/`name` are extracted **by attribute name**, not position, and both **unescaped**
  (`&amp; &quot; &apos; &lt; &gt;`) — an unescaped apostrophe silently drops a scenario like
  `whoami prints this session's own identity`.
- Outcome: a child `<failure` -> fail; a child `<skipped` -> skip; otherwise pass.
- The `name` is split on `" > "`; the **node** is the capture of whichever segment matches
  `/^spec:(.+)$/` (any depth); a testcase with no such segment is dropped — it is not bound to any
  node. The **leaf** is the last segment; the **key** is its `@id:<slug>` capture if it matches,
  else the leaf verbatim.

## Run

```bash
node "<skill>/scripts/verify-scenarios.mts" \
  --feature <path/to/x.feature> --node <project>/<node> \
  [--config .agents/sdd/scenario-bridge.toml] [--root .] [--feature-root <dir>] \
  [--report <xml>] [--run] [--format toon|json]
```

- `--report <xml>` bypasses `--config` entirely — a single ad-hoc junit source, no command.
- `--run` executes each source's `command` first; without it, existing reports are read as-is.
- Default output is a readable per-scenario table + a `N/M BOUND, P pass, F fail, U unbound`
  summary line + any EXTRA keys. `--format json` emits
  `{node,total,bound,pass,fail,unbound,scenarios[],extras[]}`. `--format toon` emits the repo's
  TOON tabular form.
- Exit code is non-zero when any scenario is UNBOUND or FAIL; zero only at full BOUND+PASS.

## Monorepo rooting — `--feature-root` vs. `--root`

`--root` is the **bridge/report root** — where `--config` defaults to, and where every source's
`reportPath` and an ad-hoc `--report` resolve. `--feature-root` is where `--feature` resolves; it
**defaults to `--root`** when omitted, so a colocated project (spec, config, and report all under one
root) needs only `--root` — unchanged from before this option existed. Pass `--feature-root`
separately when the frozen `.feature` lives at a **different** root than the project's config +
report — the common monorepo shape, where specs sit at a repo-root spec corpus
(`.agents/specs/<project>/`) but the project's own `.agents/sdd/scenario-bridge.toml` and test report
sit under its `project-path` (e.g. `packages/<project>/`):

```bash
node "<skill>/scripts/verify-scenarios.mts" \
  --feature .agents/specs/cyberlegion-plugin/identity/identity.feature \
  --node cyberlegion-plugin/identity \
  --feature-root . \
  --root packages/cyberlegion
```

## Boundaries

Read-only over the `.feature` and test reports; writes nothing. Consumes `gherkin-cli` (via `npx
gherkin-cli@0.0.1 parse <feature> --format json`) for the scenario set — never re-implements a
Gherkin parser. Does not reorganize `.feature` files by runner and does not wire itself into the
impl-judge (a separate CR grows the default `sdd-impl-judge` to call this for deterministic
artifact-types, run through SDD's own spec gate).
