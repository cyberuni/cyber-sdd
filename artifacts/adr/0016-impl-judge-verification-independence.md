# ADR-0016: Impl-judge verification independence

## Status

Accepted

## Context

At the SDD impl gate the **impl-producer** builds the implementation **and authors its verification**
(the mapping from each frozen Gherkin scenario to an executable check), and a cold **impl-judge** runs
that verification against the frozen `.feature`. The producer≠judge split exists to keep a grader from
signing off on its own work. A design question surfaced during the `core-agents` build: does putting
the judge in a fresh/cold context actually deliver that independence — or does the judge merely re-run
the producer's own (possibly overfit) tests and inherit its blind spots?

Two adversarial research sweeps (`docs/research/2026-06-impl-judge-independence.md`;
`.research/impl-judge-independence/`) found:

- **Cold context buys only partial independence.** It removes *context-bound* bias (anchoring, the
  self-correction blind spot) but not *weight-bound* bias — same-model self-preference is driven by
  perplexity/familiarity (Wataoka 2410.21819); a same-model producer and judge share a training
  distribution and thus **correlated blind spots**.
- **Self-verification is unsound** and re-running producer-authored tests confirms internal
  consistency, not contract conformance; LLMs write vacuous/overfit tests and attack tests under
  optimization pressure (Huang 2310.01798; Stechly/Kambhampati; OpenAI 2503.11926).
- **SDD is well-positioned**: the frozen `.feature` is a spec-owned independent oracle (the strongest
  kind — Barr/Harman TSE'15). The leak is that the producer authors the scenario→assertion *mapping*.

## Decision Drivers

- The verdict must answer *"does the frozen contract hold,"* not *"did the producer's tests pass."*
- Preserve the producer's fast iterate-to-green loop (cheap inner iteration).
- Keep cost proportionate — full independent re-derivation + mutation on every commit is wasteful.

## Considered Options

### Option 1: Producer reports result → cold judge ratifies the result

- **Pros**: fastest; minimal judge work.
- **Cons**: same-model self-grade — the worst option in the literature; rubber-stamps overfit/vacuous
  tests; no independence.

### Option 2: Cold judge re-runs the producer's tests + an orthogonal read (status quo)

- **Pros**: the frozen `.feature` anchors the bar; cold context removes some bias.
- **Cons**: the deterministic re-run adds little on the objective axis; the orthogonal read is itself
  a biased same-model judgment; producer test-authorship is the unguarded leak.

### Option 3: Layered model — re-derive from the contract, objective backstop, judge ≠ producer model

- **Pros**: closes the test-authorship leak; the objective backstop makes "is this test vacuous"
  measurable; a different judge model breaks the correlated-error class.
- **Cons**: more judge cost; mutation scoping needs care (equivalent-mutant noise).

## Decision

Adopt **Option 3** — a layered impl-judge model `(c) ⊃ (b) ⊃ (a)`, scaled by the autonomy leash /
blast radius:

- **(b) primary** — the judge **independently re-derives verification from the frozen `.feature`**,
  treating each scenario's Given/When/Then as the specified oracle and confirming the producer's
  verification genuinely asserts it (not trusting the producer's chosen assertions).
- **(c) backstop** — an **objective behavioral-exercise check** ("does a passing test fail when the
  named behavior breaks" — scoped mutation on the asserted behavior), applied to high-blast-radius
  scenarios per `autonomy-rubric`.
- **(a) demoted** — the producer's green tests are a **fast pre-filter, never the verdict**.
- **Prefer direct `.feature` execution** over a unit-test mapping; where a mapping is unavoidable, the
  judge verifies it is **faithful**, not merely green.
- **Judge model ≠ producer model** — a deliberate default; escalate toward a diverse panel only at
  high blast radius.

## Rationale

The frozen contract is the one independent oracle in the system; the judge's value is realized only
when it grades against that contract rather than against the producer's own tests. A deterministic
re-run of producer-authored tests is bias-free but bounded by the producer's (overfit-prone)
assertions; an objective exercise/mutation check converts test quality from a subjective verdict into
a measurement; and a different judge model is the only lever that touches the shared-blind-spot class
cold context cannot. Layering by cost keeps the producer's fast loop intact while moving the *gate
verdict* to genuine independence.

## Consequences

### Positive

- The impl gate resists overfit/vacuous tests and same-model self-preference.
- Producer iteration stays fast (green tests remain a pre-filter).
- Independence rigor scales with blast radius rather than being flat.

### Negative

- Higher judge cost on high-blast-radius scenarios (re-derivation + mutation).
- Requires the harness to run the judge on a different model/effort than the producer.

### Risks

- Mutation scoping: the equivalent-mutant problem (4–39% noise) — mitigated by scoping (c) to the
  behavior each frozen scenario asserts, not the whole codebase.
- Over-distrust: blanket suspicion of generated tests is unwarranted (well-prompted tests are often
  non-trivial) — (a) stays a legitimate pre-filter, not a discarded signal.

## Implementation Notes

Spec-only first (the `sdd-implementer` impl-judge agent is built later in `core-agents`):
`mission/deliver/impl-judge` (the layered verdict + suite), `mission/deliver/impl-producer` (green =
pre-filter; prefer direct exec; faithful mapping), `mission/conductor` impl gate (judge≠producer
model; leash-scoped rigor), reconciled with `design/autonomy-rubric.md`. Part of CR github-34's
explore phase; nothing is frozen yet, so the draft `.feature` files are editable.

## Related Decisions

- [ADR-0014](0014-sdd-governance-split.md) — the governance/actor split the lenses build on.
- [ADR-0015](0015-three-tier-provenance-and-plan-handoff.md) — provenance the gate records into.
