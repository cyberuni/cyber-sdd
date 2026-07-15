---
name: extract-situation
description: "Partial Skill: invoke by name only — the ACED blind-brief extractor — loaded by aced-case-judge to compose a simulating context's brief, not user-triggered."
user-invocable: false
metadata:
  internal: true
---

# extract-situation

The **blind-brief extractor** — the deterministic engine that reads one scenario out of a frozen
`.feature` and emits **only the situation**: its `Given` and `When` steps. The scenario **name**,
every `Then`, the inline `@rubric`, and the tags are **never** emitted. `aced-case-judge` composes a
simulating context's brief **only** through this engine; it never decides by its own judgment what to
withhold. It is **read-only** — it never writes a `.feature`, a brief, or any other file.

## Invocation

```
node "<skill>/scripts/extract-situation.mts" --feature <path-to-.feature> --scenario "<exact name>"
```

`--format json` emits `{ given, when, placeholders }` instead of the markdown brief.

## What it emits, and what it must never emit

| Element | Emitted | Why |
|---|---|---|
| `Given` steps (and an `And`/`But` inheriting `Given`) | **yes** | the situation the agent is in |
| `When` steps (and an `And`/`But` inheriting `When`) | **yes** | the act under evaluation |
| Scenario **name** | never | names state the verdict (`red tests block the commit`) |
| `Then` steps, and any `And`/`But` inheriting `Then` | never | the expected outcome is the answer key |
| Inline `@rubric` docstring | never | the scoring ladders are worked answers |
| Tags, `Feature:` description, sibling scenarios | never | not the situation |

**Keyword inheritance is the load-bearing rule.** An `And` takes the keyword of the step above it:
`Given X / And Y` makes `And Y` a `Given` (emit); `Then A / And B` makes `And B` a `Then` (withhold).
Tracking the current keyword is what keeps the answer key out of the brief.

For a `Scenario Outline`, `<placeholder>` tokens stay intact and an `Examples` column is emitted
**only when an emitted step references its placeholder** — a column only a `Then` reads is withheld.

## Fail closed

Every failure exits non-zero and emits **no brief** — an empty brief must never be mistakable for a
valid one. Unreadable or unparseable `.feature`; scenario name absent; the name matching **two**
scenarios; `--feature` or `--scenario` missing.

## References

The contract this engine serves: `aced-case-judge`'s blind two-pass protocol, spec'd at
`.agents/specs/aced/sdd-roles/judge/`.
