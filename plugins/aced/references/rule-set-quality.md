---
description: Quality checks for a reference that holds a rule set (rubric, constraint set, checklist, decision table) other skills load but never run. Apply after creating or updating one.
tags: [reference, rule-set, quality, validate]
---

## Scope

Apply when a reference's content is a rule set: a rubric, a constraint set, a checklist, a decision table, or a mix. A reference is created and edited with the `reference` skill of `cyber-agentkit`; these checks add to what that skill verifies.

## Checks

| # | Check | Severity |
|---|-------|----------|
| R1 | No `## Why`, `## Rationale`, or causal prose. The rationale goes in an ADR | HIGH |
| R2 | The body opens with an `Apply when:` line naming the situation or artifact type the rules govern | MEDIUM |
| R3 | Every rule is atomic and independently falsifiable | MEDIUM |
| R4 | No workflow steps (numbered action sequences). A workflow is a skill | MEDIUM |
| R5 | A constraint set, checklist, or decision table has a `## Validate` section (see below) | MEDIUM |

Fix every CRITICAL and HIGH failure before presenting the file. Name every failing check in the report, including those below the fix bar left unfixed.

## Atomic rules

Decide whether a multi-clause rule splits by asking what each clause has left to check when the other is false.

- Split it when each clause states its own demand. "Every skill has a README and its description names a trigger" splits: a skill can have a README with no trigger in its description, and the reverse.
- Keep it whole when one clause qualifies another. "The description names when to trigger, and does so in the user's own phrasing" stays one rule: with no trigger named, there is no phrasing to check.

The joining word does not decide this. Test the clause, not the seam.

## Validate section

Write one assertion per binding rule, each an observable, falsifiable claim about the resulting artifact: a diff, a file's presence or absence, a structural shape. Never a claim about the agent's intent ("I checked X").

- Prefer a mechanical check (a script, a grep pattern, a diff) wherever the rule permits one.
- Phrase a judgment call so a second, cold reader re-derives it from the artifact, not from the first agent's account.
- "Confirm you followed the rules above" does not count; it restates the instruction.
- A pure rubric needs no `## Validate`: its scored dimensions already verify it.
- The author runs the section as a pre-handoff self-check; a cold reader runs it again later.
