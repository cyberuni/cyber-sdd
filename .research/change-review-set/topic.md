# Change Review Set (August 2026)

## Question

A change to a rule lands in one document and not in its siblings. Issue #453 names the shape:
a rule propagated to *some* members of a set and not others, **with the set never enumerated**.

What set does a change belong to, and can that set be derived rather than remembered?

Four candidate sets are named in #453:

- the **skill folder** — `SKILL.md` + `README.md` + scripts + fixtures under one directory
- the **layer set** — the same concept stated in a shipped skill, in the spec-corpus node that
  specifies it, and in the public docs page that explains it
- the **citation set** — every document referencing the changed claim, including untouched ones
- the **cross-link set** — sibling documents defining the same term, which now disagree

The sub-questions this dossier settles:

1. Which of these sets are **mechanically derivable** from what the repo already carries, and
   which require a **declaration** someone writes by hand?
2. Can the **existing blast-radius machinery** (`blast-estimate`, which computes a level over work
   areas from a touch-set) be extended to answer this, or is it a distinct calculation over a
   different graph?
3. **How does the answer degrade?** A set that is *nearly* right but reads as authoritative and is
   silently short is worse than no set at all. What shape must the output take so a short answer
   cannot masquerade as a complete one?
4. What does **wrap-safety** cost in this corpus? A line-oriented search already missed a real site
   twice inside one change request.
5. How does this relate to the **screaming-architecture** layout rule (one capability per node)
   applied one level down — "one concept stated in one place"?

## Scope

**In scope:**

- Measurement against this repository's actual tree and git history at `a41b0fa9` (2026-08-11) —
  every claim in `evidence.md` is a measured or executed fact about this corpus, not a survey.
- The shipped machinery that already computes something set-shaped: `touch-set-correction`'s
  `fileToNode` / `discoverLayouts`, `blast-estimate`, `check-retired-terms`,
  `check-scenario-overlap`, `concept-index`, `resolve-governances`, `formation-loop`.
- The evidence base of #437 / PR #444 — ten gate rounds, four of them lost to this defect class.
- The failure-direction question: which candidate sets fail by *under*-generating (silent and
  dangerous) and which by *over*-generating (loud and merely useless).

**Out of scope:**

- Building the mechanism. #453 is an investigation; the recommendation here is a proposal awaiting
  the owner's decision, not a design that has been ratified.
- The general documentation-quality question of whether restating a claim is a defect. That is
  settled elsewhere and cited here rather than reopened — see `.research/documentation-craft/`.
- Cross-repository federation. Every set considered here is intra-repo.
- Code-level dependency analysis. Produced/consumed symbol dependency is `ssa-lowering` /
  `collision-ladder` territory and the boundary is deliberate.

## Source angles

- **Executed** — the shipped `fileToNode` run against real repository paths with the real declared
  `sdd` layout, rather than read off its source.
- **Measured** — git history over skill-folder edits; corpus-wide counts of wrapped inline spans;
  line-oriented versus whitespace-normalized phrase reach.
- **Read** — the boundaries sections of the shipped engines, which is where each one states what it
  refuses to answer. Those refusals are the load-bearing input: they say what a new calculation may
  not fold into an existing one.
- **Prior art in this repo** — `.research/documentation-craft/` (cross-page claim overlap),
  `.research/use-case-elicitation/` (the CR whose gate rounds produced the evidence).
