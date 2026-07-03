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
| **rubric** | The scoring criteria for a case, applied by the judge to assign a 1–5 score; it is evaluation detail and never appears in a `.feature`. |
| **threshold** | The minimum score at which a case counts as passing; the per-scenario boolean collapse `score ≥ threshold`. |
| **judge** | The impartial evaluator (`aced-case-judge`) that simulates the agent against a case and returns a score plus a pass/fail verdict. |
| **regression** | A case that dropped from passing to failing, or to a lower score, between two versions of a configuration. |
| **regression gate** | The rule that blocks committing a change whose comparison shows any regression. |
| **eval suite** | A configuration's `eval.md` (target, judge model, threshold, layers) plus its `golden-set/` — what `run` executes. |
| **fit** | ACED's self-assessment of whether a subject benefits from evaluation — `strong` (all four layers signal; near-misses required), `partial` (mechanical; near-miss N/A), or `wrong-squad` (deterministic; ACED recuses). Decided in explore, declared as a `**Fit:**` line, enforced at the gate (`design/fit.md`). |
