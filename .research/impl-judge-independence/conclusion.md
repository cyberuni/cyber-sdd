# Conclusion — impl-judge verification independence

## Decision

The cold impl-judge's verdict is *"does the frozen contract hold"*, **not** *"did the producer's
tests pass."* Adopt a layered model, cheap→expensive, scaled by the autonomy leash / blast radius:

- **(b) primary — independent re-derivation from the frozen `.feature`.** The judge treats each
  frozen scenario's Given/When/Then as *the* specified oracle and confirms the producer's
  verification genuinely asserts it — deriving "what passing means" from the spec, not from the
  producer's chosen assertions (E3, E4, F1).
- **(c) backstop — objective behavioral-exercise check, leash-scoped.** "Does a passing test *fail*
  when the behavior the scenario names is broken?" — scoped mutation on the asserted behavior, not
  the whole codebase. Turns "is this test vacuous?" into a measurement (G1–G4).
- **(a) demoted — the producer's green tests are a fast pre-filter, never the verdict.** Preserves
  the producer's fast internal iteration; only the *gate verdict* moves to the cold judge (B1, B2,
  D1, F1).
- **Prefer direct `.feature` execution over a Vitest mapping.** Direct execution keeps the oracle
  spec-owned (only the glue is producer-authored); where a unit-test mapping is unavoidable, the
  judge verifies the mapping is **faithful**, not merely green (E4).
- **Judge model ≠ producer model.** A different family is the only lever that touches the
  correlated-error class cold context cannot (A2, C1, C2); escalate toward a diverse panel only at
  high blast radius.

## Why not the alternatives

- *Producer reports result → judge rubber-stamps it* (the original framing): same-model self-grade,
  the worst option in the literature (A1–A3, B1–B2).
- *Cold judge re-runs producer tests + orthogonal read, full stop*: better, and what SDD already
  had, but the deterministic re-run adds little on the objective axis while the orthogonal read is
  itself a biased same-model judgment — leaving producer test-authorship as the unguarded leak (A2,
  D1–D4, F1).

## Landed in

- ADR-0016 (decision + why), `docs/research/2026-06-impl-judge-independence.md` (the survey the ADR
  cites).
- `.agents/specs/sdd/mission/deliver/impl-judge/` (the layered verdict model + suite),
  `.../impl-producer/` (green = pre-filter; prefer direct exec; faithful mapping),
  `.../conductor/` impl gate (judge≠producer model; leash-scoped rigor), reconciled with
  `design/autonomy-rubric.md`.

## Over-engineering guardrails

Blanket distrust of generated tests is unwarranted (D5). Full mutation testing is costly
(undecidable equivalent mutants, 4–39% noise, G4) — scope (c) to high-blast-radius scenarios via the
leash, not every commit. Keep the producer's fast iterate-to-green loop intact.
