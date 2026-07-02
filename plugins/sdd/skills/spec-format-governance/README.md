# spec-format-governance

Internal SDD governance (`user-invocable: false`). The **spec-format** bar — the universal rules
for how a `spec.md` is *structured*: the required `## Use Cases` section and the `spec.md`
enrichment / human-readability rule.

Loaded by the **spec-producer** (to self-align before writing) and the **spec-judge** (to grade
structure backward at the spec gate). It carries no `.feature`: the `.feature` Gherkin/rubric form
and scenario ordering live in `suite-format`, and spec granularity lives in the corpus-organization
bar. Not triggered by users directly.
