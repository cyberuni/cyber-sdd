---
title: improve
description: Diagnose failing ACED eval cases and propose targeted edits to the target agent configuration.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Trigger:** ACED evals are failing and the user wants to diagnose why and get specific improvement proposals

Diagnoses failing eval cases and proposes targeted edits to the target agent configuration.

## What it does

1. Loads `artifacts/specs/<feature-name>/eval.md`, the target agent configuration, and the most recent `results/` file (runs [`run`](/aced/run/) first if none exists).
2. Collects all cases where `pass: false` and reads each failing test case.
3. Groups failures by pattern: trigger false-positive/negative, missing step, ambiguous rule, conflicting instruction, scope creep, or description mismatch.
4. Proposes a concrete before/after diff per pattern (e.g. rewrite `description:` for trigger issues, make a step more prominent for missing steps, add precedence rules for conflicts).
5. Shows all proposed edits and asks for approval before writing anything.
6. After approval, applies the edits, then automatically runs [`compare`](/aced/compare/) (previous git revision vs. current working tree) to confirm improvement without regression.

## Role as ACED impl-producer

When dispatched by the SDD conductor (with [`define-agent`](/aced/define-agent/)) against a frozen `.feature`, this skill is the impl-producer for agent-config domains — it also authors or refreshes the eval suite (`eval.md` + `golden-set/`) the impl-judge runs, since the judge never authors evals itself.

## If no clear fix exists

For inherent non-determinism (high score variance across similar cases), it recommends adding more specific examples, lowering the threshold for that layer, or splitting the agent configuration into two narrower ones — never removing test cases to force a pass.
