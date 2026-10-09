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
| scaffolding a **new** skill, agent, command, or governance from scratch | `define-skill` / `define-agent` / `define-command` / `define-governance` |
| **scoring** a config against its frozen `.feature` suite | `run` |
| **adding** a new scenario | `add-scenario` |
| **diffing** two versions before committing a change | `compare` |
| auditing a `SKILL.md`'s structure/compliance specifically | `improve-skill` |

## Locate the target and its artifact type

Identify the config being improved: skill, subagent, command, or AGENTS.md section. Read it in
full. If the artifact type or path is not clear from context, ask.

## Determine ACED-tracked status

Check for the target's node in the project spec — `.agents/specs/<project>/…/<node>/` (discovered
through the SDD spec tree) — carrying a colocated `eval.md` for this target.

- **ACED-tracked (eval suite exists):** ensure a recent result exists — run `run` first if the
  latest file in `.agents/aced/results/<target-slug>/` is stale or missing. Then load `aced-impl-producer` to identify failing
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

## When the symptom is "didn't follow an instruction"

This is a distinct failure class from a failing eval scenario, and needs a different fix. A
reworded prompt won't hold, because self-reported compliance is not verified compliance — an agent
asked to list which rules it applied can produce an accurate-looking list while still not having
correctly applied them, or can misjudge its own compliance in good faith. The fix is structural:
does the instruction file carry a paired, checkable way to verify itself — usable both before the
fact (by the agent that just followed it) and after the fact (by anyone re-checking).

1. **Does the offending instruction — a skill, a governance, a subagent definition, an `AGENTS.md`
   section — carry a `## Validate` section at all?** No → that is the root gap. Propose adding one:
   a set of assertions about observable artifact state (diffs, file presence, structural shape),
   one per binding rule, not a restatement of the rule in other words. Prefer a mechanical check
   (script/grep/diff) wherever the rule is checkable that way; where it is a genuine judgment call,
   phrase the assertion as something re-derivable from the artifact by a second, cold reader — never
   something read off the first agent's own account of what it did. `improve-skill` Q19 flags this
   gap structurally when auditing a `SKILL.md`.
2. **Has one, but nothing required the agent to run it before finishing?** An enforcement gap, not a
   detection gap — the procedure needs to gate completion on the self-check passing, so a violation
   is caught and fixed by the same agent, before any handoff to review.
3. **Self-check ran and passed, but an independent read later found a real violation?** The
   assertion itself is too weak or gameable — tighten it toward artifact-state phrasing rather than
   trusting a narrative claim.
4. **Self-check correctly failed and got overridden anyway?** Not a detection gap — an escalation
   gap. The procedure needs a hard stop there, not a warning the agent can talk itself past.

In SDD specifically, this maps onto the producer/judge split: the producer's own procedure runs the
`## Validate` section as its own pre-handoff self-check (catching most violations before a judge
cycle is spent), and the cold judge re-runs the identical section against the artifact — not
against the producer's `Output` trace — for the genuine cold check. The pattern itself (a paired
Validate section, run twice, from two vantage points) applies to any instruction file consumed by
any agent, SDD or not.

## If no clear fix exists

If failures are caused by inherent non-determinism (high score variance across similar cases),
recommend:
1. Adding more specific examples to the config
2. Lowering the bar — but a per-scenario `threshold` is inline in the frozen `.feature`, so lowering it is a narrowing edit that needs a re-open and Clearance at the spec gate, not a casual `eval.md` change (only `eval.judge.default_threshold`, the fallback, lives in `eval.md`)
3. Splitting the config into two narrower ones

Do not propose removing test cases to fix failing evals — that defeats the purpose.
