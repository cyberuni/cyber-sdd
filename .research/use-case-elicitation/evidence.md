# Evidence — Use-Case Elicitation

## Cluster 1 — requirements-elicitation methodology

### E01

- **Claim:** Jacobson's Use Case 2.0 template centers on an actor and a goal, and requires a
  Primary Actor, a goal-phrase Title, Goal in Context, Scope, Level, Stakeholders and Interests,
  Precondition, Minimal/Success Guarantees, Trigger, a Main Success Scenario, and Extensions (the
  alternate/error paths).
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** "How Use Case 2.0 Works" (microTOOL) and secondary summaries of Jacobson/
  Spence/Bittner's *Use-Case 2.0* whitepaper
- **Source URL:** https://www.microtool.de/en/knowledge-base/how-use-case-2-0-works/
- **Source type:** secondary summary (whitepaper not directly fetched)
- **Notes:** "Extensions" is the field that forces enumerating what goes wrong or diverges — the
  part a pure API-surface table has no place for.

### E02

- **Claim:** Use Case 2.0 organizes work by "slicing" use cases into use-case slices sized to fit
  a single sprint, explicitly bridging traditional use-case analysis with agile delivery.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** Smartgecko Academy, "Use Case 2.0: Bridging Requirements and Agile Delivery"
- **Source URL:** https://www.smartgecko.academy/en/use-case-2-0-bridging-requirements-agile-delivery/
- **Source type:** secondary summary
- **Notes:** Slicing is a delivery-planning concern, not a discovery mechanism — noted so it isn't
  mistaken for the "dig into real situations" technique this dossier is chasing.

### E03

- **Claim:** A use case, in this tradition, is defined by *actor + goal*: "the ways a system is
  used to achieve one user goal," with an initiating primary actor, supporting actors, a basic
  scenario, and extensions — not an inventory of invocation surfaces.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Search synthesis over multiple use-case reference pages (ConceptDraw,
  Grokipedia, CMSC 345 course slides)
- **Source URL:** https://www.conceptdraw.com/How-To-Guide/jacobson-use-cases-diagram
- **Source type:** secondary summary, triangulated across independent sources
- **Notes:** This is the direct point of contrast with `sdd:spec-format-governance`'s `## Use
  Cases` definition — see E34.

### E04

- **Claim:** Cockburn's *Writing Effective Use Cases* organizes use cases by **goal level**,
  using a "sea level" metaphor: user-goal-level use cases sit at "sea level," summary-level
  (kite/cloud) use cases sit above, and sub-function-level (fish, clam) use cases sit below.
  Cockburn's advice is to concentrate use-case writing at the user-goal (sea) level, with
  comprehensive coverage there.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** "Setting Use Case Goal Levels" (InBetween blog, summarizing Cockburn)
- **Source URL:** https://pjhobday.wordpress.com/2010/05/28/setting-use-case-goal-levels/
- **Source type:** secondary summary; primary PDF also located but not deep-read
- **Notes:** Full primary text located at
  https://people.inf.elte.hu/molnarba/Informaciorendszerek_ELTE/Writing_effective_Use_cases_Cockburn.pdf
  (not fetched in this pass — flagged for a follow-up read if the "sea level" test becomes
  load-bearing for a governance rewrite).

### E05

- **Claim:** Cockburn's "sea level test" is a discipline for *scoping* a use case correctly (not
  too big, not too small) by asking whether the use case describes one user reaching one goal in
  one uninterrupted sitting — the same discipline that later shows up, restated, as INVEST-style
  story-sizing guidance in agile literature.
- **Date accessed:** 2026-08-11
- **Status:** unverified
- **Confidence:** low
- **Source label:** Inference from E04 plus general familiarity with secondary Cockburn
  commentary; the exact phrasing of the "sea level test" itself was not located in a primary
  source during this pass.
- **Source URL:** (none — could not verify against primary text in this pass)
- **Source type:** inference
- **Notes:** Marked unverified deliberately. Do not cite this claim's specific wording without
  reading the primary PDF.

### E06

- **Claim:** Neither Jacobson's nor Cockburn's use-case format is itself a *discovery*
  technique — both assume the actor and goal are already known and specify how to write them up
  once known. The forcing-function for discovering the actor/goal in the first place (interviews,
  workshops, contextual inquiry) is a separate, earlier activity in both traditions.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** Cross-read of E01–E05 sources; none describe a built-in interrogation step
  that challenges a stated actor/goal — they describe a *shape* for recording it.
- **Source URL:** (synthesis across E01–E05)
- **Source type:** synthesis
- **Notes:** This is the crux distinction the dossier's conclusion turns on: use-case *format*
  (falsifiable, gradable) vs. use-case *elicitation* (a separate, largely facilitation-shaped
  activity in the classic tradition).

### E07

- **Claim:** Jobs-to-be-Done frames "hiring" a product to do a job; the canonical elicitation
  instrument is the **Switch Interview**, a timeline-based interview reconstructing the sequence
  of events from "first thought" to "purchase/switch," used to surface the **Four Forces of
  Progress**: push of the situation, pull of the new solution, anxiety about the new solution, and
  habit/attachment to the current one.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** JobsToBeDone.org, "The Four Forces of Progress" and "Unpacking the Progress
  Making Forces Diagram"
- **Source URL:** https://jobstobedone.org/the-four-forces/
- **Source type:** primary-adjacent (the JTBD.org site run by Bob Moesta's collaborators)
- **Notes:** The forces diagram is the artifact; it records *why* someone switched, which is
  closer to the "what were they doing, what did they expect" diagnostic than any use-case format.

### E08

- **Claim:** The "job story" format (`When <situation>, I want to <motivation>, so I can
  <expected outcome>`) is a situation-first alternative to the user-story format (`As a <persona>,
  I want <feature>, so that <benefit>`), deliberately swapping the persona-first framing for a
  context-first framing to avoid baking in an assumed actor.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** Search synthesis; job-story format widely attributed to Alan Klement, building
  on JTBD
- **Source URL:** https://medium.com/@arpit-mishra/job-to-be-done-jtbd-framework-explained-to-get-you-started-interview-questions-8aad7f999fb0
- **Source type:** secondary summary
- **Notes:** Relevant to SDD's `to-spec` skill, which uses the classic `As a/I want/so that` shape
  — see E37.

### E09

- **Claim:** The Switch Interview and forces diagram are facilitation artifacts: they require a
  skilled interviewer conducting a live conversation with a real customer and synthesizing the
  timeline afterward. Nothing in the JTBD literature located here describes a machine-checkable
  completeness criterion for a forces diagram.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** Synthesis of E07–E08 sources; no counter-evidence of a formalized rubric found
- **Source URL:** (synthesis)
- **Source type:** synthesis
- **Notes:** Places JTBD firmly on the "facilitation ritual" side of the falsifiability axis (see
  conclusion Q2).

### E10

- **Claim:** Jeff Patton's User Story Mapping (2014) organizes stories along a horizontal
  **backbone** of user activities in narrative order, with stories stacked vertically under each
  activity by priority; a horizontal slice through the map is a release, and the thinnest such
  slice that still delivers a complete end-to-end outcome is the **walking skeleton**.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** Multiple secondary summaries of Patton's book, triangulated
- **Source URL:** https://marcabraham.com/2012/07/27/jeff-pattons-story-mapping/
- **Source type:** secondary summary
- **Notes:** Story mapping's discovery power is in **surfacing gaps** in the backbone during a
  group mapping session — it externalizes the whole journey so missing activities become visually
  obvious. It does not itself validate that the *backbone activities are the real ones*; that
  still depends on who is in the room.

### E11

- **Claim:** Story mapping is explicitly a group/whiteboard technique — the backbone and stacks
  are built collaboratively, and the map's value (surfacing gaps, forcing prioritization
  conversation) is realized through the live session, not through the finished map read in
  isolation.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** Same sources as E10
- **Source URL:** https://marcabraham.com/2012/07/27/jeff-pattons-story-mapping/
- **Source type:** secondary summary
- **Notes:** Facilitation-ritual side of the axis.

### E12

- **Claim:** Event Storming (Alberto Brandolini) starts from **Domain Events** ("something
  meaningful to the experts that happened in the domain") placed on a timeline by workshop
  participants, only *afterward* deriving the **Commands** that trigger each event and the
  **Actors** who issue each command.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Multiple independent secondary sources (Medium, IBM Automation refarch,
  Boldare, Wikipedia) converge on the same sequence
- **Source URL:** https://en.wikipedia.org/wiki/Event_storming
- **Source type:** secondary summary, triangulated
- **Notes:** This is the concrete instance of "events-before-actors" ordering named in the task
  brief. It directly inverts SDD's current default (name the entry point/actor's invocation
  surface first) — worth weighing against SDD's CFG-first discipline in the conclusion.

### E13

- **Claim:** Event Storming is a live, colored-sticky-note workshop run on a physical or virtual
  wall with "product delivery participants with different expertise" (domain experts, engineers,
  product) in the room together; the technique's value is explicitly attributed to that mixed
  group surfacing tacit domain knowledge live.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** IBM Automation reference architecture write-up; Boldare guide
- **Source URL:** https://ibm-cloud-architecture.github.io/refarch-eda/methodology/event-storming/
- **Source type:** secondary summary, triangulated
- **Notes:** Firmly a facilitation ritual — no artifact-completeness rubric located.

### E14

- **Claim:** Event Storming's output (a wall of events/commands/actors) is a discovery aid for
  finding domain concepts and bounded contexts; it is not itself a spec and is typically
  transcribed into other artifacts (aggregates, a domain model, or downstream use cases) after
  the session.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** Qlerify and sph.sh guides, cross-read against E12–E13
- **Source URL:** https://www.qlerify.com/post/event-storming-the-complete-guide
- **Source type:** secondary summary
- **Notes:** Relevant to "what is worth taking": the events-first *ordering discipline* could be
  taken without taking the live-workshop mechanism.

### E15

- **Claim:** Gojko Adzic's Impact Mapping structures planning as a mind map answering four
  questions in order: **Why** (the goal, centered on the problem, not the solution), **Who**
  (actors who can influence the outcome), **How** (the behavior change/impact needed from that
  actor), and **What** (the deliverable that produces the impact).
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Productfolio and Gojko Adzic's own site
- **Source URL:** https://gojko.net/books/impact-mapping/
- **Source type:** primary-adjacent (author's own site) plus secondary summary
- **Notes:** The Why→Who→How→What chain is explicitly a discipline against jumping straight to
  "What" (a feature) without first naming the actor whose behavior must change and why — directly
  on point for "who hits it, what did they expect."

### E16

- **Claim:** Impact mapping's stated purpose is to make assumptions explicit and to prevent scope
  creep/"feature factory" behavior by visually forcing every deliverable to trace back through an
  actor and a goal; it is described as a collaborative strategic-planning method, again realized
  through a workshop/mapping session rather than a solo-authored document.
  Because "How" (the impact) is an *assumption* about actor behavior change, the impact-mapping
  literature explicitly frames branches as **assumptions to be tested**, not settled facts — the
  map is falsifiable in the sense that a reviewer can ask "what evidence backs this Why→Who→How
  link" of any branch.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** Productfolio, openpracticelibrary.com
- **Source URL:** https://openpracticelibrary.com/practice/impact-mapping/
- **Source type:** secondary summary
- **Notes:** Structurally more falsifiable than event storming or JTBD interviews — the chain
  itself is a claim a reader can contest — but still authored/facilitated by a person, with no
  described mechanical completeness check.

### E17

- **Claim:** Matt Wynne's Example Mapping is a Three Amigos technique using four card colors: a
  yellow **Story** card as the conversation seed, blue **Rule** cards for acceptance-criteria-level
  constraints, green **Example** cards illustrating each rule with concrete scenarios, and red
  **Question** cards for anything blocking readiness — a story is not "ready" while red cards
  remain.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Matt Wynne, "Introducing Example Mapping" (original post, via Medium/Cucumber
  mirror)
- **Source URL:** https://cucumber.io/blog/bdd/example-mapping-introduction/
- **Source type:** primary (author's own post, republished by Cucumber, the tool he co-created)
- **Notes:** The **red Question card** is the single most transferable mechanism found in this
  survey: it makes "we don't know yet" a first-class, visible artifact state rather than a silent
  gap — directly answers the brief's "falsifiable, not merely absent" framing.

### E18

- **Claim:** Example Mapping is time-boxed (typically ~25 minutes per story) precisely so that
  when the group runs out of time with red cards still on the table, that is itself a signal the
  story is too big and needs splitting — the technique doubles as a story-sizing discovery tool.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** Xebia and Automation Panda guides on Example Mapping
- **Source URL:** https://automationpanda.com/2018/02/27/bdd-example-mapping/
- **Source type:** secondary summary
- **Notes:** —

### E19

- **Claim:** BDD's broader "discovery" phase (of which Example Mapping is one concrete technique)
  is explicitly the step that precedes formulation (writing Gherkin) and automation (making it
  executable) — the Three Amigos structure (business/product, dev, test perspectives in one room)
  exists specifically to prevent one role's framing (usually the requester's) from going
  unchallenged.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** Cross-read of Cucumber's own BDD documentation and the Example Mapping sources
  above (E17–E18)
- **Source URL:** https://cucumber.io/blog/bdd/example-mapping-introduction/
- **Source type:** secondary summary
- **Notes:** The "discovery / formulation / automation" three-phase framing is the direct
  ancestor of how SDD's `.feature` suites are meant to be produced — but SDD's spec-producer
  governance collapses discovery and formulation into one pass (see E35).

### E20

- **Claim:** Google's internal design-doc practice has a fixed "Alternatives Considered" section
  whose explicit purpose is to force authors to state what else could have achieved the same goal
  (another design, an existing system, buying instead of building, or doing nothing) and the
  trade-offs that ruled each out.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** "Design Docs at Google" (Malte Ubl / industrialempathy.com), a widely cited
  external write-up of internal Google practice
- **Source URL:** https://www.industrialempathy.com/posts/design-docs-at-google/
- **Source type:** secondary but high-provenance (written by a former senior Google engineer,
  widely cited as accurate by other Googlers)
- **Notes:** "Alternatives Considered" is falsifiable in a specific sense: a reviewer can name an
  alternative the author omitted and force it to be addressed — the check is "is this alternative
  missing," which is checkable even without domain expertise in the exact proposal.

### E21

- **Claim:** The same Google design-doc practice has a short "Background/Motivation" section
  (1–2 paragraphs) whose job is to state the triggering bug or customer need — kept deliberately
  short so it cannot substitute for the Alternatives section's scrutiny.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Same as E20
- **Source URL:** https://www.industrialempathy.com/posts/design-docs-at-google/
- **Source type:** secondary but high-provenance
- **Notes:** —

### E22

- **Claim:** The Rust RFC template requires Motivation, Guide-level explanation, Reference-level
  explanation, Drawbacks, Rationale and Alternatives, Prior Art, Unresolved Questions, and Future
  Possibilities; the Rust community's own retrospective commentary notes that "Drawbacks" sections
  are frequently filled with vacuous content ("it is bad to add a change") rather than real
  analysis of what future capability the change forecloses, and that RFCs "that do not present
  convincing motivation... or are disingenuous about the drawbacks or alternatives tend to be
  poorly received" — i.e. the format alone does not guarantee substance; the reviewing community's
  scrutiny is what makes the section carry weight.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** rust-lang/rfcs template discussion (PR #3982) and the Rust RFC Book
- **Source URL:** https://github.com/rust-lang/rfcs/pull/3982
- **Source type:** primary (project's own repo discussion)
- **Notes:** Directly on point for "falsifiable vs. merely present": a template section can exist,
  be filled, and still be worthless if nothing forces the content to be substantive — the same
  risk SDD's `## Use Cases` section faces if it becomes a box-checking exercise rather than a
  forcing function.

## Cluster 2 — agent-skill / spec-driven ecosystems

### E23

- **Claim:** GitHub spec-kit's `spec-template.md` structures a spec around **"User Scenarios &
  Testing"** (prioritized user stories P1/P2/P3+, each with a description, priority
  justification, an independent-test rationale, and Given/When/Then acceptance scenarios, plus an
  Edge Cases subsection), then separately **"Requirements"** (functional requirements FR-00N,
  key entities), then **"Success Criteria"** (measurable SC-00N outcomes), then
  **"Assumptions."**
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** `github/spec-kit`, `templates/spec-template.md` (fetched directly)
- **Source URL:** https://raw.githubusercontent.com/github/spec-kit/main/templates/spec-template.md
- **Source type:** primary (repo file)
- **Notes:** spec-kit's "User Scenarios" is closer to the requirements-engineering sense of "use
  case" than SDD's `## Use Cases` — it demands a testable acceptance scenario per story, not just
  an entry-point row.

### E24

- **Claim:** The spec-template embeds a `[NEEDS CLARIFICATION: ...]` tag mechanism directly in
  the Requirements section — e.g. "System MUST authenticate users via [NEEDS CLARIFICATION: auth
  method not specified]" — so unresolved ambiguity is written into the spec itself as a visible,
  greppable marker rather than silently assumed.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Same as E23
- **Source URL:** https://raw.githubusercontent.com/github/spec-kit/main/templates/spec-template.md
- **Source type:** primary (repo file)
- **Notes:** Directly comparable to SDD's `<!-- open: -->` `CONTENT_GAP` marker convention
  (`sdd:spec-producer-governance`) — the same mechanism, independently arrived at.

### E25

- **Claim:** spec-kit ships a dedicated `/speckit.clarify` command that runs a **structured
  ambiguity scan across nine fixed taxonomy categories** (Functional Scope, Domain & Data Model,
  Interaction & UX Flow, Non-Functional Quality Attributes, Integration & Dependencies, Edge Cases
  & Failure Handling, Constraints & Tradeoffs, Terminology & Consistency, Completion Signals),
  generates candidate questions per category marked Partial/Missing, prioritizes by impact, and
  asks **at most 5 questions total**, one at a time, each constrained to multiple-choice
  (2–5 options) or a ≤5-word short answer. Each accepted answer is written into a "Clarifications"
  section with a session timestamp and simultaneously applied to the relevant spec section,
  replacing contradictory text.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** `github/spec-kit`, `templates/commands/clarify.md` (fetched directly)
- **Source URL:** https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/clarify.md
- **Source type:** primary (repo file)
- **Notes:** This is the single most concrete, machine-runnable elicitation mechanism found in
  either cluster — a fixed taxonomy, a hard question cap, constrained answer formats, and
  automatic fold-back. It is a genuine counterexample to the premise that shipped agent tooling
  ignores discovery. Its known limit (see E26) is that it hunts ambiguity *within the stated
  spec*, not whether the spec's starting frame (which actor, which situation) is the right one.

### E26

- **Claim:** spec-kit's clarify taxonomy operates on the spec-in-progress: its categories (scope,
  data model, UX flow, non-functional attributes, integrations, edge cases, constraints,
  terminology, completion signals) are all properties *of the artifact being written*, not
  properties of the *requester's situation* (who is asking, what were they doing, what mental
  model do they hold). Nothing in the fetched command definition instructs the agent to interview
  the requester about their own context before or independent of the spec draft.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** Same as E25, read against the categories list
- **Source URL:** https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/clarify.md
- **Source type:** primary (repo file), interpretive claim about scope drawn from the fetched text
- **Notes:** This is the precise shape of spec-kit's known weakness for this dossier's purpose —
  it clarifies the document, not the diagnosis. It never asks "why do you believe this is the
  problem."

### E27

- **Claim:** Amazon Kiro's spec mode produces three sequential documents — `requirements.md`
  (user stories + acceptance criteria in EARS notation), `design.md` (architecture diagrams,
  interfaces, sequence diagrams), `tasks.md` (dependency-ordered implementation tasks) — and its
  "Quick Spec" mode explicitly states the user "answer[s] clarifying questions up front and
  land[s] directly on the task list," i.e. Kiro does ask questions before generating
  `requirements.md`, but the questions and their taxonomy are not documented in the fetched page.
- **Date accessed:** 2026-08-11
- **Status:** confirmed (existence of clarifying step); unverified (question taxonomy/content)
- **Confidence:** medium
- **Source label:** kiro.dev, "Feature Specs" documentation page
- **Source URL:** https://kiro.dev/docs/specs/feature-specs/
- **Source type:** primary (vendor docs page)
- **Notes:** Weaker evidence than spec-kit's clarify command because Kiro's own docs do not
  publish the question set or taxonomy the way spec-kit's `clarify.md` source does — Kiro's
  mechanism is described, not inspectable.

### E28

- **Claim:** EARS (Easy Approach to Requirements Syntax), the notation Kiro uses for individual
  requirement lines, was developed by Alistair Mavin et al. at Rolls-Royce and published at RE'09.
  It specializes a generic requirement sentence into five types — **Ubiquitous** ("The <system>
  shall <response>"), **Event-driven** (`When <trigger>, the <system> shall <response>`),
  **State-driven** (`While <state>, the <system> shall <response>`), **Optional feature**
  (`Where <feature is included>, the <system> shall <response>`), and **Unwanted behavior**
  (`If <undesired condition>, then the <system> shall <response>`).
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Alistair Mavin's own EARS guide site, cross-checked against Wikipedia's
  Easy Approach to Requirements Syntax article
- **Source URL:** https://alistairmavin.com/ears/
- **Source type:** primary (originating author's own site)
- **Notes:** EARS is a **sentence-level testability discipline**, not a discovery technique — it
  makes an individual requirement's trigger/response boundary explicit and machine-parseable, but
  presupposes the requirement (i.e. the actor's need) is already known. Directly comparable to
  SDD's Given/When/Then boolean `Then` discipline (`sdd:suite-format-governance`) — both make a
  *stated* requirement checkable, neither validates that the requirement is the *right* one.

### E29

- **Claim:** Kiro supports two entry directions into the same three-document pipeline —
  "Requirements-First" (requirements.md drives design.md) and "Design-First" (an existing
  technical design is reverse-derived into requirements.md) — both converging on the same
  tasks.md shape.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** Same as E27
- **Source URL:** https://kiro.dev/docs/specs/feature-specs/
- **Source type:** primary (vendor docs page)
- **Notes:** Design-First is structurally the same risk this dossier's brief describes for SDD —
  accepting a given frame (the technical design) and writing requirements to match it, rather
  than testing the frame.

### E30

- **Claim:** BMAD-METHOD's **Advanced Elicitation** is a structured second pass over
  already-generated content: the agent proposes ~5 relevant reasoning techniques from a large menu
  (Pre-mortem Analysis, First Principles Thinking, Inversion, Red Team vs. Blue Team, Socratic
  Questioning, Constraint Removal, Stakeholder Mapping, Analogical Reasoning, and others), the
  human picks one (or asks for a reshuffle), the technique is applied to re-examine the existing
  draft, and the human accepts, discards, or repeats.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** `bmad-code-org/BMAD-METHOD`, `docs/explanation/advanced-elicitation.md`
  (fetched directly)
- **Source URL:** https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/explanation/advanced-elicitation.md
- **Source type:** primary (repo file)
- **Notes:** The PM/Analyst agent applies this loop while building the PRD from the team's
  existing product knowledge — i.e. it interrogates a *draft*, not a blank problem statement; it
  presupposes a first pass already exists.

### E31

- **Claim:** BMAD's advanced-elicitation loop has no described automatic grading mechanism — the
  documentation frames acceptance of each pass as analyst-dependent, and produces revised prose
  for human judgment at each iteration rather than a structured, machine-checkable requirements
  artifact.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** Same as E30
- **Source URL:** https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/explanation/advanced-elicitation.md
- **Source type:** primary (repo file), interpretive claim about absence of grading
- **Notes:** Places BMAD firmly on the facilitation-ritual side of the falsifiability axis — the
  reasoning-lens menu is the interesting transferable idea, but the loop's exit condition is "the
  human is satisfied," not "the artifact passes a check."

### E32

- **Claim:** `~/.claude/skills/bmad-orchestrator` on this machine is a **broken symbolic link**
  pointing at `../../.agents/skills/bmad-orchestrator`, which does not exist locally — the local
  BMAD orchestrator skill named in the task brief could not be read from disk in this session.
- **Date accessed:** 2026-08-11
- **Status:** confirmed (broken link); the skill's actual content is unverified locally
- **Confidence:** high (for the broken-link fact); n/a for skill content
- **Source label:** Direct filesystem inspection (`ls -la`, `file`) on this machine
- **Source URL:** (local filesystem — `/home/unional/.claude/skills/bmad-orchestrator`)
- **Source type:** local inspection
- **Notes:** Flagged per the "do not fabricate" bar — BMAD's orchestrator content in this dossier
  is sourced entirely from the upstream `bmad-code-org/BMAD-METHOD` repo (E30–E31), not from this
  broken local symlink.

### E33

- **Claim:** Claude Code "Superpowers" (Jesse Vincent, `obra/superpowers`) ships a
  **brainstorming** skill that runs before any code is written: it drives a Socratic
  question-and-answer dialogue, surfaces alternatives and hidden requirements the requester didn't
  state, and ends by presenting a design document section-by-section for explicit sign-off before
  implementation starts.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** medium
- **Source label:** Multiple independent secondary write-ups (DataCamp, Medium, mymcpshelf.com)
  converging on the same description; the skill's own SKILL.md was not fetched directly in this
  pass
- **Source URL:** https://github.com/obra/superpowers
- **Source type:** secondary summary (repo exists and is linked; SKILL.md content not directly
  fetched — treat description as secondary until confirmed against the file)
- **Notes:** Structurally the same shape as this machine's local `grilling` skill (E36) — live,
  one-question-at-a-time, human-in-the-loop, ends in a document the human approves. No described
  machine-checkable completeness bar.

### E34

- **Claim:** `plugins/sdd/skills/spec-format-governance/SKILL.md` in this repo defines
  `## Use Cases` as: "The **entry points** — one row per distinct way the capability is invoked,
  each **named to its implementation surface** (a CLI verb, a public function, an endpoint), given
  as **trigger / inputs / outcome**. A use case answers *"when, and with what, is this invoked?"*
  — never *"given this state, does it do that?"* (that is a scenario)." The section is explicitly
  justified by keeping "spec, suite, and code" on "one screaming structure" so each use case maps
  to its own module.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Local repo file
- **Source URL:** `plugins/sdd/skills/spec-format-governance/SKILL.md` (this repo)
- **Source type:** local repo file (primary)
- **Notes:** This is the precise text behind the naming-collision finding in `topic.md`. Its
  design goal (one-to-one mapping to implementation modules) is legitimate and orthogonal to
  requirements discovery — it is solving a different problem (code/spec/suite structural
  correspondence) than what "use case" solves in Jacobson/Cockburn (E01–E06). The mismatch is in
  the *name*, not necessarily in the section's engineering purpose.

### E35

- **Claim:** `plugins/sdd/skills/spec-producer-governance/SKILL.md`'s step 1 instructs: "Gather
  intent, grilling breadth-first and depth one-at-a-time. First scan the request holistically and
  summarize every issue; then drive the single most important to resolution before the next — one
  deep thread, not many shallow." For `BACKFILL` it infers What/Why/decisions/surface from source,
  tests, and history; otherwise it uses `USER_INPUT` — described as "the What / Why / command
  surface for a new feature," i.e. an input already framed by the requester (or the conductor
  relaying a CR) before this step runs.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Local repo file
- **Source URL:** `plugins/sdd/skills/spec-producer-governance/SKILL.md` (this repo)
- **Source type:** local repo file (primary)
- **Notes:** SDD does grill — but the grill target is the CR's stated request, and the procedure
  gives no explicit instruction to interrogate whether the requester's own framing of the problem
  is correct (contrast Cluster 1's Impact Mapping Why→Who→How chain, or JTBD's Switch Interview,
  both of which start from the actor's situation rather than the actor's stated ask).

### E36

- **Claim:** `~/.claude/skills/grilling/SKILL.md` (this machine) instructs: "Interview me
  relentlessly about every aspect of this until we reach a shared understanding... Ask the
  questions one at a time, waiting for feedback on each question before continuing... If a *fact*
  can be found by exploring the environment, look it up rather than asking me. The *decisions*,
  though, are mine — put each one to me and wait for my answer. Do not act on it until I confirm
  we have reached a shared understanding."
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Local skill file
- **Source URL:** `/home/unional/.claude/skills/grilling/SKILL.md`
- **Source type:** local file (primary)
- **Notes:** `grilling` is a synchronous, human-in-the-loop, decision-tree-walking interview — the
  same shape as BMAD's advanced elicitation (E30) and Superpowers' brainstorming (E33), and
  explicitly the mechanism `wayfinder` (E39) and `triage` invoke for the same purpose. It is a
  facilitation ritual, not a gradable artifact producer: nothing in its own text describes an
  output shape a cold judge could check.

### E37

- **Claim:** `~/.claude/skills/to-spec/SKILL.md` explicitly opts *out* of interviewing: "Do NOT
  interview the user — just synthesize what you already know," and its spec template's "User
  Stories" section uses the classic Jacobson/Cockburn-adjacent phrasing "As an `<actor>`, I want a
  `<feature>`, so that `<benefit>`," instructing the list be "extremely extensive and cover all
  aspects of the feature."
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Local skill file
- **Source URL:** `/home/unional/.claude/skills/to-spec/SKILL.md`
- **Source type:** local file (primary)
- **Notes:** `to-spec` is the closest local analogue to SDD's spec-producer's non-grill path: it
  produces the classic actor/goal/benefit format, but by design synthesizes from an *already-had*
  conversation rather than eliciting a fresh one — it inherits whatever framing the prior
  conversation settled on, good or bad.

### E38

- **Claim:** `~/.claude/skills/triage/SKILL.md`'s "Gather context" step runs two mechanical checks
  before any interview — a **redundancy check** (search the codebase by domain concept, not the
  request's literal wording, for an existing implementation) and a **prior-rejection check** (read
  `.out-of-scope/*.md` for a resembling past rejection) — and only escalates to the `/grilling`
  skill "if needed," i.e. grilling is conditional on the request not already being resolvable by
  those two checks.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Local skill file
- **Source URL:** `/home/unional/.claude/skills/triage/SKILL.md`
- **Source type:** local file (primary)
- **Notes:** The redundancy check ("search by domain concept, not wording") is itself a small
  discovery technique against a *specific* failure mode (the requester describing a solution that
  already exists, or a wontfix that already happened) — narrower than the brief's ask but a real,
  mechanical, non-facilitation check worth naming.

### E39

- **Claim:** `~/.claude/skills/wayfinder/SKILL.md` structures a `grilling` ticket type as one of
  four ticket types (`research`, `prototype`, `grilling`, `task`), explicitly marking `grilling`
  and `prototype` as **HITL** (human in the loop) — "a grilling agent that answers its own
  questions has broken this" — as distinct from `research`, which is **AFK** and resolved by a
  `/research` subagent alone.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Local skill file
- **Source URL:** `/home/unional/.claude/skills/wayfinder/SKILL.md`
- **Source type:** local file (primary)
- **Notes:** `wayfinder`'s own taxonomy already encodes this dossier's central distinction — some
  question types (research/facts) can be resolved AFK by an agent; others (grilling/decisions)
  structurally require a live human. This is direct local prior art for conclusion Q2's axis, and
  it matters for SDD: a cold, judge-graded spec gate is closer in shape to an AFK research ticket
  than to a HITL grilling ticket, which is exactly why a live grill cannot be the *whole* answer
  for an unattended `sdd-automaton` run.

### E40

- **Claim:** SDD's headless realization of the conductor (`sdd:sdd-automaton`) runs the same
  mission loop as the in-session conductor but "self-asserts at the autonomy bar within leash" and
  "batches needs-input up its relay instead of asking live" — i.e. in a headless run, there is no
  live human to grill; the same `spec-producer-governance` grill-loop text (E35) has to execute
  without the live back-and-forth `grilling` (E36) or BMAD's advanced elicitation (E30) both
  presuppose.
- **Date accessed:** 2026-08-11
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Agent-definition description surfaced in this session's tool listing plus
  cross-read of `plugins/sdd/skills/start-mission/SKILL.md`'s "Three realizations of the
  conductor"
- **Source URL:** `plugins/sdd/skills/start-mission/SKILL.md` (this repo)
- **Source type:** local repo file (primary)
- **Notes:** This is the sharpest constraint on "what is worth taking" — any elicitation technique
  recommended for SDD must degrade gracefully to a headless, no-live-human run, which rules out
  importing HITL-only techniques (event storming, JTBD interviews, BMAD's own advanced elicitation
  loop) wholesale; at best their *artifact shape* (a forces diagram, a Why/Who/How/What chain) can
  be adapted into something an automaton can populate from CR text and codebase evidence and a
  cold judge can grade for completeness, even though populating it *well* still benefits from a
  live human.
