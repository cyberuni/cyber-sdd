---
spec-type: reference
concept: [glossary]
---

# glossary — ACED ubiquitous language

The agent-config eval vocabulary: artifact-type, golden set, scenario, rubric, layer, judge, threshold, regression gate.

## Subject

The ubiquitous language of agent-config evaluation — the terms every ACED capability and its specs
use with one fixed meaning. The contract surface is the set of definitions below; conformance is
verified **through the consuming capabilities** (a term is "correct" when `run` / `compare` /
`report` / the `sdd-roles` delegates use it as defined), not by a `.feature` of its own.

| Term | Meaning |
|---|---|
| **agent configuration** | A unit of agent behavior under evaluation: a skill, an AGENTS.md section, a subagent definition, or a command. The eval subject. |
| **artifact-type** | The squad key naming what kind of artifact a file is (`skill`, `subagent`, `command`, `agents-section`) — how SDD resolves the ACED production chain for it. |
| **golden set** | The curated collection of test cases that pins a configuration's intended behavior; the agent-config analog of a test suite. |
| **test case** | One scenario file in the golden set: a trigger situation, expected behaviors, a must-not-do list, and a rubric. The analog of one test. |
| **scenario** | The concrete situation a case exercises — who the user is, what they said, the state of the tree — written so an evaluator can simulate it. |
| **layer** | The dimension a case scores: **trigger** (does it fire when it should), **behavior** (does it do the right steps), or **quality** (is the output good). |
| **rubric** | The scoring criteria for a case: named dimensions, each with its own `max`, plus one `threshold`. Authored **inline** in the `.feature` on a `@rubric` scenario, and applied by the judge to score each dimension against its own max. |
| **threshold** | The total at which a case counts as passing; the per-scenario boolean collapse `total ≥ threshold`, where the total sums every dimension's score. A triggered **must-not-do** fails the case outright, whatever the total. |
| **judge** | The impartial evaluator (`aced-case-judge`). It simulates the agent in a **blind** context — shown the situation but never the case's name, `Then`, or rubric — then scores that returned simulation in a **separate** context, returning a score per named dimension plus a pass/fail verdict. |
| **regression** | A case that dropped from passing to failing, or lost points on any dimension, between two versions of a configuration. |
| **regression gate** | The rule that blocks committing a change whose comparison shows any regression. |
| **eval suite** | A configuration's `eval.md` (target, judge model, threshold, layers) plus its `golden-set/` — what `run` executes. |
| **fit** | ACED's self-assessment of whether a subject benefits from evaluation — `strong` (all four layers signal; near-misses required), `partial` (mechanical; near-miss N/A), or `wrong-squad` (deterministic; ACED recuses). Decided in explore, declared as a `**Fit:**` line, enforced at the gate (`design/fit.md`). |
