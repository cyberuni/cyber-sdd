---
name: quill-builder-impl
description: "Partial Skill: invoke by name only — the Quill Builder bar at the impl gate — the document-integrity criteria a per-scenario check cannot reach. Loaded by the Quill impl-producer to self-align and by the impl-judge to verify. Not triggered by users directly."
user-invocable: false
metadata:
  actor: builder
  gate: impl
  compose: union
---

# Quill Builder-Impl Governance — the document-integrity bar

The **Builder** bar at the **impl gate**, specialized for documentation artifact-types
(`documentation`, `guide`, `tutorial`, `article`, `reference`). It **unions onto**
`sdd:builder-impl-governance` — the generic conformance bar still applies (checks derived from the
frozen `.feature`, no green-by-tampering); this adds the criteria a per-scenario check
**structurally cannot** reach. One merged bar read by **both** faces: `quill-doc-writer` forward
while authoring, `quill-judge` backward while running. `producer ≠ judge` holds at the agent level.

## Why the frozen `.feature` cannot carry these

A doc scenario names a passage and asserts a claim is present in it. Every defect below is a
relation **between** passages: every occurrence is well-formed against its own scenario, and only
the pair fails. A scenario per pair does not scale and would freeze the structure
`quill:quill-builder-spec` forbids freezing. So they are graded against this bar, once per document
(`.agents/specs/quill/design/doc-eval-model.md`, *The document-scoped check*).

## The bar

- **A claim appears in exactly one place.** A claim the document lands once and later passages refer
  back to is sound; the same claim re-narrated in a second passage is a defect, and the fix is
  anaphora, not deletion of either passage. Where the spec quantified the claim (`in exactly one
  place`), that scenario governs and this criterion is already enforced; where it did not, this bar
  reaches it.
- **A term keeps one subject class.** A term introduced for one kind of subject must not be
  predicated of another — a verb of holding is sound of a container (*a file carries a field*) and
  unsound of an act (*a matching carries the target*). Consistent term reuse is a virtue in
  agent-facing prose and is what produces this defect in reader-facing prose: the term propagates
  past the class it was coined for.
- **A route reaches every option the document named.** Where the document enumerates a set — its
  mechanisms, its arrangements, its kinds — and a later passage routes a case across that set, an
  option silently absent is a defect. The dropped option is usually the one introduced *between* the
  two the routing keeps, because the routing was drafted from the passage before the set was
  complete. Cite the enumeration and the routing that skips it.
- **No two passages assert incompatible claims.** A document that establishes *X reaches what Y
  cannot*, then routes a case away from X on the grounds that only Y is available, has contradicted
  itself; the second passage is usually the older one. Cite both, and state which claim the rest of
  the document depends on.
- **Evidence, or it does not fail.** A failure must quote **both** locations — the two passages
  landing one claim, the two uses whose subjects differ in class, the enumeration and the routing
  that skips a member, or the two incompatible claims. An unevidenced integrity finding is not
  reportable, which is what keeps this check an inspection rather than a style opinion.
- **The producer runs it before the judge does.** `quill-doc-writer` reads this bar forward, over
  the whole document and with no scenario list in hand — the reading position the per-scenario pass
  cannot occupy. Sentences written to satisfy individual scenarios are written to stand alone, so
  they restate their context; this pass is where that is caught.

## What this bar does not reach

Out of scope here, and not a `BLOCKER` when observed: tone, register, length, word choice, section
order, and whether a claim carries a neighboring sentence giving its mechanism. The last is a real
defect in `explanation`-type documents and is **writer-side** — it needs a judgment about what
counts as a mechanism, which no citation settles. Route it to the impl-producer's voice governance,
never to a gate.

## Precedence — a frozen scenario outranks this bar

Where a scenario requires what a criterion here would fail, the **scenario wins and the bar yields**:
the suite was ratified at the spec gate, and a bar that could veto a frozen scenario would make the
impl gate a second spec gate. Report the collision as an architect `OBSERVATIONS` entry so the
scenario is fixed where it lives, in the spec.

## Fail handling

An integrity failure is a `BLOCKER` carrying its two citations, returned for the conductor to re-run
`quill-doc-writer`. The impl-judge never edits the document to resolve one
(`sdd:ownership-governance`).

## Key points (read-check)

1. **Four document-scoped criteria** — a claim in exactly one place; a term in one subject class; a
   route reaching every option the document named; no two passages asserting incompatible claims.
2. **They are relations between passages**, so no frozen scenario can hold them — the bar does.
3. **Evidence or no finding** — quote both locations, or it is a style opinion and out of scope.
4. **The producer reads it whole and checklist-free**, which is the position that sees the pair.
5. **Tone, length, order, and mechanism-neighbors are out of scope** — the last is writer-side.
6. **A frozen scenario outranks the bar** — on a collision the scenario wins and the finding is an
   architect observation, not a `BLOCKER`.
