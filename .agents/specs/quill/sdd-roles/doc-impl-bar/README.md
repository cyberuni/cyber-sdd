---
spec-type: reference
concept: production-chain
---

# doc-impl-bar — the document-integrity bar

## Subject

The shipped governance `quill-builder-impl` (`plugins/quill/skills/quill-builder-impl/`) — Quill's
**Builder bar at the impl gate**, filling the `builder-impl` slot in the squad's registry entry and
unioning onto `sdd:builder-impl-governance`.

It specifies what an authored document must satisfy **beyond** conforming to its frozen scenarios,
and it carries **both** of Quill's document-scoped instruments
([`../../design/doc-eval-model.md`](../../design/doc-eval-model.md)):

| Instrument | What the bar holds | Verdict |
|---|---|---|
| **Inspection** | one enumeration rule — a route reaches **every option the document named** | boolean |
| **Judgment** | the **defect catalog** — named prose defects, each with a citation rule and a near-miss that must not fire | graded |

Both run once per document rather than once per scenario.

**Why neither can be a scenario.** The four checks in
[`../../design/doc-eval-model.md`](../../design/doc-eval-model.md) are scenario-scoped — each reads
only the passage its scenario names. These defects are relations *between* passages: every
occurrence is well-formed against its own scenario, and only the pair fails. A route that skips an
option still lands the destination its scenario asserts, so the sibling it dropped never surfaces.

**The split is by how a verdict is reached, not by which file the criterion lives in.** The
enumeration rule compares two structured, enumerable things, so a comparison settles it. Term class,
contradiction, and unretrievable presupposition each require reading *as a reader*, so no comparison
settles them — they are the catalog's seed. Requiring evidence with a citation disciplines a finding;
it does not make one mechanical, and an earlier revision of this node mistook the one for the other.

**The boundary against style is evidence at both instruments**, which leaves tone, register, length,
word choice, and section order unassertable — the same prohibitions `doc-spec-bar` places on the spec
side. The catalog additionally **detects defects and never certifies quality**: zero findings is not
an endorsement.

A **reference artifact**: a real shipped thing with no testable surface of its own, so it carries no
`.feature`. Its criteria are exercised through the documents it grades.

**Two faces read it.** `doc-writer` (`quill-doc-writer`) reads it forward, over the whole document
with the scenario list set aside; `judge` (`quill-judge`) reads it backward at the impl gate. The
judged pass is the one exception to reading it forward-and-backward from the same text: its first
pass simulates a reader **blind to the catalog**, and only the scoring pass holds it.

**One agent, two contexts.** `quill-judge` runs both instruments and scores the judged pass itself;
only the reader simulation is dispatched, because a judge holding the catalog cannot be its own blind
reader. A second scoring agent was considered and rejected — the judge's boolean verdicts are already
anchored to artifacts it did not author, so a graded reading cannot move them, and another agent
would add a hop without adding an anchor.

**The producer's defense channel is `verification.md`.** A deliberate violation is recorded under
`## Deliberate violations` — entry, location, rationale — in the file the judge already runs and
never authors. The judge reads it in the **scoring** pass only; handing it to the blind reader would
name the entry and the location, which is the leak the split exists to prevent.

**Calibration state is per entry, and lives in the bar** beside the entry it governs. All nine are
advisory, so the catalog is non-blocking by design until a row carries a measured false-positive rate
and a named corpus.

**Non-goals** — the four scenario-scoped checks
([`../../design/doc-eval-model.md`](../../design/doc-eval-model.md)); what a doc `spec.md` must
contain, including the scenario-map rule that requires a claim be retrievable on each control-flow
path reaching it ([`../doc-spec-bar/`](../doc-spec-bar/)); the generic conformance bar it unions onto
(`sdd:builder-impl-governance`).

**No longer a non-goal.** The mechanism-neighbor question in `explanation`-type prose was routed
writer-side on the grounds that *no citation settles it*. That was the right call for a lint and the
wrong one for a judge, and it returns as a catalog entry.
