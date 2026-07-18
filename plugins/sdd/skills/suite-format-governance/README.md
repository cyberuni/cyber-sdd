# suite-format-governance

Internal SDD governance (`user-invocable: false`). The **suite-format** bar — how a `.feature`
behavior suite is written and judged: acceptance only (strict — decisions, not invariants), the
suite as the capability's decision graph (one scenario per edge, guards paired with positive
companions, every scenario bound to a scenario-map edge), boolean Gherkin, the `@rubric` exception,
the `@pinned` user-owned seed scenario, the test-vector rule for a `Given` (and its swap test),
pairwise consistency, scenario ordering, and the `@frozen` marker.

Loaded by the **spec-producer** (to self-align before writing) and the **spec-judge** (to grade the
suite backward at the spec gate); named by the **impl-producer** and **impl-judge** bars, which carry
the same test-vector rule as their own actor's duty.

Neighbors: the `spec.md` structure (use-case groups, the drawn logic graph, the scenario-map table)
lives in `spec-format`; the verification **level** (e2e…unit) is a test implementation detail owned
by the impl-producer + impl actor bars, never this bar; the freeze/unfreeze *model* lives in the SDD
lifecycle bar. Not triggered by users directly.
