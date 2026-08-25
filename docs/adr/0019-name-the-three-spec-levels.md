# ADR-0019: Name the three spec levels (corpus ⊃ project-spec ⊃ node)

## Status

Accepted

## Context

"Spec" was overloaded. It meant both **one project's whole durable spec** and **a single
capability's `spec.md`**, and "corpus" had drifted from a collective noun into a label on
*operations* — several of which actually touch only one project's spec. The `corpus/` capability
folder held six engines, but only `discovery` ranges across projects; the other five
(`align-spec`, `check-spec-structure`, `concept-index`, `digest`, `place-node`) operate inside one
project-spec. A reader could not tell a corpus-wide action from a project-spec-local one by name.

The one-project-one-spec model (ADR-0017) already fixed the *external* boundary — one project maps
to one durable spec — but left the vocabulary above and below that boundary unnamed.

## Decision Drivers

- A reader must know an operation's altitude from its name alone.
- The filesystem already implies the levels (`.agents/specs/` ⊃ `sdd/` ⊃ `gateway/spec.md`).
- Keep "corpus" scarce and precise so it carries signal.

## Decision

Adopt three nested levels and name every operation by the level it acts upon:

| Level | Is | Filesystem |
|---|---|---|
| **corpus** | the *collection* of project-specs in a repo (**noun only**) | `.agents/specs/` |
| **project-spec** | one project's whole durable spec | `.agents/specs/<project>/` |
| **node** | one unit's `spec.md` (+ `.feature`) | `…/<capability>/<unit>/` |

`corpus ⊃ project-spec ⊃ node`. **"corpus" is a noun, never a verb or an operation prefix.** An
operation over one project-spec is *project-spec-level*; an operation across projects is
*corpus-level*.

Consequently, split the `corpus/` capability folder by level: the five intra-spec engines move to a
`project-spec/` grouping; only `corpus/discovery` (which genuinely ranges across projects) keeps the
`corpus/` label.

## Rationale

The levels are real and filesystem-backed, so naming them removes ambiguity rather than inventing a
taxonomy. Naming ops by *what they act upon* is a single rule that classifies every current and
future engine, and it exposed the mislabel: five of six `corpus/` engines were project-spec-local.
Keeping the noun scarce means every remaining "corpus" in the prose is a true cross-project claim.

## Consequences

### Positive

- Operation names disclose altitude; `corpus/discovery` vs `project-spec/check-spec-structure` reads correctly.
- The canonical definition lives in one place (`design/spec-structure.md`), pinned from `TERMINOLOGY.md`.

### Negative

- A one-time sweep: folder `git mv`s, frozen `.feature` language revisions (through the spec gate),
  impl variable renames (`scanCorpus`→`scanProjectSpec`, `corpusDir`→`specDir`), and cross-reference updates.

### Risks

- Stale "corpus" references surviving the sweep; mitigated by a grep gate in verification.

## Implementation Notes

Executed as CR `name-spec-levels` in seven commit-sized units: definitions → folder split (`git mv`,
freeze survives — pure path move) → project-spec prose → frozen `.feature` revisions (spec gate
re-approve + re-freeze) → impl mirror → cross-references → concept-tag sweep. The `concept:
corpus-structure` tag on the intra-spec nodes is re-evaluated in the final unit.

## Related Decisions

- [ADR-0017](0017-frontmatter-is-the-router-index.md) — introduced the one-project-one-spec (project-spec) model this names the levels of.
