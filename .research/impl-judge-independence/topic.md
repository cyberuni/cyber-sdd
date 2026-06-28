# Impl-judge verification independence — Investigation Record

## Question

In the SDD impl gate, the **impl-producer** builds the implementation **and authors its
verification** (the Gherkin→executable mapping/tests), and a cold **impl-judge** then runs that
verification against the frozen `.feature`. Does putting the judge in a fresh/cold context actually
achieve the independence the producer≠judge split is for — or does the judge merely re-run the
producer's own (possibly overfit) tests and inherit its blind spots? What should the cold impl-judge
do to make the verdict genuinely independent?

## Trigger

Raised 2026-06-28 while scoping the `core-agents` build. The user's working model was: impl-producer
writes code + tests, runs them, **reports the result**; the main session passes that result to the
impl-judge for a verdict (fast — the producer iterates internally). The concern: does "cold judge
over the producer's reported result" deliver the context-separation-for-quality the split promises?
The spec is actually stronger than that framing (the judge re-runs + does an orthogonal exercise
read), but the judge still inherits the producer's **test authorship** — the open question.

## Sources consulted

Two adversarial deep-research sweeps (web + literature), one on LLM-judge self-bias, one on
independent verification in coding/V&V. Full cited claims in `evidence.md`. Load-bearing pillars:
Huang et al. (self-correction), Stechly & Kambhampati (unsound self-verification), Lightman /
GenRM (external verifiers), Wataoka (the perplexity mechanism), Panickssery (self-recognition),
Verga (PoLL panels), AgentCoder (test-designer must not see the code), OpenAI 2503.11926 (RL
test-hacking), Just 2014 + Inozemtseva 2014 (mutation > coverage), Barr/Harman TSE'15 (the oracle
problem), Myers 1979 (author shouldn't test own code).

## Findings (summary)

- **Cold context buys PARTIAL independence.** It removes *context-bound* bias (anchoring, the
  self-correction blind spot) but **not** *weight-bound* bias — same-model self-preference is driven
  by perplexity/familiarity (Wataoka 2410.21819), and producer+judge share a training distribution →
  **correlated blind spots**. Cold ≠ independent.
- **Re-running the producer's own tests is the weakest verification leg.** It confirms internal
  consistency, not contract-conformance, and re-confirms shared blind spots. LLMs write vacuous /
  overfit tests (100% coverage at 4% mutation score) and, under optimization pressure, attack the
  tests outright (OpenAI 2503.11926).
- **SDD is well-positioned by construction.** The frozen Gherkin `.feature` is a **spec-owned
  independent oracle** — the strongest "specified oracle" (Barr/Harman TSE'15; Myers 1979). The leak
  is that the impl-producer authors the *mapping* from scenario to executable assertion.
- **The independence levers, ranked:** deterministic external check > different/diverse-model judge >
  independent re-derivation by the same model > same-model cold review > same-model same-context
  self-review (worst).

## Conclusion

Adopt a layered impl-judge model `(c) ⊃ (b) ⊃ (a)` and the judge≠producer-model lever. See
`conclusion.md`; landed as ADR-0016 and the `mission/deliver/impl-judge` + `impl-producer` +
`conductor` specs.
