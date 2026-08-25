# ADR-0028: The `.feature` is an acceptance suite — inner-rule combinatorics move down to unit tests

## Status

Accepted

## Context

CR `github-315` (`plugin deps`) took **13 cold spec-judge rounds** to clear a single ~60-scenario,
574-line `deps.feature` for five commands. The Oracle and Architect lenses passed every round; the
churn was **entirely Builder-lens coverage** — each fresh cold judge found one more uncovered cell
(`ignore × ls` one round, `missing-manifest × verbs` the next, divergence-cross-form the next).

The root cause is not file granularity and not a missing lint. It is a **test-level error**: the
acceptance `.feature` was doing a unit test's job. It mixed two levels that belong apart —

- **Acceptance / intent behavior** — "does `deps up` do the right thing end-to-end."
- **Inner-rule combinatorics** — the five reference forms × each verb, `ignore × {up, ls, scan}`,
  divergence byte-identity semantics, partial-version parsing (lines ~135–161 were a reference-form
  *parser* unit test wearing `deps up` acceptance clothing).

**Acceptance tests structurally cannot exhaustively cover a combinatorial rule space**, so a fresh
cold judge will *always* find one more uncovered cell. The churn was guaranteed, not bad luck. The
`.feature` was also grouped by ad-hoc prose topics — screaming nothing — so no rule had a single home
where it was supposed to be complete, and the implementation would have inherited the same smear (an
`ignore` check copy-pasted into three handlers).

## Decision Drivers

- Kill the guaranteed Builder-lens churn at its structural source, not with another lint.
- Keep the two architectural laws already enforced on `src/` — screaming architecture (organize by
  intent) and clean architecture (inner rules composed behind seams) — enforced on the suite too,
  because a poorly-abstracted suite forces a poorly-abstracted implementation.
- Preserve the one-boolean-per-frozen-scenario gate contract untouched.
- Leave a clean seam for the agent-config case, which has **no deterministic inner layer** to push
  combinatorics down to (ADR companion: issue #323 / the ACED test-level doctrine).

## Considered Options

### Option 1: Keep everything in the `.feature`, add a coverage lint

- **Pros**: no new producer duty; one artifact.
- **Cons**: the lint cannot know the combinatorial space is complete — the same churn, now
  mechanized. Treats the symptom (missed cells) not the cause (wrong test level).

### Option 2: Split test levels — `.feature` = acceptance/boundary; combinatorics = unit tests

- **Pros**: each rule gets one home where completeness is local and cheap; acceptance stays thin and
  stable; the gate stops demanding a space the `.feature` structurally cannot enumerate.
- **Cons**: a new, explicit impl-producer duty (author the inner-rule unit tests) and a two-level
  impl gate.

## Decision

**Adopt Option 2.** The SDD suite-design doctrine:

1. **Suites scream the intents.** Organize scenario sections by use-case / intent, front and center —
   the same law as `src/` (no `src/utils/`). Sections named by layer, output format, or "misc rules"
   are a **placement defect**: a suite that screams plumbing rather than domain intents is a
   poorly-abstracted architecture that will churn.
2. **`.feature` = acceptance / boundary tests only.** Thin. Each scenario asserts one intent at the
   boundary. The **inner** boundary is the DIP seam (mock the external dependency behind its
   interface under the unit runner + a temp/mock fs) — not an outer boundary (no spawned subprocess,
   no real external service) unless the domain truly warrants it.
3. **Inner-rule combinatorics are the impl-producer's craft.** Given the frozen acceptance
   `.feature`, the impl-producer **designs and authors the unit / inner-boundary tests** for the
   inner rules (plain `pnpm test`) — the truth tables, the full matrices, boundary semantics —
   covered once, cheaply, exhaustively. Cases are drawn from the inner rules the code composes, never
   by enumerating the frozen scenarios. Tests and implementation are **co-developed** and the code is
   **refactored** until each inner rule has a single shared home.
4. **The impl gate checks both levels at the right level** — acceptance covers intents; units cover
   combinatorics — and **never demands the `.feature` enumerate a space it structurally cannot**.
5. **`Scenario Outline` is a rare exception, not a default.** DAMP over DRY: default to specific
   scenarios. An Outline forces one uniform `Given/When/Then` shape, so it is legitimate **only** for
   a genuinely uniform enumerated set (one varying token, the same `Then`). The tell: **two example
   rows that want different `Then`s are two scenarios, not one Outline.**
6. **Scenarios follow SRP and are deduped.** One behavior per scenario; one canonical scenario per
   behavior. A scenario with several unrelated `Then`s churns on any of them and its name starts to
   lie; two scenarios sharing a `When`+`Then` core drift into a contradiction a cold judge then bills
   to find.

The **agent-config exception** (no deterministic inner layer to offload to) is handled by the
companion ACED doctrine (issue #323): boundary-level scenarios with `@rubric` absorbing the graded
space.

## Worked example — `deps.feature`

- **Before**: 60 scenarios, one 574-line blob, sections by prose topic, combinatorics inline (the
  form-parser cases as `up` acceptance).
- **After**: thin per-command acceptance suites screaming `up` / `ls` / `scan` / `add` / `remove` at
  the inner boundary; the reference-form / ignore-matrix / divergence rules moved to unit tests owned
  by the impl-producer, each covered once.

## Consequences

### Positive

- Builder-lens churn is bounded: each intent's thin acceptance suite and each inner rule's unit
  coverage are locally, cheaply complete — no matrix eyeballed over a 60-scenario blob.
- Suite structure now surfaces implementation smear before the code is written.

### Negative

- A new explicit impl-producer duty and a two-level impl gate to teach and enforce.

### Risks

- A producer could under-cover the combinatorics (the unit level is not per-frozen-scenario gated);
  the impl gate's distinct "missing inner-rule coverage" finding is the backstop.

## Implementation Notes

- Governance: `suite-format-governance` gains the test-level split, the scream-the-intents rule, the
  Outline-as-rare-exception demotion, and scenario SRP/dedup. It stays self-sufficient — this ADR is
  not loaded at runtime.
- Behavioral contract: additive frozen scenarios on `mission/impl-producer/impl-producer.feature`
  (the inner-rule unit-test duty) and `mission/impl-judge/impl-judge.feature` (the two-level check +
  the no-inner-layer carve-out).
- `builder-impl-governance` carries the two-level conformance bar.

## Related Decisions

- [ADR-0016](0016-impl-judge-verification-independence.md) — the impl-judge re-derives the oracle; the
  two-level check composes with it.
- Issue #323 (ACED test-level doctrine) — the agent-config companion: boundary + `@rubric` where no
  deterministic inner layer exists.
