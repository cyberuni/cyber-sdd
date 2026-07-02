---
spec-type: behavioral
---

# scenario-writer — the spec-producer role

Author spec.md + a .feature (boolean scenarios, @rubric for graded behavior, @trigger Scenario Outline for activation) for an agent-config artifact.

## Use Cases

**Subject** — when the conductor dispatches it in explore, authoring the `spec.md` body and the
`.feature` for one agent-config artifact (skill, subagent, command, or AGENTS.md section): boolean
scenarios for deterministic behavior, `@rubric` scenarios (dimensions + threshold inline in the `Then`
docstring) for graded behavior, and a `@trigger` Scenario Outline for activation cases. The rubric is
authored **inline** in the frozen `.feature` — there is no separate golden set.
**Non-goals** — grading the suite (that is `spec-validator`); running the evals (`implementer`);
scoring one simulated case (`judge`); writing the control frontmatter (`status`, `project-path`).

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Produce a spec for an artifact | dispatched as the spec-producer with a subject (or null for a new one), trigger surface, and any user input | it writes the `spec.md` body and a sibling `.feature` (rubric inline, no golden set), leaving control frontmatter untouched |
| Classify fit first | any dispatched subject | it classifies the subject's fit tier and declares it as a `**Fit:**` line in `## Use Cases` **before** authoring scenarios (`design/fit.md`) |
| Recuse a wrong-squad subject | a subject that is a deterministic engine with no activation decision | it recuses, authoring **no** `.feature`, and recommends the SDD-default builder + a script harness |
| Frame the use cases | the subject's trigger surface and rules | the `spec.md` carries a `## Use Cases` section with Subject + Non-goals, enriched for the gate reader |
| Cover triggering by tier | the subject's intended trigger surface | a **strong-fit** subject gets should-trigger + same-keyword near-miss scenarios; a **partial-fit** subject gets **no fabricated near-miss** |
| Cover the rules and guards | each major rule/step and each prohibited behavior of the subject | each rule gets at least one behavior scenario and each prohibition a boolean must-not-do `Then` |
| Author graded behavior inline | a non-deterministic subject whose quality is graded | graded scenarios are tagged `@rubric` with dimensions + threshold in the `Then` docstring; deterministic scenarios stay boolean |
| Author activation as an outline | a strong-fit subject's representative queries | a `@trigger` Scenario Outline whose `Examples` table carries one row per query with its `should_trigger` value |
| Surface missing intent | intent that cannot be read from the subject or inferred | it returns a content gap instead of inventing the behavior |
| Revise on judge feedback or unclear input | spec-judge failures from a prior pass, or ambiguous inputs | it revises the named scenarios, or returns batched questions when it cannot proceed |
