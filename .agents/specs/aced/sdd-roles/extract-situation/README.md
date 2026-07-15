---
spec-type: behavioral
concept: [sdd-roles]
---

# extract-situation — the blind-brief extractor

Read one scenario out of a frozen `.feature` and emit only the situation — its `Given` and `When`
steps — so a simulating context can never be handed the answer key.

## Use Cases

This engine is **not an ACED subject** — its output is deterministic and directly assertable by
`node:test`, not LLM-graded, so it carries no `**Fit:**` line and ACED's graded lenses do not apply
to it. Its suite is boolean throughout and binds to the engine's own tests.

**Subject** — when `judge` composes the brief for a simulating context, parsing the named scenario
and emitting its `Given`/`When` steps while withholding the name, every `Then`, the inline `@rubric`,
the tags, the `Feature:` description, and every sibling scenario.
**Non-goals** — simulating (that is the context `judge` dispatches); scoring or applying the
threshold (`judge`); authoring the rubric (`scenario-writer`); deciding *whether* a step is
verdict-revealing beyond the keyword rule — it withholds by structure, never by judgment.

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Emit the situation | a `.feature` path and an exact scenario name | it emits that scenario's `Given`/`When` steps verbatim, in the file's order, regrouping nothing |
| Withhold the answer key | a scenario carrying a name, a `Then`, and an inline `@rubric` | the name, every `Then`, and the rubric docstring appear nowhere in the output |
| Honor keyword inheritance | a scenario with `And`/`But` steps under both a `Given` and a `Then` | the step under `Given` is emitted; the step under `Then` is withheld |
| Emit a situation docstring | a `Given`/`When` step carrying a docstring (routinely the prompt under test) | the docstring is emitted with its step; a docstring under a `Then` is withheld with its step |
| Survive a keyword-leading rubric | a rubric ladder whose lines open with `Given`/`When` | no docstring line is emitted, and the ladder does not capture the `And` steps below the docstring |
| Withhold an orphaned step | an `And` with no step above it to inherit from | its keyword is unresolved, so it is withheld |
| Withhold the neighbors | a `.feature` holding sibling scenarios and tags | no sibling scenario, tag, or `Feature:` description appears in the output |
| Keep an outline's placeholders | a `Scenario Outline` whose `Given`/`When` carry `<placeholder>` tokens | the tokens stay intact and each referenced `Examples` column is emitted |
| Select one outline row | a `Scenario Outline` and a row index | only that row's values are emitted — one row is one case; an out-of-range row exits non-zero |
| Skip a commented row | a `Scenario Outline` whose `Examples` carry a commented-out row | it is neither emitted nor counted — it shifts no row index and inflates no row count |
| Withhold a Then-only column | a `Scenario Outline` whose `Examples` carry a column only a `Then` references | that column is withheld |
| Fail closed on an empty situation | a scenario the file holds carrying no `Given` and no `When` | it exits non-zero and emits no brief, rather than an empty one |
| Fail closed on an absent scenario | a scenario name absent from the file | it exits non-zero and emits no brief |
| Fail closed on an ambiguous name | a name matching two scenarios in the file | it exits non-zero and emits no brief |
| Fail closed on an unreadable file | a `.feature` path that cannot be read | it exits non-zero, names the file, and emits no brief |
| Fail closed on text with no `Feature` line | text whose `Feature:` mentions all fall mid-line | it exits non-zero, names the file, and emits no brief |
| Match the scenario name exactly | a name differing only by case, or forming part of a held one | it exits non-zero rather than emitting a different scenario's situation |
| Fail closed on a missing argument | `--feature` or `--scenario` absent | it exits non-zero with a usage error |
| Stay read-only | any invocation | it writes no `.feature`, no brief, and no other file |
