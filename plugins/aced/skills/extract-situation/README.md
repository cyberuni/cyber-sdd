# extract-situation

Internal, non-invokable ACED engine — loaded by `aced-case-judge`, not triggered directly. It reads
one scenario out of a frozen `.feature` and emits only the situation a simulating agent may see.

## What it does

Parses the `.feature`, finds the named scenario, and emits its `Given` and `When` steps verbatim, in
file order. It withholds the scenario name, every `Then`, the inline `@rubric` docstring, the tags,
the `Feature:` description, and every sibling scenario.

An `And` inherits the keyword above it, so `Then A / And B` withholds `And B` while
`Given X / And Y` emits `And Y`. For a `Scenario Outline`, `<placeholder>` tokens are preserved and
an `Examples` column survives only when an emitted step references it.

Every failure exits non-zero and emits nothing: an unreadable or unparseable file, a scenario name
that is absent or matches twice, or a missing argument.

## Why it exists

ACED's per-case scorer used to be handed a scenario's name, its `Then`, and its rubric — and then
asked to simulate an agent and score that simulation in one context. The simulator was told the
answer before it answered, so a passing score could not distinguish an agent that reasons from one
handed the key. This engine composes the simulator's brief mechanically, so the redaction is done by
tested code rather than by a judge deciding what to withhold from itself.

## Usage

```
node "<skill>/scripts/extract-situation.mts" --feature <path-to-.feature> --scenario "<exact name>"
node "<skill>/scripts/extract-situation.mts" --feature <path> --scenario "<name>" --format json
```
