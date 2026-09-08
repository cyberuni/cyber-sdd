# Conclusion — adopt A's placement claim; reject A's suite claim and reject B

The citable file for this dossier. Reasoning in [`topic.md`](./topic.md), measurements in
[`evidence.md`](./evidence.md), artifacts in [`trial-a/`](./trial-a/) and [`trial-b/`](./trial-b/).

## The answer

**Direction A is adopted, on the placement axis only.** Direction B is rejected. A's second and
third claims — that the suite can move down into implementation-native tooling, and that a
generated summary can carry non-engineer readability — did not survive the trial and are
rejected with it.

This is a real adoption, not a hedge. A and B are opposed on one axis: A moves the spec toward
the reader, B moves it away. The trial answers that axis unambiguously in A's favor. What the
trial *also* found is that A bundles a second, separable claim which happens to be false.

## Answering the discriminator the issue named

The issue says the choice should fall out of distinguishing **placement** (where a fact lives
relative to its subject) from **retrieval** (how much corpus enters a context window), and asks
which is the expensive problem.

It is placement, and the margin is not close, because **retrieval is already solved**. ADR-0017
made spec frontmatter the router's index; `discover-specs` reads frontmatter and never bodies.
The default read path is 48 KB against a 1.95 MB corpus — **2.5%** (E1). Direction B's stated
goal is "fewer files an agent pulls into context by default," and the measured number of spec
files an agent pulls into context by default is already approximately zero. B optimizes a cost
the architecture stopped paying two ADRs ago.

Everything B spends to do it is therefore pure loss, and it was measured: the store is **2.7×
the size of the corpus** and is a binary — no diff, no blame, no grep, no line-by-line PR
review (E3). Its oracle recalls 6/10 on real mission questions where plain `grep` over the same
corpus recalls 9/10 — roughly 8/10 with generous re-labelling, still behind. But being beaten by
`grep` is not what settles it. **A hit and a miss are indistinguishable from the output.** "Which folders are reserved and not capabilities" returned
five plausible design documents, none of them the governance node that states the rule, looking
exactly as confident as the six correct answers. There is no calibration channel. Putting a
model on top makes it worse: it converts a ranked list of snippets into fluent prose that has
lost a signal it never had.

The issue anticipated its own strongest objection: *this repo's specs are the product*. That
holds. But it is not the reason to reject B. The reason is that B pays a 2.7× storage cost and
surrenders review, diff, and blame in exchange for solving a problem that measures at 2.5%.

## Why A's placement claim survives, and what it costs

A1 is cheap in exactly the places that could have killed it:

- **Freeze is unaffected.** Colocation is a `git mv` with zero content delta, and
  `lifecycle-governance` already states that a pure rename preserves the freeze and is not a
  gate-able edit. `git diff -M` confirms: 0 changed lines (E2).
- **The router is unaffected.** `discover-specs` operates at project-spec level on the root
  `spec.md`. Moving *nodes* does not touch it — verified, all three project specs still resolve.

Its two real costs are countable and neither is fatal:

- **8 broken relative links for one node**, against a corpus carrying 114 `../` links across
  157 files. This is a mechanical, detectable cost — `check-spec-references` caught all 8
  immediately — and it argues for a link-rewriting step in the move, not against the move.
- **The publish surface.** `plugins/sdd/package.json` ships `"files": ["skills", …]`. Naively
  colocating node specs there adds 900 KB to a 583 KB published tarball — a **154% increase**
  shipped to every consumer — and contradicts `spec-structure-governance`'s own rule to hoist a
  spec that cannot be excluded from what ships. This is a constraint on *how* A is implemented,
  not a refutation: an ignore entry settles it.

## Why A's suite claim does not survive

A2 says freezing is preserved but re-mechanized per form, and that the suite takes whatever
shape the subject's tooling already has. The trial subject was chosen because it is the
best case for that claim: `place-node` **already has** a colocated suite next to its
implementation, so A2 for this subject costs nothing to try.

It covers **5 of the 7 frozen scenarios** (E2). The two it misses are not an accident of
effort — they are the negative constraints, the boundary claims that make a specification a
specification rather than a description: *the suggestion consults no stored routing registry*,
and *place-node creates, relocates, and edits no file*. Unit tests written from the
implementation reach for what the code does. They do not reach for what it must never do.

And scenario 7 is worse than missing. `main runs read-only and emits a suggestion` asserts
only `main(…) === 0`. The title claims the read-only property; the assertion never checks the
filesystem. It is a **false green**, it passes, and nothing in `pnpm verify` detects it. Had
`verify-scenarios` been wired here — there is no `scenario-bridge.toml` in this repo — all six
tests would have returned **UNBOUND**, because their titles are implementation vocabulary
(`parseConcepts`, `suggestHomes`, `findNear`) rather than scenario names.

This also answers A's open question about the per-form freeze mechanism and agent separation.
Freezing today is *already* not a lock: it is a `@frozen` tag in a git-tracked file, a marker
plus code review. So "separation of agents instead of a frozen file" is not the clean
substitution it appears to be. ADR-0016 requires the impl-judge to independently re-derive
verification from an oracle it can fetch and that the producer did not write. Agent separation
governs **who writes**; it supplies no artifact to re-derive *from*. It is a complement to a
frozen artifact, never a replacement for one. Applied at two points in the loop, as the issue
notes — but two applications of one principle still need one artifact between them.

A3 falls with A2. A generated summary is a **view**, and views are fine; the error is the word
*instead*. The `.feature` is simultaneously the non-engineer-readable surface and the thing the
gates bind, and those two roles are not separable by generating one from the other — the
generated artifact is derived, so it cannot be what ratifies. Trial B measured what happens
when an agent answers from a derived view rather than the text: confidently plausible, and
uncalibrated. Generate the summary; do not let it be the contract.

## Where the reasoning and the trial disagreed

The issue asks for this explicitly and says it is the most useful finding. It is.

Reasoning, before the trial, had the two halves of A backwards.

**A1 looked like the disruptive half.** ADR-0033 ties the three spec levels to filesystem paths
— "the filesystem already implies the levels." Moving nodes out of the tree reads as an
amendment to the corpus's identity, with knock-on effects on discovery, on the
two-levels-never-three structural rule, and on freeze state. **A2 looked like the safe half**,
nearly free: ADR-0028 had already pushed combinatorics down into producer-authored unit tests,
and the trial subject already had its suite colocated. A2 looked like formalizing something the
repo had half-done.

The trial inverted it. **A1 was mechanically cheap** — freeze preserved by construction,
discovery untouched, the only costs a detectable link-rewrite and a packaging decision. **A2
was the expensive half**: a 2/7 coverage hole on the smallest subject in the repo, concentrated
precisely in the boundary constraints, plus a false green that every check in the repo passes
over.

The disagreement has a cause worth keeping. Reasoning weighed A1 heavily because it contradicts
a written ADR, and weighed A2 lightly because it extends one. But **an ADR is cheaper to amend
than an oracle is to rebuild.** A1 costs a documented amendment; A2 costs the independent
oracle ADR-0016 is built on, and costs it silently — the suite stays green while the contract
erodes. Contradicting a decision on record is loud and self-announcing. Eroding a guarantee is
quiet. The reasoning ranked the loud cost above the quiet one, and it was wrong to.

E5 is the same lesson from a third direction: a check that existed but was not wired let a
truncated spec node through `pnpm verify` green. What is not mechanically enforced is not held,
regardless of where the file sits.

## On cyber-truss

The issue frames both directions as `cyber-truss` concerns — settled state outliving every
mission. Read against truss's own documents, **truss claims neither** (E4).

Truss is scaffold stage; every model page opens "Nothing described here is built," and its
package holds a CLI shell with no domain commands. What it does own is the connection graph and
the confluence guarantee — artifact-sets, connections, strain, lifting. Grepping its corpus for
`colocat|external store|database|SQL|detached branch|bead|retriev|quer|second brain` returns
zero hits. This is not a gap truss has claimed and left open; the axis is not in its model.

So this decision is SDD's to make now, and nothing here should be built in truss. Truss becomes
relevant only once a *relation* must be stated between the spec store and the code it
specifies — a candidate consumer of this decision, downstream of it, not the decision-maker.
Saying "this is a truss concern" imports weight truss does not yet carry.

## What follows

Recorded as **[ADR-0034](../../docs/adr/0034-colocate-the-node-spec-keep-the-frozen-suite.md)**.
Nothing here migrates: the corpus was restored to `0e35688` after each trial and the trial
branch deleted. The `*-next` work this points at — the link-rewriting move, the packaging
exclusion, and wiring the spec-gate floor into the commit path — is not started here.
