---
title: add-scenario
description: Add a new test case to an ACED golden set from a real failure, edge case, or gap.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Trigger:** adding a new test case to an ACED golden set — from a real failure, a production edge case, or a gap the user noticed

Adds one or more scenarios to an existing golden set. Adding a scenario is **additive** — it widens the contract and cannot break existing impl, so it self-clears and the `.feature` stays `@frozen`.

## What it does

1. Locates the target's node in the project spec — `.agents/specs/<project>/…/<node>/`, discovered through the SDD spec tree — and reads its colocated `eval.md` for the `subject` and the run policy (`eval.judge.default_threshold`).
2. Gathers input — a failure description, a pasted transcript, an edge case, or a "must not do" behavior — and extracts what the user said, the system state, what the agent did, and what it should have done.
3. Determines the layer (trigger / behavior / quality) from the input type; asks if unclear, and warns if the resolved layer isn't enabled in the suite's `eval.md`.
4. Drafts the Gherkin scenario tagged with its layer — a `@trigger` `Examples` row, a boolean `Then` scenario, or a `@rubric` scenario with the rubric (named dimensions plus a threshold) authored inline — and shows it to the user for confirmation before writing.
5. Appends the scenario to the node's frozen `<node>.feature`, sorted into its lifecycle-stage section, keeping the feature-level `@frozen` tag.

## Next step

Run [`run`](/aced/run/) to score the new case against the current agent configuration.
