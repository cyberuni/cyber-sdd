# ADR 0002 — ACED scenario level: boundary + `@rubric` (open hypothesis)

**Status:** proposed (open hypothesis — to settle with corpus evidence, not decided here)

## Context

Companion to the SDD suite-design doctrine (`../../../sdd/authoring/suite-format/README.md`,
ADR-0028), distilled from CR `github-315`. That doctrine says: for **deterministic code**, the
`.feature` stays at acceptance/boundary level and the inner-rule combinatorics move down to **unit
tests** owned by the impl-producer.

Agent config **breaks that move**: it has **no deterministic inner layer** to push combinatorics down
to — the behavior *is* an LLM following instructions (`../test-levels.md`). So ACED cannot offload the
way deterministic code can. Two options remain:

- **(a) surface more concrete scenarios** at the suite level, or
- **(b) keep scenarios at the boundary level** and let **`@rubric`** absorb the graded /
  non-deterministic space.

## Decision

**Lean (b), unproven — recorded, not settled.** Boundary-level scenarios with `@rubric` for the
graded behavior is the plausible answer (non-determinism is what `@rubric` exists for), but it is a
**hypothesis**: a future ACED mission settles it with real corpus evidence rather than re-deriving it.

**The falsifier is the boolean-smuggling tell.** If ACED rubrics begin **restating booleans** —
dimensions re-grading a property a boolean scenario in the same suite already decides — then (b)
pushed **too much** into the rubric: some of it wanted a concrete scenario, and the boundary was set
too high. Watching that tell is how the hypothesis is confirmed or refuted in practice.

## Reconciliation with SDD #280

#280 (CLOSED) ruled that rubric redundancy must **not** be classified by **twin-scanning criteria**
across two dimensions ("same criterion ≠ same object"): a dimension **redundant** with a boolean twin
in the same suite cannot false-green (the boolean backstops the gate), so on the **discrimination**
lens it is noise, not a hole.

The boolean-smuggling this ADR names is the **same object** #280 studied, read on a **different
lens**: an untradeable boolean admitted into a compensatory sum is a **Selection** defect (a rule does
not belong in the sum) even though it produces no false green. The `spec-validator` flags it by the
**same-object** test — a boolean scenario in the same suite already decides this property — and
**never** by the same-criterion twin-scan #280 rejected. Both rulings stand: #280's discrimination
verdict (noise) and this Selection verdict (out of the sum) are orthogonal reads of one dimension.

## Consequences

- ACED authoring/judging gains an explicit boolean-smuggling guard at **Selection**, respecting #280.
- The open question is **recorded and discoverable** for a future mission, with a concrete falsifier.
- Non-goal (deferred): deciding (a) vs (b) — that needs corpus evidence this ADR deliberately does not
  manufacture.
