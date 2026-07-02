---
name: add-scenario
description: Use this skill when adding a new test case to an ACED golden set — from a real failure, a production edge case, or a gap the user noticed.
---

# ACED Add Scenario

Add one or more test cases to an existing golden set.

## Locate the eval suite

Find `artifacts/specs/<feature-name>/` from user context or ask. Read `eval.md` for threshold and target.

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

If the resolved layer is not enabled in the suite's `eval.md` `layers`, warn that the layer is not enabled and the case will not be exercised until it is.

## Scaffold the test case

Draft the test case using the standard format:

```markdown
---
name: <slug>
layer: <layer>
threshold: <from eval.md>
---

## Scenario

<Concrete, specific situation. Include user message, repo/file state, and any relevant context.>

## Expected behaviors

- <Observable action>

## Must NOT do

- <Prohibited action if applicable>

## Rubric

Score 1–5:
5 — <perfect>
4 — <minor miss>
3 — <partial>
2 — <significant miss>
1 — <failure>
```

Show the draft to the user and ask for confirmation before writing. Adjust based on feedback.

## Write the file

Determine the next sequence number from existing files in `artifacts/specs/<feature-name>/golden-set/`. Write the file as `NNN-<slug>.md`. If the golden set holds no numbered cases yet, start the sequence at `001-<slug>.md`.

Report the file path and suggest running `run` to score the new case against the current agent configuration.
