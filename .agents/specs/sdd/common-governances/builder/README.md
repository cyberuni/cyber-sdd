---
spec-type: reference
concept: governance
---

# builder — the Builder actor bar

A **reference artifact**: the `builder` actor bar — testability and coverage. The Builder judges
*is it a complete, testable contract, and does the artifact meet it?* This question splits across
**both gates** — coverage (does the suite *test* the behavior) at the spec gate, conformance (does
the implementation *satisfy* it) at the impl gate — so it ships as two bars, `builder-spec` and
`builder-impl`.

## Subject

- **Artifact** — the `builder-spec` and `builder-impl` bars, shipped as
  `plugins/sdd/skills/builder-spec-governance/` and `builder-impl-governance/` (SDD-default
  actor governances; a plugin may bind its own per artifact-type —
  `../../design/governance-resolution.md`).
- **Contract surface** —
  - `builder-spec`: the `.feature` at the spec gate — every behavior testable (boolean), full
    happy-path + error coverage, graded subjects reduced to a boolean. Each **stated extension**
    and each **forbidden combination** a use case names is a stated outcome carrying its own
    scenario (`../../authoring/spec-format/README.md`); `extensions: none` is a claim to judge.
  - `builder-impl`: the implementation at the impl gate — checks derived from the frozen `.feature`
    (one per scenario), no green-by-tampering. Its **verify-as-high-as-it-doesn't-hurt** default is
    **overridden for an instrument subject** — the class defined on the
    [`../../mission/impl-producer/`](../../mission/impl-producer/README.md) node — by the
    **mutation-sweep-first** rule stated there, so an agent loading `builder-impl` alone reaches the
    exception through this reference.
- **Conformance** — `builder-spec` is self-aligned by the **spec-producer** (it writes the testable
  `.feature`) and graded by the **cold spec-judge**; `builder-impl` is self-aligned by the
  **impl-producer** and graded by the **impl-judge**. Faces merged per gate — one bar, loaded by
  both agents; `producer ≠ judge` holds at the agent level (`../common-governances.solution.md`).
  A reference artifact carries this `## Subject` in place of `## Use Cases` + a `.feature`.
- **Boundary** — scope/kill-or-ship belongs to `oracle`; structural fit belongs to `architect`;
  the `@rubric` form for a graded scenario belongs to `suite-format`. This bar owns testability and
  coverage.
