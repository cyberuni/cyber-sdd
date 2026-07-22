---
name: aced-impl-producer
description: "Partial Skill: invoke by name only — the ACED impl-producer's diagnose-and-refine loop — loaded by define-agent, define-skill, and define-governance, and by the public improve skill for ACED-tracked targets, not user-triggered."
user-invocable: false
metadata:
  actor: producer
  gate: impl
---

# ACED Impl-Producer — diagnose and refine

Diagnose failing eval cases and propose targeted edits to the target agent configuration.

## Role: the ACED impl-producer

When the conductor dispatches `define-agent`, `define-skill`, or `define-governance` as a generic builder (`produced-by sdd:automaton`) for the **impl-producer** role (implement mode, against a frozen `.feature`), it builds the **agent configuration** to pass the frozen suite. The **verification is the frozen `.feature` itself** — its inline `@rubric` scenarios and `@trigger` `Examples`, authored by `aced-scenario-writer` at explore and frozen at the spec gate — so the impl-producer does **not** author a separate eval suite. As impl-producer it self-aligns to `sdd:ownership-governance` plus the resolved **builder-impl + architect-impl** bars (the ACED builder-impl is `aced:aced-builder-impl`). When the **impl-judge** (`aced-impl-judge`) reports scenario failures, load this skill to run the diagnose-and-refine loop below. Independence holds because the evals are anchored to the frozen `.feature` and executed by a separate runner (`aced-case-judge`), which is not the producer.

## Load context

Find the target's node in the project spec — `.agents/specs/<project>/…/<node>/` (discovered through
the SDD spec tree; the node's `eval.md` names the subject) — which holds the frozen `<node>.feature`
and its colocated `eval.md` (subject + run policy):
- Read `eval.md` for the `subject` agent configuration path and the `eval:` run policy
- Read the `subject` agent configuration in full
- Read the frozen `<node>.feature` (the eval source)
- Read the most recent result file from `results/` (sort by filename descending, take first)

If no results exist, run `run` first.

## Identify failing scenarios

From the latest results, collect all scenarios where `pass: false`. Read each failing scenario from the frozen `.feature` (its steps and inline `@rubric`).

## Group failures by pattern

Classify each failure into one or more of these patterns:

| Pattern | Signs |
|---|---|
| **Trigger false-positive** | Trigger layer case where agent fires when it shouldn't |
| **Trigger false-negative** | Trigger layer case where agent doesn't fire when it should |
| **Missing step** | Behavior case where a specific step was skipped |
| **Ambiguous rule** | Multiple behavior cases fail on the same rule — inconsistent execution |
| **Conflicting instruction** | Agent followed one rule but violated another in the same agent configuration |
| **Scope creep** | Agent did more than the agent configuration specifies |
| **Description mismatch** | Trigger failures suggest the `description:` field doesn't match the body |

Report the pattern groupings before proposing fixes.

## Propose specific edits

For each pattern, propose a concrete change to the agent configuration. Show exact before/after diffs — do not describe changes in prose.

Examples of edit types:

- **Trigger false-positive/negative** → rewrite the `description:` field; add explicit "when NOT to use" section
- **Missing step** → make the step more prominent; add a concrete example; break it into sub-steps
- **Ambiguous rule** → replace vague language ("prefer X") with decision rule ("use X when Y, use Z when W")
- **Conflicting instruction** → add explicit precedence rule or split into separate instructions
- **Description mismatch** → align `description:` to match what the body actually instructs

## Confirm before applying

Show all proposed edits to the user. Ask for approval before writing any changes.

After user approval, apply edits to the agent configuration. Then automatically run `compare` (before = previous git revision, after = current working tree) to verify the changes improved scores without introducing regressions.

## If no clear fix exists

If failures are caused by inherent non-determinism (high score variance across similar scenarios), recommend:
1. Adding more specific examples to the agent configuration
2. Lowering the bar — but a per-scenario `threshold` is **inline in the frozen `.feature`**, so lowering it is a narrowing edit that needs a **re-open + Clearance** at the spec gate, not a casual `eval.md` change (only `eval.judge.default_threshold`, the fallback, lives in `eval.md`)
3. Splitting the agent configuration into two narrower ones

Do not propose removing scenarios to fix failing evals — that defeats the purpose.
