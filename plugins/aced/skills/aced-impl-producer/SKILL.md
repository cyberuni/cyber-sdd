---
name: aced-impl-producer
description: "Internal skill: the ACED impl-producer's diagnose-and-refine loop — classifies failing eval cases by pattern and proposes concrete before/after edits to the agent configuration under production. Loaded by define-agent, define-skill, and define-governance when refining against aced-impl-judge failures, and by the public improve skill for ACED-tracked targets. Not triggered by users directly."
user-invocable: false
metadata:
  actor: producer
  gate: impl
---

# ACED Impl-Producer — diagnose and refine

Diagnose failing eval cases and propose targeted edits to the target agent configuration.

## Role: the ACED impl-producer

When the conductor dispatches `define-agent`, `define-skill`, or `define-governance` as a generic builder (`produced-by sdd:automaton`) for the **impl-producer** role (implement mode, against a frozen `.feature`), it co-produces **two** things: the agent configuration **and its verification** — the scenario→rubric eval suite (`eval.md` thresholds + `golden-set/` cases, one per scenario). Authoring or refreshing that eval suite is part of that act. As impl-producer it self-aligns to `sdd:ownership-governance` plus the resolved **builder-impl + architect-impl** bars (the ACED builder-impl is `aced:aced-builder-impl`). When the **impl-judge** (`aced-impl-judge`) reports scenario failures, load this skill to run the diagnose-and-refine loop below. The impl-judge only **runs** the suite — it never authors it — so a missing or stale eval for a frozen scenario is the impl-producer's to write, not the judge's to invent. Independence holds because the evals are anchored to the frozen `.feature` and executed by a separate runner.

## Load context

Find `artifacts/specs/<feature-name>/`:
- Read `eval.md` for the target agent configuration path
- Read the target agent configuration in full
- Read the most recent result file from `results/` (sort by filename descending, take first)

If no results exist, run `run` first.

## Identify failing cases

From the latest results, collect all cases where `pass: false`. Read each failing test case file from `golden-set/`.

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

If failures are caused by inherent non-determinism (high score variance across similar cases), recommend:
1. Adding more specific examples to the agent configuration
2. Lowering the threshold in `eval.md` for that layer if the bar was set too high
3. Splitting the agent configuration into two narrower ones

Do not propose removing test cases to fix failing evals — that defeats the purpose.
