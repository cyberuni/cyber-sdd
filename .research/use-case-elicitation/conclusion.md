# Conclusion — Use-Case Elicitation

## Question

What does the requirements-elicitation field mean by "use case," does SDD's `## Use Cases`
section match it, which elicitation techniques produce a falsifiable artifact an agent judge can
grade, what do shipped agent-spec tools actually do at discovery, and what — concretely — is
worth taking for SDD's spec creation?

## Verdict

**SDD's `## Use Cases` section is not wrong, it is misnamed** — it does the job of a
screaming-architecture entry-point table (E34), a real and legitimate concern, but it is not a
use case in the requirements-engineering sense (E01–E06) and cannot do that job. The field's
actual discovery techniques split cleanly into two families: **structured-artifact techniques**
that a cold reviewer can grade for a missing or contradicted element, and **facilitation
rituals** whose value is realized live and whose absence a judge cannot detect from the finished
document alone. SDD's spec gate is a cold, non-live judge (`sdd:sdd-spec-judge`), so it can only
ever grade the first family — this is the design constraint every recommendation below is built
around. Shipped agent-spec tools split the same way: spec-kit's `/clarify` is the most
machine-runnable discovery mechanism found in this survey (E25), but it clarifies the *document*,
not the *diagnosis* — it never asks whether the requester's framing of the problem is right
(E26). That is precisely SDD's own gap, restated in someone else's tooling.

### 1. What the field means by "use case," and the mismatch

Both Jacobson's Use Case 2.0 (E01–E02) and Cockburn's *Writing Effective Use Cases* (E04) define
a use case as **actor + goal**: a named actor pursuing a goal, with a main success scenario and a
set of *extensions* — the alternate paths, errors, and divergences the actor might hit. The
extensions field is where "who hits it, what were they doing, what did they expect" lives; it is
the part of the format that forces enumerating what goes wrong, not just the happy invocation.
Neither writer's template is itself a discovery technique (E06) — it presupposes the actor and
goal are already known and specifies how to write them up once known.

`sdd:spec-format-governance`'s `## Use Cases` (E34) defines the section as one row per **entry
point** — trigger / inputs / outcome, named to its implementation surface (a CLI verb, a
function, an endpoint) — explicitly to keep spec, suite, and code on "one screaming structure."
That is an **API-surface inventory**, structurally closer to an interface manifest than to a
Jacobson/Cockburn use case. It carries no actor, no goal, and — critically — no field for
extensions or failure modes, because "when, and with what, is this invoked?" is a narrower
question than "who is trying to do what, and what can go wrong for them?" The section is doing
real, legitimate work (module correspondence, discoverability) that has nothing to do with
requirements discovery. The mismatch is the shared name pulling two different jobs into one box:
a reader who sees "Use Cases" reasonably expects Jacobson/Cockburn's actor-and-extension shape and
gets an entry-point table instead — and a producer who has satisfied the entry-point table
reasonably believes the use-case diagnostic is done, when only the surface inventory is.

### 2. Falsifiable artifacts vs. facilitation rituals — the crux

An artifact is **falsifiable** here if a reviewer — human or cold agent judge — can point at it
and say something is *wrong*, not merely that something is *absent*. This distinction is the
whole design constraint for SDD, because the spec gate is a cold judge with no access to whatever
live conversation produced the spec.

**Falsifiable (a judge can grade the artifact alone):**
- **Jacobson/Cockburn's use-case template** (E01, E04) — a judge can check a stated precondition
  has a matching extension, that the main scenario reaches "sea level" rather than staying at a
  UI-click level of detail, or that a stated stakeholder interest has no corresponding guarantee.
- **spec-kit's `/clarify`** (E25) — fixed nine-category taxonomy, a hard 5-question cap, MC/short
  answers, and mechanical fold-back into the spec with a timestamped Clarifications section. A
  judge (or the tool itself) can re-run the same taxonomy scan and check every category resolved
  to Clear/Resolved/Deferred with a reason, not silently Outstanding.
- **`[NEEDS CLARIFICATION]` / `<!-- open: -->` markers** (E24, independently converged on by
  spec-kit and SDD) — greppable, so "how many gaps remain" is a mechanical count, not a judgment
  call.
- **EARS notation** (E28) and Gherkin's boolean `Then` — sentence-level testability disciplines. A
  judge can check a requirement's trigger/response boundary is stated, but not whether the
  requirement is the *right* one to have written.
- **Google's "Alternatives Considered" and Rust's "Drawbacks"/"Rationale and Alternatives"**
  (E20, E22) — a reviewer can name a missing alternative and force it addressed, which is
  checkable without deep domain expertise in the specific proposal. Rust's own retrospective
  (E22) is an important caveat: the section existing and the section being *substantive* are
  different bars, and only reviewer scrutiny (not the template) enforces the second.
- **Matt Wynne's red Question card** (E17) — the single most transferable idea in this survey.
  It turns "we don't know yet" into a visible, checkable artifact state (a card on the table)
  rather than a silent gap a reader has to notice is missing.

**Facilitation rituals (value realized live; a judge cannot detect their absence from the finished
document):**
- **Event Storming** (E12–E14) — a live, mixed-expertise sticky-note workshop; its output feeds
  a domain model but is not itself a spec.
- **JTBD Switch Interviews** (E07, E09) — require a skilled interviewer running a real
  conversation with a real customer; no formalized completeness rubric was found for the
  resulting forces diagram.
- **User Story Mapping** (E10–E11) — a group whiteboard session; its discovery power (surfacing
  gaps in the backbone) is realized through the live act of building the map together.
- **BMAD's Advanced Elicitation** (E30–E31) — explicitly a human-judgment loop: the agent
  proposes reasoning lenses, the human picks and accepts/discards; no automatic grading described.
- **This machine's `grilling` skill** (E36), Superpowers' brainstorming (E33), and
  `grill-with-docs` — all synchronous, one-question-at-a-time, human-in-the-loop by design; none
  describe a gradable output shape.
- **Impact Mapping** (E15–E16) sits in between: its Why→Who→How→What chain is more falsifiable
  than the pure workshop techniques (a reader can contest any link in the chain as unsupported),
  but it is still author/facilitator-produced with no mechanical completeness check found.

The practical rule this survey supports: **an SDD headless run (`sdd:sdd-automaton`, E40) can only
ever be handed the first family.** There is no live human to grill in that mode, so any technique
requiring one is out of reach for exactly the runs where the "accepted the CR's framing" failure
mode is most likely to go unchecked — the automaton has no one to push back on.

### 3. What shipped agent-spec tools actually do, and their known weakness

- **spec-kit** (E23–E26) has the most rigorous discovery mechanism surveyed: a fixed
  nine-category ambiguity taxonomy, a hard question cap, constrained answer formats, and
  mechanical fold-back (E25). Its weakness (E26) is scope: every category is a property of the
  spec draft (functional scope, data model, UX flow, non-functional attributes, integrations,
  edge cases, constraints, terminology, completion signals) — none is a property of the
  requester's *situation*. It clarifies the document it's given, never asks "why do you believe
  this is the problem," and cannot detect a coherently-written spec built on a wrong premise.
- **Kiro** (E27–E29) asks clarifying questions up front in its "Quick Spec" mode (confirmed) but
  does not publish the question taxonomy the way spec-kit does (unverified content) — weaker
  evidence, and its "Design-First" entry path (E29) is a named instance of the exact risk this
  dossier investigates: starting from an already-given technical design and writing requirements
  to match it, rather than testing the design's premise.
- **BMAD** (E30–E32) has the richest *technique menu* (Pre-mortem, Inversion, Red Team, Socratic
  Questioning, Stakeholder Mapping, and more) but applies it as a second pass over an
  already-drafted section, and its exit condition is human satisfaction, not a check (E31) — the
  PM agent is interrogating its own draft with the human as arbiter, not interrogating the
  requester's situation directly.

None of the three surveyed tools has a step that specifically targets "is the stated problem the
real problem" — all three operate on the artifact once a first framing exists. Spec-kit gets
closest by making that operation rigorous and reproducible; Kiro and BMAD keep it as a described
capability without a comparably inspectable mechanism.

### 4. What is worth taking for SDD, and what it costs

1. **Rename `## Use Cases` to something honest about what it is** (e.g. `## Entry Points` or
   fold it under `## Control Flow`'s framing) and, separately, decide whether SDD wants a real
   use-case-shaped section at all. *Cost:* a naming/structure change touches
   `spec-format-governance`, every spec that currently has a `## Use Cases` section, and
   `check-spec-structure`'s section-name check — a corpus-wide edit, not a local one. This is the
   cheapest, highest-clarity move and should happen regardless of anything else on this list.

2. **Add a spec-kit-style clarify taxonomy scoped to the CR's stated framing**, run once before
   the spec-producer's grill loop starts, with a small fixed category set (e.g. "who is the
   actor," "what were they doing when they hit this," "what did they expect instead," "what
   evidence backs the stated problem") and a hard question cap, folding answers into a
   `## Clarifications`-style block the spec-judge can grade for "resolved vs. left open." *Cost:*
   real design work — SDD would need its own taxonomy (spec-kit's nine categories are about the
   document, not the situation; a new SDD-specific set has to be authored and validated the way
   spec-kit's was) — but it is the one item on this list that degrades correctly to a headless
   run, because it is a scan-and-ask procedure an automaton can execute without a live human.

3. **Adopt the red-Question-card discipline** (E17): whenever the spec-producer cannot establish
   who hits a stated situation or what they expected, write it as a visible, greppable open
   question — not a silent gap — the same way `<!-- open: -->` already works for content gaps.
   *Cost:* nearly free — it is a convention on top of a marker mechanism SDD already has
   (`CONTENT_GAP`); the only real cost is deciding this specific category of gap (unverified
   actor/situation) gets its own marker so the spec-judge can specifically check for it, rather
   than being indistinguishable from any other content gap.

4. **Borrow Impact Mapping's Why→Who→How→What ordering as a required reasoning trace in the
   grill**, not as a workshop — have the spec-producer state, before writing `## Use Cases`, which
   actor's behavior must change and why, as a short prose chain the spec-judge can read and
   contest ("this Why doesn't support this Who," "this How doesn't follow from this Why").
   *Cost:* moderate. It adds a step to `spec-producer-governance` and a new thing for the
   spec-judge to grade, and it only works if the judge is actually equipped to contest a
   Why→Who chain — which requires the judge to reason about plausibility, not just check a
   section exists. Risk: without real judge scrutiny (the same risk Rust's own "Drawbacks"
   sections show in E22), this becomes a box that gets filled with plausible-sounding prose that
   never gets contested — hollow the same way a present-but-unchecked template section is hollow.

5. **Keep live grilling as the mechanism for the in-session conductor path, but stop treating it
   as sufficient for the headless path.** `wayfinder`'s own ticket taxonomy (E39) already draws
   this line locally — grilling is HITL by its own design, research is AFK. SDD's headless
   automaton (E40) currently runs the same `spec-producer-governance` grill-loop text without a
   live human to grill; nothing in the text currently degrades that gap into something else. This
   is not a new mechanism to add so much as a gap to name and close with items 2–4 above, which
   are designed to survive without a live participant. *Cost:* none by itself — it's the framing
   that motivates 2–4, not a separate deliverable.

**Not worth taking:**
- **Event Storming, JTBD Switch Interviews, User Story Mapping as literal workshop mechanics** —
  all three require a live, skilled facilitator and a room (real or virtual) of people; none
  described a completeness rubric a cold judge could apply. Their *underlying insight* (events
  precede actors in E12; the timeline-and-forces shape of E07) is worth remembering as design
  inspiration, but importing the mechanism itself would just relocate SDD's HITL/AFK gap rather
  than close it.
- **BMAD's full advanced-elicitation reasoning-lens menu as a standing SDD mechanism** — the menu
  is genuinely rich, but its exit condition is human satisfaction (E31), and SDD's cold-judge
  design has no equivalent of "the analyst is satisfied." A handful of lenses (Pre-mortem,
  Stakeholder Mapping) could inform what item 4's Why→Who→How reasoning trace should contain, but
  the loop mechanism itself does not fit a graded gate.
- **Kiro's Design-First entry path as a model to emulate** — it is a named instance of the failure
  mode under investigation (starting from a given design, writing requirements to match it), not
  a fix for it.
- **A full EARS-notation rewrite of SDD's `Then` clauses** — EARS and Gherkin's boolean `Then`
  already solve the same problem (sentence-level testability) that SDD's suite format already
  solves; adopting EARS specifically would be a lateral, not a forward, move, and neither notation
  touches the actual gap (both presuppose the requirement is already correctly identified, E28).

### 5. Where local skills already cover part of this

- **`grilling`** (E36) is the right shape for the in-session, human-present path, and nothing here
  argues for replacing it there — it is a well-formed, HITL, decision-tree interview exactly like
  BMAD's and Superpowers' equivalents. It is **not** the right shape for a headless
  `sdd-automaton` run, because it has no fallback for "no human is present" beyond
  `spec-producer-governance`'s existing "batches needs-input up its relay" behavior (E40), which
  defers rather than resolves.
- **`triage`**'s redundancy and prior-rejection checks (E38) are a narrow, mechanical, non-HITL
  discovery technique against one specific failure mode (the request already exists or was
  already rejected) — worth keeping in mind as a model for item 2 above: a scan an automaton can
  run alone, checking against something concrete (the codebase, `.out-of-scope/`) rather than
  asking a human.
- **`to-spec`** (E37) shows the failure mode in miniature: it explicitly does not interview,
  writes a real actor/goal/benefit format, and inherits whatever framing the prior conversation
  already settled — which is fine when that prior conversation *was* a grill, and is exactly the
  premise-acceptance risk this dossier investigates when it wasn't.
- **`wayfinder`**'s HITL/AFK ticket taxonomy (E39) is, of everything surveyed — local or
  external — the clearest existing statement of this dossier's central axis, and it should be the
  reference frame for any SDD redesign: before adding a technique, ask which of `wayfinder`'s four
  buckets it belongs in, and do not expect an AFK automaton to execute a HITL technique.

## Confidence

**High** on the Jacobson/Cockburn use-case definition and its mismatch with SDD's `## Use Cases`
(E01–E06, E34 — both sides are primary or triangulated secondary sources). **High** on spec-kit's
`/clarify` mechanism, fetched directly from the repo (E25–E26). **Medium** on Kiro's discovery
step — the existence of a clarifying-questions step is confirmed but its content is not published
(E27). **High** on BMAD's advanced elicitation being human-judgment-gated (E30–E31, fetched
directly). **High** on the local-skill findings (E35–E40) — all read directly from the files on
this machine and in this repo.

## Strongest supporting evidence

- spec-kit's `/clarify` (E25) and Rust's RFC retrospective (E22), read together, establish the
  falsifiability axis concretely: a fixed taxonomy with a hard question cap and mechanical
  fold-back is falsifiable in a way a template section that merely exists (and can go
  unenforced, per Rust's own admission) is not.
- `wayfinder`'s HITL/AFK ticket taxonomy (E39), already living on this machine, independently
  arrived at the same HITL/AFK split this dossier's field survey converges on — strong
  convergent evidence the distinction is real and actionable, not an artifact of how this
  dossier framed the search.
- The Jacobson/Cockburn actor+goal+extensions definition (E01, E04) versus
  `spec-format-governance`'s trigger/inputs/outcome definition (E34), read side by side, make the
  naming mismatch a direct textual comparison, not an inference.

## Strongest counterevidence / caveats

- Impact Mapping (E15–E16) complicates the clean falsifiable/ritual split: its Why→Who→How→What
  chain is more contestable than a pure workshop technique's output, without being as mechanically
  checkable as spec-kit's taxonomy. Recommendation 4 above treats it as a middle case rather than
  forcing it into either bucket, and that middle case is exactly where recommendation 4's own risk
  (a hollow, unchallenged chain) lives.
- Rust's RFC retrospective (E22) is a caution against every recommendation in this dossier, not
  just BMAD's: a structured, present, filled-in section is not automatically substantive — the
  spec-judge's actual willingness and ability to contest a Why→Who chain, an extension, or a
  clarify answer is what makes any of these falsifiable in practice, not the template shape alone.
- BMAD's advanced-elicitation menu (E30) and this machine's `grilling` skill (E36) are close
  enough in shape that recommendation 5's line between them (in-session vs. headless) may be a
  distinction of *deployment*, not of *technique* — the same underlying interview mechanism might
  be adaptable to a bounded, automaton-runnable form (a fixed question set instead of open-ended
  Socratic dialogue) that this dossier did not fully explore.

## What is not supported

- The claim that shipped agent-spec tools "ignore discovery" outright — spec-kit's `/clarify`
  (E25) is a real counterexample and should be named as such, not folded into a generic "tooling
  is shallow" narrative.
- Any claim that EARS or Gherkin's `Then` discipline itself solves the use-case diagnostic gap —
  both are sentence-level testability tools that presuppose the requirement is already correctly
  identified (E28); neither was found to touch the "is this the right problem" question.
- A specific, verified description of Kiro's clarifying-question content or taxonomy (E27) — the
  existence of the step is confirmed, its shape is not; do not cite Kiro's questions as a model
  without further primary-source verification.
- Cockburn's specific "sea level test" wording (E05) — flagged unverified; the primary PDF
  (linked in E04's notes) needs a direct read before this phrase is quoted precisely anywhere else.

## Where evidence is thin

- Superpowers' brainstorming skill (E33) was characterized entirely from secondary write-ups; its
  own `SKILL.md` in `obra/superpowers` was not fetched directly in this pass.
- BMAD's `bmad-orchestrator` skill on this machine is an unreadable broken symlink (E32); this
  dossier's BMAD claims rest entirely on the upstream GitHub repo, not on the locally-installed
  skill the task brief named — a follow-up should either repair the symlink or drop the local
  reference from future citations of this dossier.
- No academic-literature source (an RE conference paper, a controlled study) was consulted for
  any of the Cluster 1 techniques — every claim rests on practitioner write-ups, book summaries,
  or the originating authors' own web presence. Sufficient for a design decision; not sufficient
  for a claim about empirical effectiveness.

## Recheck triggers

- If `spec-format-governance`'s `## Use Cases` section is renamed or restructured — re-verify E34
  against the new text before citing this dossier's mismatch finding.
- If spec-kit ships a discovery step that scans the requester's situation rather than the spec
  draft (contradicting E26) — recheck the falsifiability comparison in Q3.
- If the `bmad-orchestrator` local symlink (E32) is repaired — read the actual local skill content
  before repeating this dossier's characterization of "the BMAD orchestrator skill" as
  external-repo-only.
- If SDD adopts any of the four "worth taking" recommendations — log the design decision in the
  relevant ADR/governance and update this dossier's `changes.md`, per the repo's research-to-policy
  discipline.
