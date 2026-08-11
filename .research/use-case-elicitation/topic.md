# Use-Case Elicitation (August 2026)

## Question

SDD's spec creation is weak at the use-case diagnostic: the spec-producer accepts a change
request's framing as given and does not dig into the real situations the change must serve (who
hits it, what they were doing, what they expected). Specs come out internally well-formed but
built on a shallow or assumed problem model.

What does the requirements-elicitation field actually prescribe — as procedure and as artifact
shape — to force discovery of real situations rather than acceptance of a stated framing? And
what do shipped agent-spec tools actually do at the discovery step? What, concretely, is worth
taking for SDD?

A load-bearing fact discovered before this dossier started: SDD's `spec.md` has a required
section literally named `## Use Cases`, but `sdd:spec-format-governance` defines it as "the
**entry points** — one row per distinct way the capability is invoked, each **named to its
implementation surface** (a CLI verb, a public function, an endpoint), given as trigger / inputs /
outcome." That is an API-surface inventory, not a use case in the requirements-engineering sense
(actor, goal, context, main scenario, extensions). Whether this naming collision is a real
mismatch, and what it costs, is one thing this dossier settles.

## Scope

**In scope:**
- What the established requirements-elicitation field means by "use case" (Jacobson, Cockburn)
  and adjacent discovery techniques (JTBD, story mapping, event storming, impact mapping,
  example mapping / BDD discovery, design-doc / RFC review practice)
- Whether each technique's output artifact is **falsifiable** — something a reviewer (human or
  cold judge) can find *wrong*, not merely *absent*
- What shipped agent-spec tooling (GitHub spec-kit, Amazon Kiro, BMAD-METHOD, Claude Code
  Superpowers, and other published skills) actually does at the discovery step, verified against
  primary sources (repo files, docs pages) rather than marketing copy
- What SDD itself currently does at this step (`spec-format-governance`'s `## Use Cases`,
  `spec-producer-governance`'s grill loop, `start-mission`'s conductor grill) and what local
  machine skills (`grilling`, `to-spec`, `triage`, `wayfinder`) already encode
- A short list of concrete, costed recommendations for SDD

**Out of scope:**
- Redesigning `spec-format-governance` or `spec-producer-governance` (this dossier informs that
  design; it does not carry out the edit)
- SDD's Control Flow / Scenario Map sections, or the `.feature` suite format generally
  (`sdd:suite-format-governance` already covers scenario mechanics; this dossier is about what
  happens *before* a scenario can be written)
- A full literature review of requirements engineering as an academic field — the goal is
  actionable prior art, not exhaustiveness

## Source angles

- Primary texts and their canonical online summaries: Jacobson's *Use Case 2.0*, Cockburn's
  *Writing Effective Use Cases*, Moesta/Klement's JTBD literature, Patton's *User Story Mapping*,
  Brandolini's Event Storming materials, Adzic's *Impact Mapping*, Wynne's Example Mapping post
- Design-doc / RFC practice: Google design-doc write-ups, the Rust RFC template and its
  discussion of motivation/drawbacks/alternatives
- Shipped tooling repos and docs: `github/spec-kit` (templates + commands, fetched from the repo
  directly), `kiro.dev` docs, `bmad-code-org/BMAD-METHOD` (advanced-elicitation docs and SKILL.md)
- Local primary sources already on this machine: `~/.claude/skills/{grilling,grill-me,
  grill-with-docs,to-spec,triage,wayfinder}/SKILL.md`, and this repo's
  `plugins/sdd/skills/{spec-format-governance,spec-producer-governance,start-mission}/SKILL.md`
- Awesome-list and marketplace surveys for published "PRD" / "brainstorm" / "discovery" skills,
  cross-checked against at least one primary source per named skill where reachable
