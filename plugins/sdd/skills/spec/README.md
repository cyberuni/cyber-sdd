# spec

Writes, revises, and reviews a **design spec**: the document that states what a capability must do, in terms an
outsider can check without reading the code. A design spec pairs **intent** (the problem, who has it, and what the
capability does about it) with **criteria** (boolean statements about the outcome, each bound to a use case).
User-invocable.

## When to use

- Spec a new capability, or backfill a spec for code that already exists.
- Change what an existing spec says.
- Judge whether a spec is good, or ready.
- Split a spec that has grown past what its readers need.
- Derive tests from a spec.

## What it does

- **Write** lays out one capability per folder (`README.md`, plus `graph.md` when the behavior branches) and settles
  it with the user one section at a time: outcome, What, Non-goals, Key terms, Actors and goals, Use cases, Criteria,
  Open questions, References. Every list item carries a stable ID. A headless run drafts every section and puts each
  question under Open questions.
- **Review** judges the spec against nine pass/fail criteria (C1 to C9, in
  [`references/criteria.md`](references/criteria.md)), fixes what the spec and its sources settle, and returns the
  rest as open questions with a recommendation.
- **Split** moves a spec into a parent and child specs by capability, never by layer, keeping every ID, in a commit
  that only moves text.
- **Derive tests** turns each criterion into a native, deterministic test of the project's own test stack, named by
  its criterion ID. Criteria of a skill-instruction use case are checked by an eval run of the skill instead.
- **Validate** (V1 to V13 in [`SKILL.md`](SKILL.md#validate)) is the self-check before handoff and the re-check a cold
  reader runs against the spec folder.

The spec is standing: it is compared against on every change. Rationale lives in a linked home, not in the spec. The
decision graph format is in [`references/decision-graph.md`](references/decision-graph.md). The reasons for each rule
are in the research topic
[`.research/design-spec-criteria`](../../../../.research/design-spec-criteria/conclusion.md).

## Open questions

- Q1 How this skill relates to an SDD project spec (a node under `.agents/specs/`, a change request, a frozen
  `.feature`). Both claim requests such as "revise the gateway spec", and they produce different artifacts. Undecided
  on purpose: `start-mission` keeps its triggers, and this skill does not defer to it yet.
- Q2 Whether a use case names the `graph.md` node it enters at. The decision graph reference says it does, but the
  use case template (Trigger, Entry points, Inputs, Success, Extensions) has no such field and V4 does not check it.
  Either add an `Entry node` bullet for graph specs, or drop the line from the reference.

## Install

Ships with the `cyber-sdd` plugin. Install the plugin through your agent's marketplace; the skill is then available
as `spec`.
