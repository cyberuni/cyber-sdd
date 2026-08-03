# Conclusion — documentation craft above the page level

## Last updated

August 2026.

## Question

What governs documentation quality above the single page, and **which of it is solid enough to encode
as an automated gate criterion** rather than left as authoring guidance?

## Verdict

**Split by instrument, not by subject.** Inspection checks retrievability, declaration-agreement, and
route completeness — mechanically, with mandatory citation. Craft is judged, not linted: a separate
reader-simulating judge carries a **catalog of named defects**, graded, with a deliberate-violation
defense, and does not gate until calibrated. The evidence puts the line there; §2 records which part
of that is measured and which part is our inference.

### 1. Reframe the duplication criterion: the defect is unresolvable presupposition, not recurrence

The measured cost in comprehension attaches to a passage whose given information has **no retrievable
antecedent** — 181 ms of bridging inference in the original experiment (E01). Verbatim repetition,
tested directly as a rival explanation, produced **no benefit and a 19 ms difference in the wrong
direction** (E03).

So "a claim must appear in exactly one place" has **no empirical warrant**, and should be dropped as
the headline criterion. What replaces it is narrower and better grounded:

- a passage may **restate** a claim freely — recurrence is not itself a defect;
- a passage may **not presuppose** what the reader has no way to retrieve;
- and the failure mode symmetrical to duplication — a **bare cross-reference** that withholds the
  content — is the *worse* one for a reader who arrives cold, since it guarantees the bridging cost
  instead of merely risking it (E01 + E09 + E11 converging).

Confidence: **high** for the within-page claim; **medium** across pages, because the transfer from
within-text coherence to cross-page structure is an inference, not a measured result (E14).

### 2. No craft **lint** — but a craft **judge** is admissible, and that distinction is ours to draw

The most concrete statement of the principle we would want to check is Gopen & Swan's (E04) — and the
same article forecloses its use as a rule (E05): *"None of these reader-expectation principles should
be considered 'rules.' … There can be no fixed algorithm for good writing."* Their stated reasons are
structural, not modest: too many expectations operate simultaneously to decide any one in isolation,
and any of them can be violated to good effect.

This also answers the second design limit directly. **A control-flow graph plus a claim list cannot
produce well-crafted prose**, and no extension of the *contract* will, because the remaining craft is
a system of simultaneous defeasible expectations rather than a set of conditions. That is a limit on
what a specification can carry — not, as the next paragraph argues, a limit on what a reader can be
asked to detect.

**The sources predate the judge we actually have** (E16). Gopen & Swan's two reasons were aimed at a
1990 decision procedure, and they do not fare equally under a 2026 one:

- *"too many reader expectations are functioning at any given moment for structural decisions to
  remain clear and easily activated"* — this is a claim about a procedure's capacity to hold many
  simultaneous expectations, which is the specific limit an LLM judge does not have (E17). **Does not
  transfer.**
- *"any reader expectation can be violated to good effect"* — **transfers intact**, and constrains
  the process rather than the possibility. A judged criterion must let the producer mark a deliberate
  violation and defend it, exactly as a human editor allows.

So the finding is sharper than "don't check craft": **do not encode craft as a lint; a judge may
carry it.** The revised split is by *instrument*, not by *subject matter* —

| Instrument | Carries | Verdict |
|---|---|---|
| **Inspection** (boolean, mechanical) | retrievability, declaration-agreement, route completeness | pass/fail with mandatory citation |
| **Judgment** (graded, reader-simulating) | craft defects — the catalog, not a quality standard | graded, with a deliberate-violation defense |

Two conditions on the judged tier, both from evidence already in this repo (E18): it must run in a
**separate agent** — LLM self-verifiers are unsound as their own critics while a separate verifier
reverses the loss — and it must be **calibrated against the corpus it will police** before it gates
(D2). A criterion that fires on a document the team accepts is miscalibrated, and calibration is the
empirical test the E17 inference currently lacks.

Confidence: **high** that a lint is ruled out (E05, direct quotation); **medium** that a judge is
admissible (E17 is our inference, and D2 is the test that would settle it).

### 2b. Detect bad writing; do not certify good writing

The asymmetry is the whole design. Good prose is unbounded and cannot be enumerated; bad prose
recurs in a small number of named, citable failure modes. A judged tier should therefore be a
**defect catalog** — each entry a shape the judge can point at, quote, and be wrong about in a way
the producer can rebut — and never a standard of quality that a document must reach.

### 3. Whether redundancy helps is a function of the declared audience, and it reverses

Low-knowledge readers benefit from explicit, gap-filled, redundant text; high-knowledge readers can do
*better* on deep measures with a less coherent text, because the gaps force integration (E06). There
is therefore no audience-independent setting of the duplication dial.

A doc spec that declares its audience and its prerequisites already carries the deciding input. That
makes the checkable question **agreement**, not quantity: *does the presupposition this passage
encodes match what the spec says the reader can be assumed to have?* A page whose spec declares a
sibling "complementary, not prerequisite" and whose prose nonetheless marks that sibling's content as
given has contradicted its own contract — and both artifacts are in hand at the gate.

Confidence: **medium-high**. The effect is well replicated; it was read here through abstracts and a
database record rather than in full (E06).

### 4. Ordering is a corpus property, and no framework in this set supplies it

Diátaxis is a typology of documentation *kinds*, not an information architecture — it does not
prescribe order or navigation among its four quadrants (E07), so it cannot answer the ordering
question. EPPO answers the opposite question well (arrival anywhere ⇒ standalone topics, E09) and by
design refuses to model a reading order at all.

Nothing found operates at site level with empirical grounding (E13). Cross-page ordering, foreshadow
marking, and claim overlap across pages are therefore **corpus-level, judgment-bearing** concerns:
appropriate for a continuous corpus-wide review loop, not for a per-page boolean gate. A prospective
marker is only correct while the site's order holds, so reordering a section can silently falsify
wording in a page nobody edited — drift that a per-document gate structurally cannot see.

Confidence: **high** that the frameworks don't supply it; **medium** that a corpus loop is the right
home (that is our design inference, not a finding).

## Strongest supporting evidence

- **E03**, the repetition null — the load-bearing result. It converts "don't duplicate" from a rule
  into a misdiagnosis, and points at the mechanism that actually costs the reader.
- **E01**, the 181 ms direct-vs-indirect antecedent effect, with a Negative-antecedent control.
- **E05**, Gopen & Swan disclaiming rule status in their own text.

## Strongest weakening / contradictory evidence

- **E06** cuts against any fixed redundancy setting, including the one this conclusion recommends —
  it makes the right answer audience-relative, so a gate that ignores declared audience will be wrong
  for one of the two reader classes.
- **EPPO vs. single-sourcing** is an unresolved conflict in the field (`topic.md`), and both sides are
  practitioner positions. We are siding with EPPO on evidence from a different discipline, not on
  evidence from technical communication.
- **E08**: Diátaxis's warrant is adoption. Widely-followed is not the same as validated, and this
  applies to every framework here except minimalism (E12).

## What is not supported

- That a claim appearing twice in a document is a defect (E03).
- That old-before-new, topic/stress placement, or any Gopen & Swan principle can be gate criteria (E05).
- That Diátaxis, EPPO, or Information-Mapping-style frameworks have empirical validation — only
  minimalism does, among those examined (E08, E10, E12).
- Any claim about cross-page repetition resting on measurement (E14).

## Where evidence is thin

- **Cross-page transfer (E14)** — the weakest joint. Every corpus-level recommendation here is an
  inference from within-text results.
- **E06** read secondhand; **E12** read secondhand.
- **E07/E10** are observed absences on the pages consulted, not exhaustive reads of book-length works.

## What to check again later

- Whether any site-level documentation quality rubric with measurement behind it has appeared (E13).
- Prince 1981 and Halliday & Hasan, for a citable inventory of *lexical markers* of givenness — the
  thing that would make "marked as given" judgeable from the sentence rather than from taste (E15).
- Whether the technical-communication literature has since produced anything empirical on repetition
  across a documentation set (E14).

## Landed in

Not yet consumed by any ADR or governance. Intended consumers: `quill-builder-impl` (the integrity
criteria), `quill-builder-spec` (prerequisite declaration), and a prospective formation-loop check for
cross-page claim overlap.
