---
spec-type: reference
concept: production-chain
---

# doc-impl-bar — the document-integrity bar

## Subject

The shipped governance `quill-builder-impl` (`plugins/quill/skills/quill-builder-impl/`) — Quill's
**Builder bar at the impl gate**, filling the `builder-impl` slot in the squad's registry entry and
unioning onto `sdd:builder-impl-governance`.

It specifies what an authored document must satisfy **beyond** conforming to its frozen scenarios:
a claim lands in **exactly one place** (later passages refer back), and a term keeps **one subject
class**. Both are graded once per document rather than once per scenario.

**Why it cannot be a scenario.** The four checks in
[`../../design/doc-eval-model.md`](../../design/doc-eval-model.md) are scenario-scoped — each reads
only the passage its scenario names. These two defects are relations *between* passages: every
occurrence is well-formed against its own scenario, and only the pair fails. A restated claim in
fact satisfies its scenario twice, so an unquantified suite scores redundancy above concision.

**The boundary against style is evidence.** A finding must quote both locations, which keeps the
check an inspection and leaves tone, register, length, word choice, and section order unassertable —
the same prohibitions `doc-spec-bar` places on the spec side.

A **reference artifact**: a real shipped thing with no testable surface of its own, so it carries no
`.feature`. Its criteria are exercised through the documents it grades.

**Two faces read it.** `doc-writer` (`quill-doc-writer`) reads it forward, over the whole document
with the scenario list set aside; `judge` (`quill-judge`) reads it backward as a fifth,
document-scoped pass at the impl gate.

**Non-goals** — the four scenario-scoped checks
([`../../design/doc-eval-model.md`](../../design/doc-eval-model.md)); what a doc `spec.md` must
contain, including the scenario-map rule that quantifies a claim's place count
([`../doc-spec-bar/`](../doc-spec-bar/)); the generic conformance bar it unions onto
(`sdd:builder-impl-governance`); the mechanism-neighbor question in `explanation`-type prose, which
no citation settles and which stays writer-side.
