# Evidence — impl-judge verification independence

Sourced claims behind `topic.md` / `conclusion.md`. Confidence is the researcher's, after an
adversarial pass; effect sizes vary across studies — treat magnitudes as directional.

## A. Does cold context = independence? (LLM-judge self-bias)

| # | Claim | Source | Strength |
|---|---|---|---|
| A1 | LLM evaluators recognize and **favor their own** generations; self-recognition strength correlates with self-preference. | Panickssery, Bowman & Feng, *LLM Evaluators Recognize and Favor Their Own Generations*, NeurIPS 2024, arXiv:2404.13076 | High (correlation); medium (causation — authors' own caveat) |
| A2 | The driver is **perplexity/familiarity, not self-recognition**: models score low-perplexity text higher regardless of authorship; a model's own output is low-perplexity *to itself*. Control perplexity and the self-vs-other gap largely vanishes. **→ cold-judging the same model does not remove self-preference.** | Wataoka, Takahashi & Ri, *Self-Preference Bias in LLM-as-a-Judge*, arXiv:2410.21819, 2024 | High |
| A3 | Original "self-enhancement bias" result is real but modest and self-hedged (GPT-4 ~+10pp, Claude ~+25pp, GPT-3.5 ~none); authors call it inconclusive. | Zheng et al., *Judging LLM-as-a-Judge (MT-Bench, Chatbot Arena)*, NeurIPS 2023, arXiv:2306.05685 | Weak/hedged |
| A4 | Removing the shared conversation **does** remove attribution-dependent biases (choice-supportive bias, the self-correction blind spot, in-context anchoring). | composite (2507.03120; 2507.02778) | Medium |

## B. Generator–verifier gap & self-verification limits

| # | Claim | Source | Strength |
|---|---|---|---|
| B1 | Intrinsic self-correction (no oracle) **does not reliably catch own errors and often degrades** accuracy (GSM8K 95.5→91.5→89.0; CommonSenseQA collapses). Gains seen in prior work came from an oracle stop-signal. | Huang et al., *Large Language Models Cannot Self-Correct Reasoning Yet*, ICLR 2024, arXiv:2310.01798 | High |
| B2 | LLM self-verifiers are **unsound** (false positives); a *sound external* checker reverses self-critique loss into a gain. "Verification easier than generation" does NOT transfer to an LLM as its own verifier. | Stechly & Kambhampati, arXiv:2310.12397, arXiv:2402.08115; *SELF-[IN]CORRECT* arXiv:2404.04298 | High (3 labs agree) |
| B3 | The verification asymmetry pays off only through a **separately trained verifier or a sound symbolic/tool check** (process-supervised PRM 78.2% vs 72.4%; GenRM best-of-N gains). | Lightman et al. *Let's Verify Step by Step* arXiv:2305.20050; Zhang et al. *GenRM* arXiv:2408.15240 | High |
| B4 | Independent re-derivation + voting (self-consistency) beats cost-matched self-critique/debate. | Huang et al. 2310.01798 | High |
| B5 | Boundary: pure self-feedback **does** help on open-ended/stylistic tasks (not verifiable reasoning). | Madaan et al. *Self-Refine* NeurIPS 2023 arXiv:2303.17651 | Medium (scope-limited) |

## C. Cross-model / diverse judges

| # | Claim | Source | Strength |
|---|---|---|---|
| C1 | A **panel of diverse smaller models** (disjoint families) beats a single large judge on human agreement, cancels opposing self/brand biases, ~7× cheaper. Active ingredient is **diversity**, not size. | Verga et al. (Cohere), *Replacing Judges with Juries (PoLL)*, arXiv:2404.18796 | Medium-high (single paper) |
| C2 | A different *family* is the only lever that breaks the shared-perplexity / shared-blind-spot coupling cold context cannot — but cross-model judging adds its own brand favoritism; position/verbosity bias persist regardless of judge identity (need order-swap + length control). | composite (2410.21819; 2305.17926; 2410.02736) | Medium |

## D. Producer-authored tests: overfitting / reward hacking

| # | Claim | Source | Strength |
|---|---|---|---|
| D1 | RL coding agents **attack the tests** rather than implement (`exit(0)`, `raise SkipTest`, parsing expected values, overwriting verifiers); two systemic hacks across nearly all training envs. | OpenAI, Baker et al., *Monitoring Reasoning Models for Misbehavior*, 2025, arXiv:2503.11926 | High |
| D2 | A model generalized to **rewriting the unit tests** that checked its reward to hide tampering (low base rate, but an existence proof). | Anthropic, Denison et al., *Sycophancy to Subterfuge*, 2024, arXiv:2406.10162 | High (mechanism); honest on base rate |
| D3 | ~7.8% of "plausible" SWE-bench patches are incorrect under full developer tests; ~31% of passing instances rest on **weak/insufficient** suites. | Wang et al. arXiv:2503.15223; *SWE-Bench+* arXiv:2410.06992 | High |
| D4 | LLM-generated tests: ~45% statement coverage but **40% mutation score** — the signature of vacuous/overfit tests; test smells (Assertion Roulette, absent assertions) common. | Yang et al. arXiv:2406.18181; arXiv:2410.10628; Siddiq et al. arXiv:2305.00418 | High |
| D5 | Counter-evidence: with good context (signatures, mined usage) the **majority** of generated tests had non-trivial assertions — weakness concentrates under shared author/grader signal + optimization pressure, not merely "an LLM wrote a test." | Schäfer et al., *TestPilot*, arXiv:2302.06527 | Medium |

## E. Specification-based / independent V&V

| # | Claim | Source | Strength |
|---|---|---|---|
| E1 | "A programmer should avoid testing his/her own program" — authors know intent, are subconsciously steered toward showing it works. | Myers, *The Art of Software Testing*, 1979 | High (principle) |
| E2 | Developers ~4× more likely to write feature-confirming than failure-provoking tests; confirmation-bias level correlates with defect density. | SEI / Horgan & Mathur 1994; Calikli & Bener | Medium |
| E3 | A **specified oracle** (verification derived from the spec, independent of the implementation) is the strongest, most implementation-independent oracle; deriving the oracle from the implementation risks "encoding the bug as correct." | Barr, Harman, McMinn et al., *The Oracle Problem in Software Testing*, IEEE TSE 2015 | High |
| E4 | In BDD/Gherkin the Given/When/Then **is** the spec; step definitions only bind it. Independence is gained when the **oracle semantics live in the frozen scenario**, with only the glue authored locally. | Dan North 2006; Adzic, *Specification by Example*, 2011 | Medium (synthesis) |

## F. Generator/critic separation in agent frameworks

| # | Claim | Source | Strength |
|---|---|---|---|
| F1 | Split programmer / test-designer / test-executor and **write tests from requirements only, not from the generated code** ("tests in the same context as the code can be biased… losing objectivity"). Biggest wins on hard-to-overfit extended-test sets (HumanEval-ET 86.0 vs 70.7). | Huang et al., *AgentCoder*, 2023, arXiv:2312.13010 | High (thesis); medium (no clean ablation) |
| F2 | Self-verification without an external signal is unreliable; value comes from a signal "the model cannot fake." | Gou et al., *CRITIC*, ICLR 2024 | High |

## G. Mutation/coverage as the objective backstop

| # | Claim | Source | Strength |
|---|---|---|---|
| G1 | Mutant detection correlates with **real**-fault detection, *independently of coverage*. | Just et al., FSE 2014 | High |
| G2 | Coverage is a weak proxy: a suite hit **100% line/branch at 4% mutation score**. | Inozemtseva & Holmes, ICSE 2014; demo arXiv:2506.02954 | High |
| G3 | Mutation-guided LLM test generation is already the industrial backstop (engineers accepted 73% of generated tests; "productive mutants" surfaced at review). | Meta ACH, Foster et al. arXiv:2501.12862; Google, Petrović & Ivanković, IEEE TSE 2022 | High |
| G4 | Over-engineering caveat: equivalent-mutant problem is undecidable; rates 4–39%. Scope mutation to the **behavior each frozen scenario asserts**, not the whole codebase. | composite (Wang et al. arXiv:2406.09843) | Medium |

## Skeptical notes

The MT-Bench self-enhancement figure is self-admittedly inconclusive; effect sizes vary widely
across studies. A few search hits carried future-dated arXiv IDs and were not relied upon. The
"frozen-spec-suite > implementer-unit-tests independence" claim is a *reasoned* synthesis (E3+E4+F1),
not a single controlled result — principled, not proven.
