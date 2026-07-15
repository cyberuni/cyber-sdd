# suite-format-governance

Internal SDD governance (`user-invocable: false`). The **suite-format** bar — how a `.feature`
behavior suite is written and judged: boolean Gherkin, the `@rubric` exception, the discrimination
rule (every scenario and every `@rubric` dimension must register a miss — the miss test, the
presence / restatement / procedural anti-patterns), pairwise consistency across scenarios in one
suite, the test-vector rule for a `Given` (and its swap test), scenario ordering, and the `@frozen`
marker.

Loaded by the **spec-producer** (to self-align before writing scenarios) and the **spec-judge** (to
grade the suite backward at the spec gate); named by the **impl-producer** and **impl-judge** bars,
which carry the same test-vector rule as their own actor's duty. The `spec.md` structure lives in
`spec-format`; the freeze/unfreeze model lives in the SDD lifecycle bar. Not triggered by users
directly.
