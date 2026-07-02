# add-scenario

Add a new scenario to an existing ACED `.feature` suite — from a real failure, a production edge case, or a gap you noticed.

## When to use

Use this skill when you already have a suite (`eval.md` + a frozen `.feature`) and want to grow its coverage with one more scenario.

Good triggers include:

- "Add a test case for this failure"
- "We need to cover this edge case"
- Turning a pasted agent transcript that went wrong into a guarded-against scenario

Defer to a sibling when the request is about scoring the existing set (`run`), diagnosing why cases fail (`improve`), or there's no suite yet at all (`define-skill` / `define-agent` / `define-governance`, then `sdd:start-mission` to author one).

## What it does

Locates the target suite, classifies the new scenario's layer (trigger / behavior / quality) from how you describe the failure, drafts a Gherkin scenario (boolean, or `@rubric` with an inline rubric, or a `@trigger` `Examples` row), confirms it with you, and appends it to the frozen `.feature` (additive — self-clears).

## Install

```bash
npx skills add cyberuni/cyberplace --skill aced/add-scenario
```
