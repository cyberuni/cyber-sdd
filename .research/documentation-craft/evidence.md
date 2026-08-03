# Evidence — documentation craft above the page level

Sourced claims behind `topic.md` / `conclusion.md`. **Strength** separates measurement from
practitioner authority, because the consuming decision is *what may become an automated gate check*.

Legend for source type: **experiment** (controlled study with reported statistics) · **framework**
(an author's own normative statement) · **style guide** (organizational practice) · **secondary**
(reported through another source, not read directly).

## A. Given/new comprehension — the empirical floor

| # | Claim | Source | Type | Strength |
|---|---|---|---|---|
| E01 | Comprehension is measurably faster when a sentence's Given information has a **direct antecedent** in the preceding text than when the reader must build a bridging inference. **The clean estimate is Δ137 ms (Exp. II, repetition controlled — see E03); Exp. I's Δ181 ms confounds antecedent-finding with word repetition** and should not be the quoted figure: **835 vs 1016 ms** (Exp. I). Replicated: **1031 vs 1168 ms**, Δ137, minF′(1,23)=15 (Exp. II); **1023 vs 1097 ms** with a Negative-antecedent control at 1088 ms (Exp. III). | Haviland & Clark 1974, *JVLVB* 13:512–521 (read directly) | experiment | **High** — three experiments, consistent direction, control condition included |
| E02 | The authors' own statement of the mechanism: the listener "first searches memory for antecedent information that matches the sentence's Given information; he then revises memory by attaching the New information to that antecedent." | ibid., abstract | experiment | High |
| E03 | **Verbatim repetition is not the active ingredient — established by design, not by a null.** Exp. II rewrote every Indirect context so the critical noun *is* repeated while no existence is posited ("Andrew was especially fond of beer. / The beer was warm."). Repetition equalized across conditions, **the effect survives: 1031 vs 1168 ms, Δ137, minF′(1,23)=15.7, p<.001.** Authors: "mere repetition of the critical noun is not enough to account for the results of Experiment I." | ibid., Exp. II | experiment | **High** — a controlled replication; the load-bearing result for our design |
| E03b | Corroborating check, weaker: within Exp. III's 48 Direct-Antecedent pairs, 25 carried a surface repetition and 23 did not — **1033 ms with vs 1014 ms without, 19 ms "in the wrong direction", t(47)=1.72, n.s.** Repetition bought nothing even where the antecedent was already direct. | ibid., Exp. III | experiment | **Medium** — a non-significant within-condition contrast; corroborates E03, cannot carry the claim alone |

> **Consuming note.** E03 is why "a claim must appear in exactly one place" has no empirical warrant,
> and why "a passage must not presuppose what the reader cannot retrieve" does. The measured cost
> attaches to *unresolvable presupposition*, not to *recurrence* — and it is a controlled replication
> that establishes this, with E03b's null merely agreeing. Cite E03; do not lead with the null.

## B. Craft principles and their stated epistemic status

| # | Claim | Source | Type | Strength |
|---|---|---|---|---|
| E04 | The old-before-new placement principle, as its authors state it: *"Put in the topic position the old information that links backward; put in the stress position the new information you want the reader to emphasize."* And: *"In the stress position the reader needs and expects closure and fulfillment; in the topic position the reader needs and expects perspective and context."* | Gopen & Swan 1990 (read directly, PDF) | framework | High as an accurate statement of the principle |
| E05 | **Its authors explicitly deny it can be a rule.** *"None of these reader-expectation principles should be considered 'rules.' Slavish adherence to them will succeed no better than has slavish adherence to avoiding split infinitives… There can be no fixed algorithm for good writing"* — because too many expectations operate at once, and any can be violated to good effect. On the specific oversimplification we would be tempted by: *"No such rule is possible."* | ibid. | framework | **High** — direct quotation; decisive against encoding as a boolean check |
| E06 | **Reverse cohesion effect.** Low-knowledge readers benefit from high-coherence (explicit, gap-filled, more redundant) text; high-knowledge readers can perform better on deep/open-ended measures after low-coherence text, because gaps force integration with prior knowledge. | McNamara & Kintsch 1996, *Discourse Processes* 22:247–288; McNamara et al., *Cognition and Instruction* 14(1) | experiment (via abstracts/ERIC record — **not read in full**) | **Medium** — well-replicated and widely cited, but consulted here secondhand |

## C. Documentation frameworks — what each actually claims

| # | Claim | Source | Type | Strength |
|---|---|---|---|---|
| E07 | Diátaxis is a **typology of documentation kinds** (tutorial / how-to / reference / explanation) partitioned by what the reader is doing. Its front page does **not** prescribe an order, a navigation scheme, or a sequencing rule among the four, and does not address whether content may recur across them. | diataxis.fr (fetched) | framework | Medium — absence observed on the front page; deeper pages not exhaustively read |
| E08 | Diátaxis's own stated warrant is **adoption**, not measurement: *"a widely-adopted, pragmatic and systematic approach"*, *"proven in practice. Its principles have been adopted successfully in hundreds of documentation projects."* | ibid. | framework | High (direct quotation) — and note this is an authority claim, not evidence |
| E09 | EPPO topic characteristics: **standalone** (no linear dependency on other topics), **specific limited purpose**, **establish their context**, **assume the reader is qualified**, **stay on one level**, **conform to a type**, **link richly**. Premise: readers arrive at any page as their entry point. | Baker, *Every Page is Page One*; everypageispageone.com/series/topic-characteristics/ | framework | Medium-High for the characteristics; the canonical list is in the book, and the site archive page paraphrases |
| E10 | EPPO offers **no empirical apparatus** — it is argument from practice. No study is cited on the site pages consulted. | ibid. | framework | Medium (absence of evidence observed, not proven absent) |
| E11 | Google's style guide instructs authors to **prefer in-context help over a cross-reference** for short content: *"When possible, provide help in context rather than linking elsewhere… Define a term. Briefly explain a concept. Provide a couple of steps."* And: *"if a few sentences of basic information is all your readers need, then it's better to provide that context and save your readers the trip outside of our documentation."* It does not advise assuming the reader has visited another page. | developers.google.com/style/cross-references | style guide | Medium — practitioner, but from an organization operating documentation at very large scale; converges with E01/E09 |
| E12 | **Minimalism has genuine controlled-study grounding**: minimal manuals outperformed conventional "systems approach" manuals on mastery and learning speed; the programme grew out of one-on-one observation of trainees at IBM. Its four characteristics are brevity, focus on real tasks, error recognition/recovery, and guided exploration. What it cuts is **non-task** content. | Carroll, *The Nurnberg Funnel* (1990); *Minimalism Beyond the Nurnberg Funnel* (MIT Press) | experiment | Medium — **secondary**; the studies are real but were not read directly here |

## D. Scope limit — every source above predates LLM judges

| # | Claim | Source | Type | Strength |
|---|---|---|---|---|
| E16 | The primary sources date to **1974 (Haviland & Clark), 1990 (Gopen & Swan, Carroll), 1996 (McNamara & Kintsch)**. The "no fixed algorithm" argument (E05) is aimed at two targets available in 1990: a human author applying rules while composing, and a mechanical checker. Its stated reasons are (i) *"too many reader expectations are functioning at any given moment for structural decisions to remain clear and easily activated"* and (ii) any expectation *"can be violated to good effect"*. | Gopen & Swan 1990 (read directly) | framework | High (quotation); the *inference* below is ours |
| E17 | **Reason (i) does not transfer to an LLM judge.** It is a claim about a decision procedure's capacity to hold many simultaneous expectations — the specific limit an LLM does not have. Reason (ii) does transfer, and constrains the *process* rather than the possibility: a judged criterion must admit a deliberate-violation defense. | inference from E16 | — | **Medium** — our reasoning, not a finding; falsifiable by calibration (see D2) |
| E18 | Related in-repo evidence, already gathered: LLM self-verifiers are **unsound** as their own critics, while a **separate** verifier reverses the loss into a gain; and self-preference persists under cold context because it tracks perplexity, not self-recognition. → a craft judge must be a separate agent, and its criteria must be externally anchored. | `.research/impl-judge-independence/evidence.md` B1–B3, A2 | experiment | High (as recorded there) |

> **Consuming note.** E05 rules out a *lint*. It does not rule out a *judge*. The distinction the
> 1990 sources could not draw is between a fixed algorithm and a nondeterministic reader-simulator
> that can be given instructions and a process — which is what changes the design space here.

## D2. What would falsify the E17 inference

A judged craft criterion is only admissible if it is **calibrated against the corpus it will
police**: run it over documents the team already considers good and already considers weak. A
criterion that fires on an accepted document, or that cannot separate the two sets, is miscalibrated
and must not gate. This is the empirical test E17 currently lacks, and it is cheap to run.

## E. Gaps — recorded so they are not mistaken for findings

| # | Claim | Status |
|---|---|---|
| E13 | No **site-level** documentation quality rubric with empirical grounding was located. Everything found at corpus level is practitioner lore. | Open — searched, not found; not proven nonexistent |
| E14 | No empirical study located on **cross-page repetition in documentation sets**. The coherence literature (E01, E06) is within-text. Applying it across pages is an **inference**, and every use of it below is marked as such. | Open — this is the weakest joint in the dossier |
| E15 | Not read directly: Prince (1981); Halliday & Hasan; Hoey; Information Mapping (Horn); the DITA specification; Rosenfeld & Morville; NN/g progressive disclosure; Williams *Style*. | Not covered — no claim in `conclusion.md` rests on them |
