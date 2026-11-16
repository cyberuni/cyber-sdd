---
description: ACED's Verification aspect of /skill - a skill is verified by the frozen .feature suite that names it, run with aced run.
tags: [skill-design, aspect, verification, aced, feature]
implements: skill-design.aspects.verification@1
check-script: scripts/check-verification.mjs
---

## Draft

1. Take the skill's Intent, Criteria, Trigger description, and near misses.
2. Write the suite as `<skill name>.feature` in the skill's spec node under `.agents/specs/<plugin>/`, through the `add-scenario` skill and the `suite-format-governance` rules: boolean scenarios for checkable outcomes, `@rubric` scenarios for graded behavior with the rubric written inline, and a `@trigger` Scenario Outline whose Examples hold at least three requests that fire the skill and three near misses that do not.
3. Write one scenario per Criteria ID. Name the ID in the scenario so a result maps back to it.

## Cases

The cases are the Scenarios of `.agents/specs/**/<skill name>.feature`. The suite is frozen once its spec gate passes; change it only through a change request. A skill with no suite yet has no cases.

## Run

Run `aced run` on the suite: several runs per scenario, each scored against its inline rubric, with each scenario collapsed to a boolean against its threshold. Write the result in the shape the `test` command of `/skill` defines. A rubric that needs a judge runs only when the author names one.

## Criteria

- **VER-1** [script] A frozen suite `<skill name>.feature` under `.agents/specs/` holds at least one Scenario. A skill with no suite yet is reported as not checked, never as a pass.
- **VER-2** [read, warning] Each Criteria ID has a scenario that decides it from the result alone.
- **VER-3** [read, warning] The `@trigger` Scenario Outline lists at least three requests that fire the skill and three near misses that do not.

## Fix

- VER-1: add the suite through `add-scenario`, or correct the empty one.
- VER-2, VER-3: add the missing scenarios or examples.

## Enhance

Look for a boolean scenario that a `@rubric` one grades loosely, and for near misses a real user would plausibly type.
