# ACED — Agent Config Evaluation & Development

ACED is an SDD plugin specialized in **agent configuration** — the skills, `AGENTS.md` sections, subagent definitions, and commands that shape how AI agents behave.

It applies spec-driven development to the agent configuration layer: build a golden-set eval suite, score agent behavior against it, catch regressions before they ship, and improve configurations until they pass.

## What it does

Agent configuration has the same failure modes as prompts: silent regressions, trigger mismatch, ambiguous rules, coverage gaps. Unlike code, there is no type-checker, linter, or test runner for it. ACED fills that gap.

Evaluation runs in layers:

| Layer | What it checks |
|---|---|
| **Structural** | Required fields and format (via `cyber-skills audit`) |
| **Trigger** | Does the agent invoke this configuration at the right times? |
| **Behavior** | When invoked, does the agent follow the steps and rules? |
| **Quality** | Is the output actually good? |

## When ACED fits (and when it doesn't)

Not every agent configuration benefits from ACED. **Fit** = which of the four layers above carry
real signal. ACED classifies each subject **in explore** (before authoring an eval suite) and
records a `**Fit:**` line in its spec:

| Fit | The subject… | ACED does |
|---|---|---|
| **strong** | makes a genuine activation decision + non-deterministic judgment | full eval — trigger near-misses required |
| **partial** | mechanically executes a predetermined path (graded behavior, no activation choice) | behavior/quality evals; **no trigger near-miss** required |
| **wrong-squad** | is a deterministic script/engine (assertable output, not graded) | **recuses** — use an ordinary test harness (`node:test`), not ACED |

Only the **Structural** layer signal on a subject means it is **wrong-squad** — `cyber-skills audit`
already covers that. The classifier lives in `skills/aced-fit/` (model: the spec's `design/fit.md`).

## Skills

| Skill | When to use |
|---|---|
| `init-aced` | Register ACED as the SDD plugin for agent-configuration domain types |
| `add-scenario` | Add a new test case from a real failure or edge case |
| `run` | Score the golden set against the current agent configuration |
| `compare` | Diff scores before/after an edit — regression gate |
| `improve` | Diagnose failing cases and propose targeted edits |
| `report` | Project-wide health dashboard across all eval suites |

Spec creation is owned by the `sdd` plugin's `start-mission` / `spec-gate`: once ACED is registered, the conductor resolves the ACED production-chain roles automatically. The `run`/`compare`/`add-scenario`/`report` skills are thin reporting over the impl-judge's eval suite.

## Agents (production-chain roles)

| Agent | Role |
|---|---|
| `aced-scenario-writer` | spec-producer — writes the spec.md body and a boolean `.feature` (trigger near-misses + behavior cases) |
| `aced-spec-validator` | spec-judge — judges the `.feature` against the agent-scenario criteria |
| `aced-impl-judge` | impl-judge — **runs** the scenario→rubric eval suite (authored by the impl-producer) over N runs, collapses to a boolean per scenario |
| `aced-case-judge` | internal scorer for `aced-impl-judge` — scores one scenario on a 1–5 rubric |

The impl-producer (writing the agent config **and its scenario→rubric eval suite**) is the `define-agent` / `improve` skills or the SDD-default impl-producer (the conductor running `impl-producer-governance` via a spawned builder); ACED does not bind a solution-producer (SDD default).

## Workflow

```
sdd:start-mission → sdd:spec-gate (spec gate) → implement → run/compare → improve
                                                                   ↑
                                                             add (new cases)
                                                                   ↑
                                                             report (project-wide)
```

1. **`sdd:start-mission`** — the conductor resolves `aced-scenario-writer` to write the `.feature`; `aced-spec-validator` judges it at the spec gate.
2. **implement** — the impl-producer (`define-agent` / `improve`) authors the scenario→rubric eval suite alongside the agent config; `aced-impl-judge` (impl-judge) **runs** it, scoring each scenario via `aced-case-judge` and writing results to `artifacts/specs/<suite>/results/`.
3. **`compare`** — before committing an edit, diff the before/after scores. Warns on regressions.
4. **`improve`** — reads failing cases, groups by failure pattern, proposes before/after diffs to the agent configuration. Automatically runs `compare` after edits.
5. **`add-scenario`** — adds test cases from production failures, edge cases, or gaps. Writes to the golden set.
6. **`report`** — scans all eval suites and prints a health dashboard (healthy / degraded / critical / trending-down).

## Eval suite structure

```
artifacts/specs/<suite-name>/
  eval.md               # target path, judge model, threshold, enabled layers
  golden-set/
    001-<slug>.md       # trigger / behavior / quality test cases
    002-<slug>.md
    ...
  results/
    <ISO8601>.json      # run output: scores, pass rates, per-case results
```

## Installation

```bash
npx skills add cyberuni/cyber-skills --plugin aced
```

## Relationship to SDD

ACED is itself built with SDD: specs live in `artifacts/specs/aced-<skill>/`. It uses the same `spec.md` + `.feature` format as the `sdd` plugin and the same `artifacts/specs/` layout for eval suites.
