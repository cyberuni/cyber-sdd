# ADR-0034: Colocate the node spec with its subject; keep the frozen `.feature` as the gate-bound oracle

## Status

Accepted

Amends [ADR-0033](0033-name-the-three-spec-levels.md) (the node level is no longer path-bound to
the project-spec tree). Refines [ADR-0028](0028-suite-design-test-levels.md) (bounds how far the
suite may move down). Upholds [ADR-0016](0016-impl-judge-verification-independence.md) without
change.

This is a **next-version direction**. It migrates nothing. The `*-next` work it authorizes runs
alongside what ships today.

## Context

[Issue #4](https://github.com/cyberuni/cyber-sdd/issues/4) proposes two directions for the next
version of the spec architecture and asks for one to be adopted — explicitly not both, because
they pull in opposite directions on the same axis.

- **A — colocate.** The node level moves out of `.agents/specs/<project>/…` to sit next to the
  subject it specifies (A1). The suite moves down into the implementation's own tooling —
  Vitest, Storybook, `evals.json` — with freezing preserved but re-mechanized per form, possibly
  by agent separation rather than a frozen artifact (A2). Non-engineer readability comes from a
  generated summary (A3).
- **B — externalize.** The spec is persisted outside ordinary repository content — beads, SQL, a
  detached branch — so fewer files enter an agent's context by default. Agents ask a **second
  brain** instead of reading the corpus.

The issue supplies its own discriminator: **placement** is where a fact lives relative to its
subject; **retrieval** is how much corpus enters a context window. Which of those is the
expensive problem should separate the two.

It also requires that the decision be both reasoned and **tested**, weighted equally, and that
any disagreement between the two be surfaced rather than resolved away. Both were done, on the
smallest real subject in the repo. The full dossier is
[`.research/next-spec-architecture/`](../../.research/next-spec-architecture/conclusion.md).

## Decision Drivers

- **Retrieval is already solved.** [ADR-0017](0017-frontmatter-is-the-router-index.md) made spec
  frontmatter the router's index. Measured: the default read path is 48 KB against a 1.95 MB
  corpus — **2.5%**. `discover-specs` reads frontmatter and never bodies.
- **The independent oracle is load-bearing.** ADR-0016 requires the impl-judge to re-derive
  verification from an artifact it can fetch and that the producer did not write. Anything that
  dissolves that artifact costs the impl gate its foundation.
- **Proximity is a real and unmet want.** A spec beside its subject is read when the subject is
  read and is obviously stale when the subject changes without it. A parallel tree makes all
  three take deliberate effort.
- **Review, diff, blame, and grep are how humans audit.** They are also how the corpus is
  governed today, through PRs.
- **A quiet cost outranks a loud one.** Contradicting a written decision announces itself. A
  guarantee eroding under a green suite does not.

## Considered Options

### Option 1: Direction A entire — colocate, and move the suite down

- **Pros**: proximity; one artifact per subject; the suite in the tooling the subject already
  has; no per-form freeze artifact to invent four times.
- **Cons**: measured on `place-node`, the already-colocated native suite covers **5 of 7** frozen
  scenarios, missing exactly the negative boundary constraints, and includes a false green. See
  Rationale.

### Option 2: Direction B — externalize the corpus behind a query interface

- **Pros**: fewer files in the default read path; a corpus that can grow without a context cost.
- **Cons**: solves a cost measured at 2.5%; the store is **2.7×** the corpus and opaque;
  surrenders diff, blame, grep and line-by-line review; the oracle is uncalibrated.

### Option 3: Direction A's placement claim only — colocate, keep the frozen `.feature`

- **Pros**: takes the proximity win, which is real; leaves ADR-0016's oracle intact; freeze
  survives by construction, since colocation is a zero-delta rename.
- **Cons**: does not adopt A as written; leaves the node spec and its suite in a location the
  packaging must now exclude.

## Decision

**Adopt Option 3.**

1. **The node level is no longer path-bound to the project-spec tree.** A node's spec may live
   next to the subject it specifies. The corpus and project-spec levels are unchanged, and
   `.agents/specs/<project>/spec.md` remains the project spec and the router's index.
2. **The frozen `.feature` remains the gate-bound artifact.** It moves with its node. It is not
   replaced by Vitest, Storybook, `evals.json`, or any implementation-native suite.
3. **Implementation-native suites remain what ADR-0028 made them** — the inner layer, authored
   by the impl-producer, covering combinatorics the acceptance suite structurally should not.
   They sit beneath the frozen suite. They never become it.
4. **Agent separation is a complement to a frozen artifact, never a substitute.** Separation
   governs who may write. ADR-0016 needs something to re-derive *from*. Both, or the gate has no
   oracle.
5. **A generated summary is a view, never a ratified artifact.** Generate it freely. Nothing
   binds to it.
6. **Direction B is rejected.** The spec corpus stays ordinary, greppable, diffable,
   PR-reviewable repository content.

Because a node relocation is a `git mv` with zero content delta, it **preserves `@frozen`** and
is not a gate-able edit — this follows from `lifecycle-governance` as it already stands and
needs no new rule.

## Rationale

**Why B loses.** Its stated goal is "fewer files an agent pulls into context by default," and
the measured number of spec files an agent pulls into context by default is already
approximately zero — ADR-0017 stopped paying that cost two ADRs ago. Everything B spends is
therefore pure loss, and it was spent: a real `node:sqlite` store over the whole corpus occupies
5,218,304 bytes against 1,947,815 on disk, as a binary.

The decisive measurement is not recall. A ten-question benchmark of real mission questions
returned **6/10** top-5, against plain `grep`'s **9/10** over the same corpus (roughly 8/10 for
the oracle re-scored generously, still behind). But losing to `grep` is not what settles it —
**the misses are indistinguishable from the hits.** Asked which folders are reserved and not capabilities, the
store returned five plausible design documents, none of them the governance node that states the
rule, looking exactly as confident as the six correct answers. There is no calibration channel.
A model on top makes this worse: it converts a ranked list of snippets into fluent prose that has
lost a signal it never had. The issue's own objection — *this repo's specs are the product* —
holds, but it is not the reason. The reason is a 2.7× cost and the loss of review to solve 2.5%.

**Why A's placement claim wins.** Colocation is cheap exactly where it could have been fatal.
Freeze survives, because a pure rename is not a content change. Discovery survives, because
`discover-specs` works at project-spec level on the root `spec.md` — verified, all three project
specs still resolved after the move. The two real costs are countable and neither is fatal: 8
broken relative references for one node, all 8 caught immediately by `check-spec-references`,
which argues for a link-rewriting step rather than against the move; and a packaging problem,
since `plugins/sdd/package.json` ships `"files": ["skills", …]` and naively colocating would add
900 KB to a 583 KB tarball. That is a constraint on implementation, settled by an ignore entry.

**Why A's suite claim loses.** The trial subject was chosen as the best case: `place-node`
*already had* a colocated suite next to its implementation, so A2 cost nothing to try. It covers
5 of the 7 frozen scenarios. The two it misses are not an accident of effort — they are the
negative constraints, the claims that make a specification a specification rather than a
description: *the suggestion consults no stored routing registry*, and *place-node creates,
relocates, and edits no file*. Tests written from an implementation reach for what the code does.
They do not reach for what it must never do.

One case is worse than a miss. `main runs read-only and emits a suggestion` asserts only
`main(…) === 0`; the title claims the read-only property and the assertion never checks the
filesystem. It is a false green, it passes, and nothing in `pnpm verify` detects it. Had
`verify-scenarios` been wired in this repo, all six tests would have returned **UNBOUND** — their
titles are implementation vocabulary (`parseConcepts`, `suggestHomes`, `findNear`), not scenario
names.

**On the per-form freeze mechanism**, which issue #4 raises as an open question: freezing today
is already not a lock. It is a `@frozen` tag on a git-tracked file — a marker plus code review.
So "separation of agents instead of a frozen file" is not the clean substitution it appears to
be. Separation governs who writes; it produces no artifact to re-derive from. Applied at two
points in the loop, as the issue rightly notes, it is still one principle needing one artifact
between the two applications.

**On the unit of verdict**, the second open question: it stays the scenario key — `@id:<slug>` if
present, else the verbatim scenario name. Keeping the `.feature` is what keeps that unit
well-defined across four suite forms, which is precisely what A2 could not answer.

## Consequences

### Positive

- Proximity is won: a node spec beside its subject is read when the subject is read, moves when
  it moves, and is visibly stale when it does not.
- ADR-0016's independent oracle is untouched, and the impl gate's verdict unit stays defined.
- ADR-0028's layering is clarified rather than disturbed: native suites are the inner layer,
  permanently beneath the acceptance suite.
- Spec changes keep arriving as reviewable line-by-line diffs.

### Negative

- ADR-0033's "the filesystem already implies the levels" no longer holds at the node level. The
  three levels remain, but node location becomes a declared property rather than a path fact.
- Node specs colocated under `plugins/*/skills/` fall inside the published `files` glob and must
  be excluded explicitly. Until that lands, no node moves.
- Every corpus-walking check — `check-spec-structure`, `check-spec-references`, `concept-index` —
  must learn a second location. Today they walk one tree.

### Risks

- **The floor is not wired.** Root `pnpm check:specs` returned exit 0 with `place-node`'s spec
  *and* its frozen suite both deleted; the spec-gate floor (`check-spec-state`, `check-suite`) is
  reachable only through the plugin-level entrypoint. The same hole let a truncated spec node
  through green on issue #3, filed independently as
  [#5](https://github.com/cyberuni/cyber-sdd/issues/5). This decision is only as good as that
  check: an ordinary git-tracked, greppable, diffable file went unguarded because a check existed
  and was not wired in. Placement did not save it, and neither direction in #4 addresses it.
- Two locations for node specs during any transition is a real drift surface. Mitigated by
  migrating nothing until the checks walk both.

## Implementation Notes

Nothing migrates under this ADR. Three separate units of work follow, none of them a migration,
none started here:

1. A **link-rewriting move** for node relocation. Trial A broke 8 references for one node; all 8
   were caught mechanically, so the fix is mechanical.
2. A **packaging exclusion** for colocated node specs, settled before any node moves.
3. **Wiring the spec-gate floor into the commit path** — issue #5, independent of this decision
   and a precondition for acting on it.

Issue #3 is in flight against the current shape. This ADR keeps the frozen `.feature` and the
scenario map its pre-flight tell presumes, so #3 is reinforced rather than invalidated.

### On `cyber-truss`

Issue #4 frames both directions as `cyber-truss` concerns. Read against truss's own documents,
**truss claims neither**, and nothing here should be built there.

Truss is scaffold stage — every model page opens "Nothing described here is built," and its
package holds a CLI shell with no domain commands. What it owns is the connection graph and the
confluence guarantee: artifact-sets, connections, strain, lifting. Grepping its corpus for
`colocat|external store|database|SQL|detached branch|bead|retriev|quer|second brain` returns zero
hits. This is not a gap truss has claimed and left open; the axis is absent from its model.

Truss becomes relevant only once a *relation* must be stated between a spec and the code it
specifies — a candidate consumer of this decision, downstream of it. Calling this a truss concern
imports weight truss does not yet carry, and the decision is SDD's to make now.

### Where reasoning and the trial disagreed

Recorded here because issue #4 asks for it and it is the most useful finding.

Reasoning had the two halves of A backwards. **A1 looked like the disruptive half** — it
contradicts ADR-0033's path-bound levels, with knock-on effects on discovery, structure, and
freeze. **A2 looked nearly free** — ADR-0028 had already pushed combinatorics down, and the trial
subject already had its suite colocated.

The trial inverted it. A1 was mechanically cheap: freeze preserved by construction, discovery
untouched, costs detectable and bounded. A2 was expensive: a 2/7 hole on the smallest subject in
the repo, concentrated in the boundary constraints, plus a false green nothing detects.

The cause is worth keeping. Reasoning weighted A1 heavily because it contradicts a written ADR
and A2 lightly because it extends one — but **an ADR is cheaper to amend than an oracle is to
rebuild.** A1 costs a documented amendment. A2 costs ADR-0016's oracle, silently, while the suite
stays green. The reasoning ranked the loud cost above the quiet one, and was wrong to.

## Related Decisions

- [ADR-0033](0033-name-the-three-spec-levels.md) — the three spec levels. Amended: the node level
  is no longer path-bound to the project-spec tree.
- [ADR-0028](0028-suite-design-test-levels.md) — acceptance suite vs. inner unit tests. Refined:
  the inner layer stays beneath the frozen suite and never replaces it.
- [ADR-0016](0016-impl-judge-verification-independence.md) — the impl-judge's independent oracle.
  The constraint that decided A2 and rejected agent separation as a substitute.
- [ADR-0017](0017-frontmatter-is-the-router-index.md) — frontmatter as the router index. The
  measurement that rejected Direction B.
- [ADR-0029](0029-backfill-produces-and-rederives-from-the-cfg.md) — backfill re-derives from the
  CFG. Unaffected: the `spec.md` four-section shape and the scenario map both survive.
