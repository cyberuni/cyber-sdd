# add-scenario

Add a new test case to an existing ACED golden set — from a real failure, a production edge case, or a gap you noticed.

## When to use

Use this skill when you already have a suite (`eval.md` + `golden-set/`) and want to grow its coverage with one more scenario.

Good triggers include:

- "Add a test case for this failure"
- "We need to cover this edge case"
- Turning a pasted agent transcript that went wrong into a guarded-against scenario

Defer to a sibling when the request is about scoring the existing set (`run`), diagnosing why cases fail (`improve`), or there's no suite yet at all (`define-skill` / `define-agent` / `define-governance`, then `sdd:start-mission` to author one).

## What it does

Locates the target golden set, classifies the new case's layer (trigger / behavior / quality) from how you describe the failure, drafts the case in the standard scenario/expected-behaviors/must-not-do/rubric format, confirms it with you, and writes it as the next numbered file in `golden-set/`.

## Install

```bash
npx skills add cyberuni/cyber-skills --skill aced/add-scenario
```
