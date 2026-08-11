---
name: builder-spec-governance
description: "Partial Skill: invoke by name only"
user-invocable: false
metadata:
  actor: builder
  gate: spec
  compose: union
---

# Builder-Spec Governance — the testability & coverage bar

The **Builder** bar at the **spec gate**: is this **capability** fully and testably specified? Judges
the capability's contract (read from its spec + suite), not the document's prose — that is
`sdd:spec-format-governance`. Loaded by both faces. The SDD default for the `builder` spec bar; a
plugin may bind its own, and this loads when the registry leaves `builder`/`spec` unbound.

## The bar

- **Every branch of the capability is covered.** Each edge of its control-flow graph (CFG) has its
  scenario, and every guard/negative edge is paired with a positive companion. The **scenario map
  is 1:1** — no orphan scenario, no uncovered edge (`sdd:suite-format-governance`). For a **fold**
  node whose rule combines two or more interacting sub-conditions, the CFG is drawn from that rule
  stated in **closed form** (single-condition folds may be by example — demanding closed form of one
  is over-firing), and its coverage is backed by a **mutation sweep** and a **safety dual**
  (`sdd:suite-format-governance`).
- **Every stated extension has a scenario.** A use case's **extensions** — the divergences it names,
  each with its cause and outcome (`sdd:spec-format-governance`) — are stated outcomes, so each
  carries at least one scenario; an extension named in prose and covered nowhere is unverified
  intent. A use case declaring `extensions: none` asserts nothing can diverge: judge that claim,
  and where a divergence is reachable, the missing extension is a coverage hole in the spec before
  it is one in the suite. A **forbidden combination** of surface elements is likewise a stated
  outcome — it needs the scenario that proves it is refused, not only the prose that names it.
- **Every scenario is testable.** Each asserts an observable outcome a check can confirm — a boolean,
  no "sometimes". A behavior the capability cannot expose cannot be specced.
- **A graded subject is still a boolean.** For a non-deterministic capability the contract reaches a
  per-scenario boolean through a rubric + threshold over N runs; the rubric form stays out of the
  boolean `.feature`, carried as a judge-only `@rubric` scenario.
- **A dimension or cut is grounded on non-author evidence.** When a `@rubric` dimension or its cut is
  justified by a **measurement** (an ablation Δ, a discrimination count), that measurement is admissible
  only if it is **not solely the author's own** — independently produced/reviewed by a non-author, or a
  fresh-adversarial ablation. An author's own instrument silently assumes the property under test. The
  standard is stated canonically at `sdd:doctrine-loop`; this bar requires it be met, not re-listed
  (the cold-instrument doctrine).

## Key points (read-check)

1. **Every branch of the capability is covered** — every edge has its scenario, guards paired with
   positives, the scenario map 1:1.
2. **Every stated extension has a scenario** — a divergence named in prose and covered nowhere is
   unverified intent; `extensions: none` is a claim to judge, not a field to accept; a forbidden
   combination needs the scenario proving the refusal.
3. **Every scenario is testable** — an observable boolean outcome; behavior the capability cannot
   expose cannot be specced.
4. **A graded subject still reaches a per-scenario boolean** via rubric + threshold; the rubric stays
   out of the `.feature`.
5. **A dimension or cut is grounded on non-author evidence** — a measurement justifying it must be not
   solely the author's own (canonical standard: `sdd:doctrine-loop`); the cold-instrument doctrine.
