---
spec-type: behavioral
concept: delivery
---

# verify-scenarios — the Gherkin-scenario → test-report bridge

The **verify-scenarios** procedure: for a frozen `.feature` and a spec-node path, report **PASS /
FAIL / UNBOUND** per scenario by reading the reports of one or more configured test-result
**sources**, so the impl-judge runs the project's own suite and reasons by hand only over the set the
run-level leash requires, instead of re-verifying every scenario. It is a **language/runner-agnostic**
bridge and the SDD **default** verification path — deterministic test-running is not a plugin
specialty; an unmatched artifact-type already falls through to SDD defaults. The concrete engine is
the [`verify-scenarios`](../../../../plugins/sdd/skills/verify-scenarios/) skill, a self-contained
`.mts` script. It is the bridge the impl gate **consumes** — the default
[`../impl-judge/`](../impl-judge/README.md) runs it for a deterministic artifact-type and judges by
hand only the UNBOUND set plus every high-blast-radius BOUND+PASS scenario, accepting a
low-blast-radius BOUND+PASS scenario on the report (wired by `sdd-impl-judge-consume-bridge`); a
domain with no bridge configured falls back to full by-hand judging.

## Use Cases

**Subject** — deriving a frozen `.feature`'s scenario set, unioning the results of the configured
sources, folding them by `(node, key)`, and reporting each scenario's state (**PASS / FAIL /
UNBOUND**) plus **EXTRA** diagnostics, with an exit status that is non-zero unless every scenario is
bound and passing.

**Non-goals** — it does **not** decide the gate verdict or judge the UNBOUND remainder (that is
[`../impl-judge/`](../impl-judge/README.md)); it does **not** author or rename tests, and does
**not** reorganize a `.feature` by runner (that would leak impl into a capability-organized spec);
it does **not** re-implement a Gherkin parser (it shells `gherkin-cli`); it owns no lifecycle state
and writes nothing. Code-coverage is **rejected** as the binding mechanism — a line running is not a
behavior verified.

Every scenario in [`verify-scenarios.feature`](./verify-scenarios.feature) maps to one of these
behaviors:

| Behavior | What it checks |
|---|---|
| **read the source set** | parse `[[source]]` blocks (`adapter` / `command` / `reportPath`) from the bridge config; drop a block missing its required fields; an absent or malformed config yields **no** sources without throwing |
| **derive the scenario keys** | the scenario set comes from `gherkin-cli`; a scenario's **key** is its `@id:<slug>` tag if present, else its **verbatim name**; a **Scenario Outline is one key** (its outline name), not one per Examples row |
| **junit adapter → results** | a testcase binds to the **node** named by its `spec:<node>` name-segment (at any depth); a testcase with no such segment binds to **no node**; the **key** is the leaf's `@id:<slug>` else the leaf verbatim; the **outcome** is fail / skip / pass from the child element; `classname` / `name` are read **by attribute name** and XML-unescaped, and a name carrying a literal `>` is not truncated |
| **union + fold** | results from **every** configured source are unioned, then folded by `(node, key)` against the scenario set: **UNBOUND** (no result), **PASS** (≥1, none fail), **FAIL** (any fail); a result bound to another node is excluded; a bound key matching no scenario is an **EXTRA**, not a failure |
| **the CLI surface** | `--report` bypasses the config for a single ad-hoc junit source; `--run` executes each source's `command` before reading its report (else the existing report is read as-is); output renders as text by default, or `json` / `toon` on request; a missing `--feature` / `--node` prints usage and exits non-zero |
| **exit status** | the tool exits **non-zero** when any scenario is UNBOUND or FAIL, and **zero** only when every scenario is bound and passing |

## Binding convention

- **Key** = the scenario's `@id:<slug>` tag if present, else its verbatim name — no synthetic-ID
  registry (node-path + name is globally unique).
- A test **declares its node** via a `describe('spec:<node>', …)` wrapper (or the runner's
  equivalent); the node segment is found at **any depth** in the report's `" > "`-joined name.
- A test's **leaf title** is the exact scenario name pasted verbatim (or `@id:<slug>`).
- A **Scenario Outline is one key** — give a table-driven leaf a **static** title equal to the
  outline name so every row folds into that key; a failing row fails the key.
- **Many-to-one is fine** — two tests binding one key fold PASS only if none fail; a test mapping to
  an already-covered key that is not the canonical rename surfaces as an **EXTRA** (diagnostic).

## Determinism and the write boundary

- **Pure derivation.** The report is a function of the frozen `.feature` and the configured reports
  alone; the parsing / adapter / fold functions are pure and independently testable.
- **Writes nothing.** The engine reads the `.feature` and the reports and emits its report to
  stdout; acting on the result (judging the UNBOUND set) belongs to the impl-judge.
- **Config** lives at `.agents/sdd/scenario-bridge.toml` (an array-of-tables of sources); a
  `.feature` is **not** assumed to map to one runner — vitest + playwright + others can each
  contribute a source, and `tap` / `aced` slot into the same adapter seam later.
