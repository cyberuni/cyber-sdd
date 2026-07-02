# ACED — Agent Config Evaluation & Development

ACED is an SDD plugin specialized in **agent configuration** — the skills, `AGENTS.md` sections, subagent definitions, and commands that shape how AI agents behave.

It applies spec-driven development to the agent configuration layer: author a frozen `.feature` suite (with inline `@rubric` scoring criteria), score agent behavior against it, catch regressions before they ship, and improve configurations until they pass.

## What it does

Agent configuration has the same failure modes as prompts: silent regressions, trigger mismatch, ambiguous rules, coverage gaps. Unlike code, there is no type-checker, linter, or test runner for it. ACED fills that gap.

Evaluation runs in layers:

| Layer | What it checks |
|---|---|
| **Structural** | Required fields and format (via `cyberplace audit`) |
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

Only the **Structural** layer signal on a subject means it is **wrong-squad** — `cyberplace audit`
already covers that. The classifier lives in `skills/aced-fit/` (model: the spec's `design/fit.md`).

## Skills

| Skill | When to use |
|---|---|
| `init-aced` | Register ACED as the SDD plugin for agent-configuration domain types |
| `add-scenario` | Add a new test case from a real failure or edge case |
| `run` | Score the frozen `.feature` suite against the current agent configuration |
| `compare` | Diff scores before/after an edit — regression gate |
| `improve` | Diagnose failing cases and propose targeted edits |
| `report` | Project-wide health dashboard across all eval suites |

Spec creation is owned by the `sdd` plugin's `start-mission` / `spec-gate`: once ACED is registered, the conductor resolves the ACED production-chain roles automatically. The `run`/`compare`/`add-scenario`/`report` skills are thin reporting over the frozen `.feature` suite.

## Agents (production-chain roles)

| Agent | Role |
|---|---|
| `aced-scenario-writer` | spec-producer — writes the spec.md body and the `.feature` (boolean scenarios, inline `@rubric` for graded behavior, `@trigger` `Scenario Outline` for activation) |
| `aced-spec-validator` | spec-judge — judges the `.feature` against the agent-scenario criteria (incl. `@rubric` structure) |
| `aced-impl-judge` | impl-judge — **runs** the frozen `.feature` suite (reading each scenario's inline rubric) over N runs, collapses to a boolean per scenario |
| `aced-case-judge` | internal scorer for `aced-impl-judge` — scores one scenario on its inline rubric |

The impl-producer (building the agent config to pass the frozen suite — the verification is the frozen `.feature` itself, not a separate eval suite) is the `define-agent` / `improve` skills or the SDD-default impl-producer (the conductor running `impl-producer-governance` via a spawned builder); ACED does not bind a solution-producer (SDD default).

## Workflow

```
sdd:start-mission → sdd:spec-gate (spec gate) → implement → run/compare → improve
                                                                   ↑
                                                             add (new cases)
                                                                   ↑
                                                             report (project-wide)
```

1. **`sdd:start-mission`** — the conductor resolves `aced-scenario-writer` to write the `.feature`; `aced-spec-validator` judges it at the spec gate.
2. **implement** — the impl-producer (`define-agent` / `improve`) builds the agent config to pass the frozen `.feature`; `aced-impl-judge` (impl-judge) **runs** the suite, scoring each scenario via `aced-case-judge` against its inline rubric and writing results to `artifacts/specs/<suite>/results/`.
3. **`compare`** — before committing an edit, diff the before/after scores. Warns on regressions.
4. **`improve`** — reads failing scenarios, groups by failure pattern, proposes before/after diffs to the agent configuration. Automatically runs `compare` after edits.
5. **`add-scenario`** — adds scenarios from production failures, edge cases, or gaps. Appends to the frozen `.feature` (additive — self-clears).
6. **`report`** — scans all eval suites and prints a health dashboard (healthy / degraded / critical / trending-down).

## Eval suite structure

```
artifacts/specs/<suite-name>/
  eval.md                 # measurement policy: subject + eval.{layers, judge, trigger}
  <suite-name>.feature    # the frozen suite — the single eval source
                          #   boolean scenarios, @rubric (inline rubric) for graded behavior,
                          #   @trigger Scenario Outline (Examples of query/should_trigger)
  results/
    <ISO8601>.json        # run output: scores, pass rates, per-scenario results
```

`eval.md` is the **measurement policy** — a two-level shape so future measurement kinds (benchmark, telemetry) slot in as siblings of `eval:`:

```yaml
subject: plugins/aced/skills/define-skill/SKILL.md
eval:
  layers: [trigger, behavior]
  judge:
    model: claude-sonnet-4-6
    default_threshold: 4        # fallback; per-scenario threshold is inline in @rubric
  trigger:
    activation_threshold: 0.5
    runs: 3
# future (own CRs): benchmark (model matrix over the runner family) / telemetry (per-run capture)
```

## Installation

```bash
npx skills add cyberuni/cyberplace --plugin aced
```

## Relationship to SDD

ACED is itself built with SDD: specs live in `artifacts/specs/aced-<skill>/`. It uses the same `spec.md` + `.feature` format as the `sdd` plugin and the same `artifacts/specs/` layout for eval suites.
