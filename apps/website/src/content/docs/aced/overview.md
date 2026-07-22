---
title: ACED Overview
description: Agent Config Evaluation & Development — spec-driven evaluation for skills, AGENTS.md sections, subagent definitions, and commands.
---

**ACED** (Agent Config Evaluation & Development) is a plugin that applies spec-driven evaluation to [agent configuration](/concepts/agent-configuration/) — the skills, `AGENTS.md` sections, subagent definitions, and commands that shape how AI agents behave.

## The problem

Agent configuration has the same failure modes as prompts, but none of the safety nets:

- **Silent regression** — editing a skill's `description:` changes when the agent invokes it, with no signal that something broke.
- **Trigger mismatch** — vague trigger language causes the agent to fire too broadly or too narrowly.
- **Ambiguous rules** — inconsistent behavior that only surfaces in real sessions, after the damage is done.

Code has a type-checker, a linter, and a test suite. Agent configuration has none of those built in. ACED fills that gap.

## How it works

ACED applies [spec-driven development](/sdd/overview/) to the agent configuration layer:

1. Register ACED with [`init-aced`](/aced/init-aced/), then author or improve the artifact itself with [`define-skill`](/aced/define-skill/), [`define-agent`](/aced/define-agent/), or [`define-governance`](/aced/define-governance/).
2. Build a **golden set** — the scenarios in the artifact's frozen `.feature` — via `sdd:start-mission`. The SDD conductor resolves ACED's spec-producer (`aced-scenario-writer`) to author the `.feature` (boolean scenarios, inline `@rubric` scenarios, and a `@trigger` `Scenario Outline`) and the impl-producer to author the node's `eval.md` run policy.
3. **Score** the current artifact against each scenario using an LLM judge — a `@rubric` scenario scores per named dimension against that dimension's own `max`, passing when the total meets the threshold — via [`run`](/aced/run/).
4. **Compare** scores before and after an edit with [`compare`](/aced/compare/) — block commits on regression.
5. **Improve** the artifact by diagnosing failing cases and applying targeted edits with [`improve`](/aced/improve/).

### Evaluation layers

Evaluation runs in four independent layers:

| Layer | What it checks |
|---|---|
| **Structural** | Required fields and format (via `cyberplace audit`) |
| **Trigger** | Does the agent invoke this artifact at the right times? |
| **Behavior** | When invoked, does the agent follow the steps and rules? |
| **Quality** | Is the output the agent produces actually good? |

Each eval suite opts in to the layers relevant to its artifact type. A simple `AGENTS.md` section may skip trigger evaluation; a skill always needs trigger and behavior.

## Skills

| Skill | What it does |
|---|---|
| [`init-aced`](/aced/init-aced/) | Register ACED as the SDD plugin for agent-configuration domains |
| [`define-skill`](/aced/define-skill/) | Create or improve a workflow skill (`SKILL.md`) |
| [`define-agent`](/aced/define-agent/) | Create or improve an agent definition (subagent, persona, or dual-mode) |
| [`define-governance`](/aced/define-governance/) | Create or improve a reference-only governance file |
| [`run`](/aced/run/) | Score the golden set against the current artifact |
| [`add-scenario`](/aced/add-scenario/) | Add a test case from a real failure or edge case |
| [`compare`](/aced/compare/) | Diff scores before/after an edit — regression gate |
| [`improve`](/aced/improve/) | Diagnose failing cases; propose and apply targeted edits |
| [`report`](/aced/report/) | Project-wide health dashboard across all eval suites |

## Typical workflow

```
init-aced (once)
     ↓
define-skill / define-agent / define-governance → sdd:start-mission (spec + eval suite)
                                                          ↓
                                                         run → compare → improve → run
                                                          ↑                  ↑
                                                    add (new cases)   report (project view)
```

Run `init-aced` once per project to register the plugin. Author or improve the artifact with `define-skill`, `define-agent`, or `define-governance`, then use `sdd:start-mission` to author its `.feature` and eval suite. Run `run` to get a baseline. Edit the artifact, then use `compare` before committing. When cases fail, `improve` diagnoses the pattern and proposes edits.

## Eval suite structure

An artifact's eval lives entirely in its project-spec node. The frozen `.feature` is the single eval source; `eval.md` carries only the subject binding and run policy.

```
.agents/specs/<project>/…/<node>/
  README.md             # what the node specifies
  <node>.feature        # the golden set: boolean, @rubric (inline), and @trigger scenarios
  eval.md               # subject + run policy: layers, judge model, default threshold, trigger policy
```

Run output is written to the shared, git-ignored ACED results directory at the repo root, keyed by the target:

```
.agents/aced/results/<target-slug>/
  <ISO8601>.json        # per-scenario dimension scores, totals, thresholds, pass/fail
```

The node lives in the SDD spec tree. Each suite has its own pass threshold — different artifacts warrant different bars.

## Health classification

`report` classifies each suite:

| Status | Condition |
|---|---|
| `healthy` | Pass rate ≥ 90% |
| `degraded` | Pass rate 70–89% |
| `critical` | Pass rate < 70% |
| `trending-down` | Pass rate dropped ≥ 10% vs. previous run |
| `no-data` | No results yet |

## Installation

```bash
npx skills add cyberuni/cyberplace --plugin aced
```

## Related

- [Agent Configuration](/concepts/agent-configuration/) — what agent configuration is and why it needs evaluation
- [SDD Plugin](/sdd/overview/) — spec-driven development; ACED is SDD applied to the agent configuration layer
- [Skill Design governance](/governances/skill-design/) — authoring rules for `SKILL.md` files
