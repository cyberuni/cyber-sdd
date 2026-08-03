# Documentation craft above the page level (August 2026)

## Question

Our doc-spec system (quill) specifies each page individually: required claims, a within-page reader
control-flow graph, and boolean acceptance scenarios. Two limits surfaced in practice.

1. **A per-page contract cannot see the corpus.** A documentation site has an expected reading order
   and cross-page relations (prerequisite / complementary / taken-up-later), and a page's wording
   must reflect its position — a prerequisite claim marked as given, an unmet claim restated in
   full, a later claim marked as prospective rather than pre-empted.
2. **A within-page CFG captures the logic of information flow but does not by itself produce
   well-crafted prose.**

So: what governs documentation quality *above* the page, and **which of it is solid enough to encode
as an automated gate criterion** rather than as guidance? The last clause is the point of the
dossier — the risk being addressed is encoding practitioner folklore as a check.

## Scope

**In** — cross-page structure and ordering frameworks; the linguistics of given/new and cohesion, and
its empirical status; craft-level guidance for explanatory prose; site-level quality models;
evidence on deliberate repetition across a documentation set.

**Out** — within-page typography and formatting; readability metrics (Flesch et al.); localization;
API-reference generation; SEO; anything about *tooling*.

## Source angles

- Framework authors' own writing (Diátaxis, EPPO) — primary, to fix what each actually claims
- Psycholinguistics of comprehension — primary papers, for the empirical floor
- Craft guidance with a stated method (Gopen & Swan; Williams)
- Practitioner style guides from organizations operating documentation at scale (Google)
- Instructional-design research with controlled studies (Carroll's minimalism)

## Findings

### The given/new mechanism is real, measurable, and narrower than "avoid duplication"

Haviland & Clark (1974) is the empirical floor (E01–E03). Comprehension is faster when a sentence's
given information has a **direct antecedent** in prior text: 835 ms vs 1016 ms in Experiment I, a
181 ms penalty for making the reader build a bridging inference; reproduced in Experiments II and
III.

The result that matters most for us is the **null**: Experiment II was run specifically to rule out
a repetition explanation, and the repetition manipulation produced 1033 ms with repetition vs
1014 ms without — a 19 ms difference the authors describe as "in the wrong direction" (E03).

**Verbatim repetition is not what helps a reader. A retrievable antecedent is.** That splits our
criterion cleanly: the defect is not that a claim appears twice, it is that a passage presupposes
something the reader has no way to retrieve — or re-presents as new something already given.

### Craft principles exist and their own authors refuse to make them rules

Gopen & Swan (1990) give the most concrete formulation of old-before-new (E04) and then explicitly
withhold rule status (E05): *"None of these reader-expectation principles should be considered
'rules.' … There can be no fixed algorithm for good writing."* On the specific principle we would
most want to check, they pre-empt the oversimplification by name: *"No such rule is possible."*

This is the strongest available answer to the second limit. A CFG plus a claim list will not produce
well-crafted prose because the remaining craft is a system of *simultaneous, defeasible* reader
expectations — the authors' own reason is that too many operate at once for any one to be
mechanically decidable, and any of them can be violated to good effect.

### Whether redundancy helps depends on the reader, and the effect reverses

McNamara & Kintsch (1996) and the reverse-cohesion literature (E06): low-knowledge readers benefit
from high-coherence text — more explicit, more redundant, gaps filled — while high-knowledge readers
can perform *better* on deep measures with low-coherence text, because the gaps force them to
integrate with prior knowledge.

So "state it once" and "restate it for the arriving reader" are both right, for different readers.
A doc spec that already declares its **audience** carries the input that decides which.

### The site-structure frameworks do not answer the ordering question

Diátaxis is a typology of documentation *kinds*, not an information architecture: it partitions by
what the reader is doing, and its own front page does not prescribe order or navigation among the
four (E07). Its stated evidence is adoption — *"proven in practice… adopted successfully in hundreds
of documentation projects"* — which is practitioner authority, not measurement (E08).

EPPO (Baker) addresses arrival-anywhere directly and is the closest framework to our problem: topics
are **standalone**, **establish their context**, **assume the reader is qualified**, **stay on one
level**, and **link richly** (E09). It is argument from practice, with no empirical apparatus
offered (E10) — but it converges with Haviland & Clark from the other direction, and with Google's
style guide (E11), which tells authors to prefer in-context help over a link for short content:
*"if a few sentences of basic information is all your readers need, then it's better to provide that
context and save your readers the trip."*

Minimalism (Carroll) is the one framework in this set with real controlled-study grounding (E12),
and it cuts *non-task* content — it is not a licence to cut orienting redundancy.

## Contradictions

- **EPPO / standalone topics vs. DITA-style single-sourcing.** One says every topic repeats what it
  needs; the other treats duplication as a maintenance defect to be factored out into reuse. Both
  are practitioner positions; neither cites evidence. Unresolved in the field.
- **Minimalism (cut) vs. reverse cohesion (novices need explicit coherence).** Resolvable by
  audience, but the two literatures do not reconcile themselves.
- **Craft guidance vs. gate criteria.** Gopen & Swan explicitly deny that their principles can be
  algorithms. Any encoding of old-before-new as a boolean check contradicts its own source.

## Open questions

- Not yet covered as primary sources: Prince (1981) taxonomy of assumed familiarity; Halliday &
  Hasan *Cohesion in English*; Hoey on text patterns; Information Mapping (Horn); the DITA
  specification; Rosenfeld & Morville; NN/g on progressive disclosure. Their positions are asserted
  in this dossier only where a source above states them.
- **No site-level documentation quality rubric with empirical grounding was found.** Everything at
  corpus level is practitioner lore. This is a gap, not an absence of search.
- **No empirical study was found on cross-page repetition in documentation sets** specifically — the
  coherence literature is within-text. The transfer from within-text coherence to across-page
  repetition is an inference, and should be marked as one wherever it is relied on.
- Williams's *Style* was not consulted directly; the "known-new contract" is attributed here only
  via Gopen & Swan's equivalent formulation.

## Sources consulted

- Haviland & Clark, "What's new? Acquiring new information as a process in comprehension", *JVLVB*
  13, 512–521 (1974) — https://web.stanford.edu/~clark/1970s/
- Gopen & Swan, "The Science of Scientific Writing", *American Scientist* 78 (1990) —
  https://www.gatsby.ucl.ac.uk/~pel/misc/gopen_swan.pdf
- McNamara & Kintsch, "Learning from texts: Effects of prior knowledge and text coherence",
  *Discourse Processes* 22 (1996) — https://eric.ed.gov/?id=EJ538963; McNamara et al., "Are good
  texts always better?", *Cognition and Instruction* 14(1) —
  https://www.tandfonline.com/doi/abs/10.1207/s1532690xci1401_1
- Diátaxis — https://diataxis.fr/
- Baker, *Every Page is Page One* — https://everypageispageone.com/series/topic-characteristics/
- Google developer documentation style guide, cross-references —
  https://developers.google.com/style/cross-references
- Carroll, *The Nurnberg Funnel* (MIT Press, 1990); *Minimalism Beyond the Nurnberg Funnel* —
  https://mitpress.mit.edu/9780262512954/minimalism-beyond-the-nurnberg-funnel/
