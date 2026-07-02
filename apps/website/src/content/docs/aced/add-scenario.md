---
title: add-scenario
description: Add a new test case to an ACED golden set from a real failure, edge case, or gap.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Trigger:** adding a new test case to an ACED golden set — from a real failure, a production edge case, or a gap the user noticed

Adds one or more test cases to an existing golden set.

## What it does

1. Locates `artifacts/specs/<feature-name>/` and reads `eval.md` for threshold and target.
2. Gathers input — a failure description, a pasted transcript, an edge case, or a "must not do" behavior — and extracts what the user said, the system state, what the agent did, and what it should have done.
3. Determines the layer (trigger / behavior / quality) from the input type; asks if unclear, and warns if the resolved layer isn't enabled in the suite's `eval.md`.
4. Drafts the test case (scenario, expected behaviors, must-not list, 1–5 rubric) and shows it to the user for confirmation before writing.
5. Writes the file as the next sequential `NNN-<slug>.md` in `golden-set/`.

## Next step

Run [`run`](/aced/run/) to score the new case against the current agent configuration.
