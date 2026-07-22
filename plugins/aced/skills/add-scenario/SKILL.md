---
name: add-scenario
description: Use this skill when adding a new scenario to an ACED .feature suite — from a real failure, a production edge case, or a gap the user noticed.
---

# ACED Add Scenario

Add one or more scenarios to an existing frozen `.feature` suite. Adding a scenario is **additive** —
it widens the contract and cannot break existing impl, so it **self-clears** and the `.feature` stays
`@frozen` (per `sdd:suite-format-governance`); no re-open is needed.

## Locate the suite

Find the target's node in the project spec — `.agents/specs/<project>/…/<node>/` (discovered through
the SDD spec tree; the node's `eval.md` names the subject) — from user context or ask. Read the
node's colocated `eval.md` for the `subject` and the `eval:` run policy (`eval.judge.default_threshold`).

## Gather input

The user may provide:
- A description of a scenario that failed in production
- A pasted agent transcript showing incorrect behavior
- A description of an edge case not yet covered
- A "must not do" behavior they want to guard against

If a transcript is provided, extract: what the user said, what state the system was in, what the agent did, what it should have done instead.

## Determine the layer

| Input type | Layer |
|---|---|
| "Agent invoked the skill when it shouldn't have" | trigger |
| "Agent didn't invoke the skill when it should have" | trigger |
| "Agent invoked correctly but skipped a step" | behavior |
| "Agent did the step but produced poor output" | quality |

Ask if unclear.

If the resolved layer is not enabled in the suite's `eval.md` `eval.layers`, warn that the layer is not enabled and the scenario will not be exercised until it is.

## Scaffold the scenario

Draft a Gherkin scenario for the frozen `.feature`, tagged with its layer:

- **trigger** → add a row to the `@trigger` `Scenario Outline`'s `Examples` table
  (`| <query> | <should_trigger> |`), or start one if the suite has none.
- **behavior (deterministic)** → a boolean scenario whose `Then` asserts the observable action (a
  must-not-do guard is a `Then` asserting the agent *does not* do the prohibited action).
- **behavior / quality (graded)** → a `@rubric` scenario with the rubric **inline**:

```gherkin
@behavior @rubric
Scenario: <name — the situation being guarded>
  Given <concrete situation: user message, repo/file state, context>
  When <the agent acts>
  Then the judge evaluates the scenario against the rubric
    """
    dimensions:
      - name: <criterion>
        max: <n>
    threshold: <from eval.judge.default_threshold>
    """
  And the rubric score is at least the threshold
```

Show the draft to the user and ask for confirmation before writing. Adjust based on feedback.

## Write the scenario

Append the scenario to the node's frozen `<node>.feature` in the project spec, sorted into its
lifecycle-stage section (per the scenario-ordering convention). Keep the feature-level `@frozen` tag —
adding a scenario self-clears. Run `check-suite --files <path>` to confirm the suite is still
well-formed.

Report the scenario name and suggest running `run` to score it against the current agent configuration.
