# suite-format-governance

Internal SDD governance (`user-invocable: false`). The **suite-format** bar — how a `.feature`
behavior suite is written and judged: boolean Gherkin, the `@rubric` exception, scenario ordering,
and the `@frozen` marker.

Loaded by the **spec-producer** (to self-align before writing scenarios) and the **spec-judge** (to
grade the suite backward at the spec gate). The `spec.md` structure lives in `spec-format`; the
freeze/unfreeze model lives in the SDD lifecycle bar. Not triggered by users directly.
