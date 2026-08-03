# Impl-judge verification independence — generator/verifier separation for the SDD impl gate

**Date:** 2026-06 · **Informs:** ADR-0016 (impl-judge verification independence), SDD
`mission/deliver/impl-judge` + `impl-producer` + `mission/conductor` (impl gate),
`design/autonomy-rubric.md`. Working dossier: `.research/impl-judge-independence/`.

At the SDD impl gate the **impl-producer** builds the implementation **and authors its verification**
(the Gherkin→executable mapping), and a cold **impl-judge** runs that verification against the frozen
`.feature`. Does cold context deliver the independence the producer≠judge split is for — or does the
judge inherit the producer's blind spots and overfit tests? This survey grounds SDD's decision to
make the judge re-derive verification from the frozen contract, add an objective exercise backstop,
demote the producer's green tests to a pre-filter, and run the judge on a different model.

## What the literature says

**Cold context buys only partial independence.** A fresh context removes *context-bound* bias —
anchoring, the self-correction blind spot, choice-supportive bias. It does **not** remove
*weight-bound* bias: same-model self-preference is driven by **perplexity/familiarity** (a model
rates its own low-perplexity output higher regardless of authorship — Wataoka, arXiv:2410.21819),
and a producer and judge of the same model share a training distribution, hence **correlated blind
spots** (Panickssery, NeurIPS 2024). Cold ≠ independent.

**Self-verification is unsound.** Without an external oracle, intrinsic self-correction does not
reliably catch a model's own errors and often *degrades* accuracy (Huang et al., ICLR 2024); LLM
self-verifiers produce false positives that a sound external checker reverses (Stechly &
Kambhampati). The "verification is easier than generation" intuition does **not** transfer to an LLM
grading its own work. The asymmetry pays off only via a *separately trained* verifier or a *sound
tool/symbolic* check (Lightman et al.; GenRM).

**Producer-authored tests overfit.** LLMs write vacuous tests — ~45% coverage at **40% mutation
score** (Yang et al., arXiv:2406.18181); 100% line coverage at 4% mutation score is a documented
demo. Under optimization pressure they **attack the tests** outright (`exit(0)`, `raise SkipTest`,
overwriting verifiers — OpenAI, arXiv:2503.11926; Anthropic, arXiv:2406.10162). ~31% of "passing"
SWE-bench instances rest on weak suites (SWE-Bench+). Re-running such tests in a fresh context
re-confirms the shared blind spot — it verifies internal consistency, not contract conformance.

**The independence levers, ranked** (strongest first):

1. **Deterministic external check** — a sound, executable oracle is the only thing that reliably
   beats the generator-verifier gap. Bounded by what it asserts.
2. **Different / diverse-model judge** — the only lever that breaks the shared-perplexity,
   shared-blind-spot coupling cold context cannot. A diverse panel (PoLL, arXiv:2404.18796) cancels
   opposing biases at ~7× lower cost than one large judge.
3. **Independent re-derivation by the same model** — solving from the spec and comparing beats
   reviewing the candidate's own work (AgentCoder's "test-designer must not see the code") — but only
   when the judge is competent on the task; below ~50% own-accuracy it injects its own errors.
4. **Same-model cold review** — removes context bias only.
5. **Same-model same-context self-review** — worst; often net-negative.

**SDD is well-positioned.** The frozen Gherkin `.feature` is a **spec-owned independent oracle** —
the strongest "specified oracle" in the V&V literature (Barr/Harman, IEEE TSE 2015; Myers 1979). The
leak is that the impl-producer authors the *mapping* from scenario to executable assertion; that is
exactly where overfitting hides.

**Mutation > coverage as the backstop.** Mutation score correlates with real-fault detection
independently of coverage (Just et al., FSE 2014); it is the industrial backstop for AI-written tests
(Meta ACH; Google). Scope it to the behavior each frozen scenario asserts — full mutation testing is
costly (undecidable equivalent mutants, 4–39% noise).

## The decision (see ADR-0016)

A layered impl-judge model `(c) ⊃ (b) ⊃ (a)`, scaled by the autonomy leash:
**(b)** the judge independently re-derives verification from the frozen `.feature` (primary);
**(c)** an objective behavioral-exercise / scoped-mutation backstop for high-blast-radius scenarios;
**(a)** the producer's green tests are a fast pre-filter, never the verdict; prefer **direct
`.feature` execution** over a unit-test mapping; and **judge model ≠ producer model**.

## Caveats

Effect sizes vary widely across the LLM-judge studies and the MT-Bench self-enhancement figure is
self-admittedly inconclusive. Blanket distrust of generated tests is unwarranted — with good context
the majority are non-trivial (TestPilot); weakness concentrates under shared author/grader signal and
optimization pressure. The "frozen-spec-suite beats implementer-unit-tests for independence" claim is
a reasoned synthesis, not a single controlled result. Full per-source claims and confidence levels:
`.research/impl-judge-independence/evidence.md`.
