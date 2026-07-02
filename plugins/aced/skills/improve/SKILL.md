---
name: improve
description: Use this skill when the user wants to improve an existing agent configuration — a skill, subagent, command, or AGENTS.md section — whether by diagnosing failing ACED evals or by general review against fit and quality bars. Trigger on "improve this skill", "make this agent better", "why does this config keep failing", or "review this AGENTS.md section", even when no eval suite exists yet.
---

# ACED Improve

Improve an existing agent configuration of any kind. This is the general entry point — it routes
to the right diagnostic path depending on whether the target is ACED-tracked.

## Route the request first

Defer when the intent is narrower than "improve this config":

| The request is really about… | Defer to |
|---|---|
| scaffolding a **new** skill, agent, or governance from scratch | `define-skill` / `define-agent` / `define-governance` |
| **scoring** a config against its frozen `.feature` suite | `run` |
| **adding** a new scenario | `add-scenario` |
| **diffing** two versions before committing a change | `compare` |
| auditing a `SKILL.md`'s structure/compliance specifically | `improve-skill` |

## Locate the target and its artifact type

Identify the config being improved: skill, subagent, command, or AGENTS.md section. Read it in
full. If the artifact type or path is not clear from context, ask.

## Determine ACED-tracked status

Check for `artifacts/specs/<feature-name>/eval.md` for this target.

- **ACED-tracked (eval suite exists):** ensure a recent result exists — run `run` first if the
  latest `results/` file is stale or missing. Then load `aced-impl-producer` to identify failing
  scenarios, classify them by pattern, and propose concrete before/after edits.
- **Not yet tracked (no eval suite):** there is nothing to diagnose failures against. Do a general
  review instead:
  1. Load the fit classifier (`aced-fit`) to check whether this subject benefits from scenario→rubric
     evals at all — some configs are the wrong squad for ACED.
  2. Load the relevant bar for the artifact type (`aced-builder-spec` for a subject with no frozen
     `.feature` yet, `aced-builder-impl` for one that has an existing implementation) and check the
     config against it.
  3. Propose edits for any gap found: weak trigger coverage, missing near-miss handling, ambiguous
     steps, scope creep, structural issues.

## Confirm before applying

Show all proposed edits — exact before/after diffs, not prose descriptions. Ask for approval before
writing any changes.

## Verify after applying

- **ACED-tracked:** run `compare` (before = previous git revision, after = current working tree) to
  confirm the edits improved scores without regressions.
- **Not yet tracked:** offer to hand off to `sdd:start-mission` (the conductor resolves the ACED
  roles for this artifact-type) to author a `.feature` (with inline `@rubric`), or `add-scenario` to
  start one manually. Do not fabricate a pass/fail verdict without a suite to run.

## If no clear fix exists

If failures are caused by inherent non-determinism (high score variance across similar cases),
recommend:
1. Adding more specific examples to the config
2. Lowering the threshold in `eval.md` for that layer if the bar was set too high
3. Splitting the config into two narrower ones

Do not propose removing test cases to fix failing evals — that defeats the purpose.
