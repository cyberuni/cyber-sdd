---
spec-type: reference
concept: governance
---

# architect — the Architect actor bar

A **reference artifact**: the `architect` actor bar — structural fit. The Architect judges *does it
fit the existing structure without duplication or conflict?* It applies at **both gates** — the
spec/solution at the spec gate, the implementation at the impl gate — so it ships as two bars,
`architect-spec` and `architect-impl`.

## Subject

- **Artifact** — the `architect-spec` and `architect-impl` bars, shipped as
  `plugins/sdd-new/skills/architect-spec-governance/` and `architect-impl-governance/` (SDD-default
  actor governances; a plugin may bind its own per artifact-type —
  `../../design/governance-resolution.md`).
- **Contract surface** — structural fit: no duplication, no conflict with conventions / module
  boundaries / an existing spec's contract; at the impl gate also contained complexity.
- **Conformance** — `architect-spec` is self-aligned by the **solution-producer** (forward, on the
  ungated `<unit>.solution.md`) and graded by the **cold spec-judge** (backward); `architect-impl`
  is self-aligned by the **impl-producer** and graded by the **impl-judge**. Faces merged per gate,
  with an **asymmetry footer** on `architect-spec`: the judge reads `spec.md` + `.feature` only (the
  solution is out of its view), so it grades structural fit from the contract surface, not the
  solution doc. `producer ≠ judge` holds at the agent level (`../common-governances.solution.md`).
  A reference artifact carries this `## Subject` in place of `## Use Cases` + a `.feature`.
- **Boundary** — scope belongs to `oracle`; testability/coverage belongs to `builder`. "Ungated"
  describes the **solution artifact**, not architecture-judging: the Architect-backward face judges
  structure at *both* gates. A structural problem in *another* domain is an Architect observation
  that spawns a new spec — never a marker in the spec being built. This bar owns structural fit.
