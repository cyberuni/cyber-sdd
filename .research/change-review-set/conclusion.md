# Conclusion — Change Review Set

> **Third pass (2026-08-12).** Pass 1 derived four sets per change and declared them per spec node.
> Pass 2 moved the description onto the **artifact type**. Pass 3 narrows it again, and this is the
> live version: the missing piece is a **directed companion relation** between file kinds — when
> `SKILL.md` changes, the `README.md` beside it enters the **review** set — consumed as a
> **blast-radius input**. That needs neither a unit concept nor an amendment to the artifact-type
> model; both are retracted. See `changes.md`. §§2–5 have survived all three passes; the verdict,
> §1 and §6 are pass-3 text.

## Question

What set of documents does a change belong to; which of the four candidate sets named in #453 are
mechanically derivable and which need a declaration; can the existing blast machinery answer this;
how must the answer degrade so a short set cannot pass as a complete one; what does wrap-safety
cost in this corpus; and what does the screaming-architecture rule say one level down?

## Verdict

**The missing piece is a directed companion relation between file kinds, and it is an input to blast
radius.** When `SKILL.md` changes, the `README.md` beside it must be **reviewed** — the same shape as
a Storybook `*.stories.tsx` whose companion `*.mdx` needs re-reading whenever the story moves. That
is not a set to derive per change, and it is not a unit to describe per artifact type. It is a
**pairwise, directed rule keyed on filename pattern and locality**, and it expands the touch-set that
blast is computed over.

The corpus states the problem in one number. Over 2449 non-merge commits, `README.md` → `SKILL.md`
co-changes **83.7%** of the time, while `SKILL.md` → `README.md` co-changes **38.0%** (E30). A README
almost never moves without its SKILL; a SKILL moves without its README two times in three. **That
45.7-point asymmetry is the defect, measured** — and it is why the relation has to be *directed*.
A symmetric "these belong together" would have looked healthy from the README side and hidden it.

The candidate rules do not even need declaring: they **mine out of git history**. Ranking every
same-directory file-kind pair by its directional gap puts `*.md` → `README.md` at 55pt, `*.md` →
`*.feature` at 53pt, and `SKILL.md` → `README.md` at 46pt — against `*.mts` → `*.test.mts` at 8pt and
`README.md` → `*.feature` at 7pt (E31). The gap cleanly separates drift-prone pairs from discipline
that is already honored. Only the decision about which candidates to **enforce** needs a human.

And the 38% forward rate settles the mechanism's shape: a check that *fails* when the companion did
not change would fire on two of every three skill commits and be ignored within a week (E32). What
the relation produces is a **review set**, never an edit requirement — exactly what blast radius
already does, which is widen what gets **examined**, never what gets **edited**. A companion that
needs no change is a correct outcome; the requirement is that it was **seen**.

**What this retracts.** Pass 2's unit-shape-per-artifact-type, and the binding-granularity amendment
to `design/artifact-type.md` it needed, are **not required** and are withdrawn. A companion rule is
keyed on filename pattern and locality; the companion's own artifact-type is irrelevant to whether it
needs review. The E26–E29 tension — a unit is multi-file while the type key is per-file — is
**dissolved rather than solved**: it existed only because pass 2 was trying to make the members of a
multi-file set share one type, and a directed pairwise relation never asks that.

**What survives.** The cross-layer case (`SKILL.md` → its spec-corpus node, → its docs page) cannot
be written as a filename pattern — the names diverge (E07) and the website layer has no edges at all
(E11). That is the one place a declaration is still owed, and it is now the *only* one.

## 1. What a pattern knows, and what it cannot

#453's four sets split by **what kind of thing can answer**:

| Set | Answered by | Status |
|---|---|---|
| **Skill folder** | a **companion rule** — `skills/*/SKILL.md` → `./README.md` | Pattern + locality. Candidates mine from history (E31); only enforcement is a decision |
| **Layer set — cross-layer** | a **declaration** — which spec node, which docs page | **Not derivable.** Names diverge (E07); the website layer has no edges (E11). The one residual |
| **Citation set** | neither | Over-generates by an order of magnitude — 94 files for `"entry point"` where the real set was ~6 (E15) |
| **Cross-link set** | already shipped | `concept-index` renders `concept → {nodes}`, CI-guarded by `--check` (E10) |

The reduction across passes is the point. Pass 1 needed four mechanisms over four graphs; pass 2
reduced that to one description per artifact type plus a residual; pass 3 reduces it to **a pattern
table plus the same residual** — and the pattern table's *contents* are mined, not authored.

Why the cross-layer edge still resists: a companion rule can only say "the file at this pattern,
relative to the changed one." Across layers the target is renamed (`check-retired-terms` ↔
`corpus/retired-terms`, `spec-format-governance` ↔ `authoring/spec-format`, E07), sits at a depth path
recovery gets wrong for 61% of nodes (E06), or does not exist as an edge at all (E11). No pattern
recovers a target that was renamed.

## 2. Extend the blast machinery, or a distinct calculation?

**Distinct calculation, shared substrate.** Unaffected by the reframe. Four reasons, in descending
strength:

- **The output types are incompatible.** `blast-estimate` returns a level on a three-point lattice.
  A review set is an enumerated set of paths. Folding a set into a scalar destroys precisely the
  information #453 wants, and there is no seam in the bucketed arithmetic where a set could survive.
- **The graphs are different.** `blast-estimate`'s centrality is mention-based fan-in between *work
  areas*. The review set is an edge between *documents that carry the same claim*. A work area with
  high fan-in is not thereby a document set.
- **`blast-estimate`'s own boundaries forbid it.** It "consumes" a touch-set and explicitly does not
  "*produce*" one. A review set is a **touch-set expansion**, which sits **upstream** of blast, not
  inside it. That also gives the composition order the intake benefit in #453 wants: expand the
  touch-set by artifact type, then let the expanded set feed blast.
- **The failure directions differ.** An under-called blast level *modulates a conductor's judgment*.
  A short review set **is** the answer, and reads as complete.

Under the reframe the reuse boundary gets cleaner, not blurrier. `fileToNode` / `discoverLayouts`
remain the substrate for *work-area recovery*; artifact-type resolution is a **separate, already
specified** path from file to key (E24) that does not go through `fileToNode` at all. The review-set
engine consumes the second, not the first — which is why §6 no longer needs `fileToNode`'s depth-1
limitation fixed.

One inherited hazard to design around: `discoverLayouts` swallows every failure and returns `[]`
(E19). Downstream of blast that fails safe — zero resolved areas computes `unknown`, not `low`. An
empty *set* has no such fallback unless one is built; see §3.

## 3. How the answer must degrade

Unchanged across all three passes, and the constraint that decides whether the mechanism helps or hurts.
**The repository has already written the doctrine down** — it has simply never been applied to a
set-shaped output.

`blast-estimate` states it as a rule: unresolved areas are "surfaced, never dropped"; a touch-set
resolving to zero areas computes `unknown`, "**never `low`**"; every read failure except `ENOENT`
fails loud, because swallowing them "fails in the **dangerous direction**" (E18).
`check-retired-terms` states it from the other side: "a **malformed registry never reports clean** —
the registry *is* the check" (E18). `check-scenario-overlap` and `resolve-governances` show the
structural form: bucketed candidates, **no verdict from the engine** (E16, E17).

Four requirements for a review-set engine:

1. **Never emit one flat set.** Companions from a **matched rule** — complete by construction —
   separate from anything **heuristic**. Different warrants must not print as one list.
2. **Emit coverage, not just members.** "No rule matched this file" and "a rule matched and found no
   companion" are opposite answers that look identical in a bare list.
3. **A dangling or malformed declaration fails loud.** A rule whose companion pattern resolves to a
   path that does not exist is an error, never a silent omission — the same way a malformed registry
   never reports clean (E18).
4. **No matching rule yields `unknown`, never `[]`.** An empty array reads as "nothing else to
   review." This is `unknown`-not-`low` transposed to a set, and it is the one requirement that keeps
   a nearly-right answer from being worse than none.

Pass 3 adds a fifth, specific to a *directed* relation: **the report must name the rule that fired**,
not only the companion. A reviewer told "also look at `README.md`" cannot tell whether that came from
a 46pt-gap rule or a 7pt one, and the rules differ in how much they should be trusted (E31).

## 4. Wrap-safety

Unchanged by the reframe; it is a property of matching, not of framing.

Measured: **1213 bold spans and 105 inline-code spans straddle a newline**, across 881 tracked
markdown files — 5.3% of all bold spans, in a corpus that states its rules in bold (E14). For real
phrases from #437, whitespace-normalized matching reaches strictly more files than line-oriented
matching: `"entry point"` 90 → 94, `"use case"` 93 → 95 (E15). The miss rate rises with phrase
length, which is the wrong direction — the more specifically a phrase identifies a rule rather than
a common word, the likelier a line sweep misses a site.

`check-scenario-overlap` already normalizes whitespace and case before fingerprinting and is
wrap-safe by construction (E16). `check-retired-terms` does not — it splits on `\n` and tests
`includes` per line (E12) — but the defect is **latent, not live**: the live registry holds one
entry, `artifacts/specs/`, a path with no whitespace that reflow can never break (E13). It activates
silently the first time that registry admits a multi-word phrase.

**Requirement:** normalize whitespace before matching, retaining an offset→line map so reporting
stays `file:line`. **Recommendation:** migrate `check-retired-terms` before its registry admits a
phrase, not after.

The reframe reduces how much rides on this. A type-described unit is matched by **path**, not by
phrase, so the folder and layer members never go through a text sweep at all. Wrap-safety stays
mandatory for anything citation-shaped (§6, increment C) and for reading the residual identity
declaration, which is exactly where it already bites — the path wraps in 11 of the 12 existing
declarations (E09).

## 5. Screaming architecture, one level down

The tempting extension — "one capability per node" becomes "one concept stated in one place" — is
**not available**, and this repository has already ruled it out on evidence.
`.research/documentation-craft/conclusion.md` finds "a claim must appear in exactly one place" has
"no empirical warrant, and should be dropped": a passage "may **restate** a claim freely — recurrence
is not itself a defect," and the symmetrical failure is "a **bare cross-reference** that withholds
the claim" (E21). #453 half-anticipates this, calling a concept in a shipped artifact, its spec, and
its public explanation "a legitimate layering, not duplication."

The correct one-level-down statement is about declaration, not uniqueness:

> One concept has one **home**. Restating it elsewhere is legal — and often required by layering —
> but the **shape of the layering is declared**, so the set of restatements is derived rather than
> remembered.

Each pass moved that declaration further from the instance and closer to the structure. Pass 1 put
it on every restating document; pass 2 put it on the artifact type; pass 3 puts most of it in a
**convention that history already reveals** — `skills/*/SKILL.md` sits beside a `README.md` because
that is how skills are laid out, and the mining reads that layout back out of the commit log without
anyone declaring it (E31). That is the same economy screaming architecture buys at the node level:
the structure declares itself, and instances never re-declare it. What remains declared is only what
the layout genuinely does not encode — the cross-layer edge, where the target was renamed.

Where it belongs is still open. `formation-loop` is the only corpus-wide continuous loop, but its
charter is that it "evolves how the corpus is **arranged**, never what it says" (E20), and a
set-membership check is a claim about what the corpus says. `documentation-craft` independently
places cross-page claim overlap in "a continuous corpus-wide review loop, not a per-page boolean
gate" (E21). Those are in tension and this dossier does not resolve it: either formation's charter
widens, or a second loop is needed, or the check runs verify-time and corpus-wide the way
`check-retired-terms` does without belonging to any loop. **The third is cheapest and is what §6
assumes**; the first two are decisions for someone else.

## 6. Recommendation on scope

Two increments, plus one deferred. Smaller than either previous pass, and the first one's *content*
is mined rather than authored.

### A — a directed companion-rule table, consumed as a touch-set expansion (the missing piece)

A declared table of rules, each `(trigger pattern, companion pattern, locality)`:

| trigger | companion | locality |
|---|---|---|
| `**/skills/*/SKILL.md` | `./README.md` | same directory |
| `.agents/specs/**/README.md` | `./*.feature` | same directory |
| *(the Storybook shape)* `**/*.stories.tsx` | `./$1.mdx` | same directory, same basename |

**Directed, not symmetric.** Only the low-rate direction is worth a rule: `SKILL.md` → `README.md`
fires 1039 times at 38%, while the reverse is already honored at 84% (E30). Encoding the reverse
would add nothing. Encoding a *symmetric* rule would have hidden the defect entirely, because from
the README side the pair looks healthy.

**Which rules to enter is an empirical question with an answer.** Mine the directional gap over
history and take the high-gap pairs: 55pt, 53pt, 46pt are candidates; 8pt and 7pt are already-honored
discipline where a rule would fire on healthy commits about a quarter of the time and be tuned out
(E31). Re-run the mining periodically — a pair that closes its gap is a rule that has done its job
and can be retired.

**It expands the review set; it never requires an edit.** At a 38% forward rate a hard gate fires on
two of every three skill commits (E32). The companion enters what must be **examined**, and "no
change needed" is a correct outcome. This is exactly what blast radius already does — §2's
composition order, now with a concrete producer: **companion expansion → expanded touch-set → blast**.
It also delivers the intake benefit #453 names, since the declared blast then reflects documents that
must move together rather than only code areas.

**Wrap-safety does not bite here.** Companion rules match **paths**, not prose, so §4's normalization
requirement applies only to the residual declaration in B and to anything citation-shaped in C.

**No amendment to `design/artifact-type.md` is required.** A companion rule does not ask what type
the companion is. Pass 2's unit shape and binding-granularity amendment are withdrawn (E26–E29).
Artifact-type may still be a reasonable *home* for a plugin to ship rules covering the types it owns,
but that is a packaging choice, not a precondition.

### B — the cross-layer residual

A pattern cannot reach `SKILL.md` → its spec-corpus node → its docs page: the names diverge (E07),
path recovery is wrong for 61% of nodes (E06), and the website layer has no edge in either direction
(E11). Promote the twelve existing prose declarations (E08) into machine-readable frontmatter. Three
checks, each following the E18 doctrine: a declared path that does not exist **fails loud**; a folder
claimed by two nodes **fails loud**; an unclaimed folder is reported as **coverage**, never a
violation.

Convert the twelve once from a hand-verified list — **do not build a parser for the prose form**
(E09: the path wraps onto the next line in 11 of 12). Do not fall back to name inference (E07). Do
not overload `concept:` — a many-to-many concern, where this is an identity edge.

This is now the **only** declaration the design owes, and it is twelve lines of frontmatter.

### C — the citation set (defer)

Unchanged. Only after A and B, and only in the `check-scenario-overlap` shape: normalized matching
(§4), `derived` and `candidates` bucketed separately, an explicit judgment arm, no verdict from the
engine (E16, E17). **Do not build it on a phrase sweep alone** — a 94-file candidate list for a
two-word phrase will be ignored within two change requests, and an ignored check is worse than an
absent one because it occupies the slot.

### The case none of this catches

E25 survives every increment: `design/artifact-type.md` says a node README carries "`spec-type` only
— **never** an artifact-type field," while `design/spec-structure.md` says the classification
frontmatter is "`spec-type`, `artifact-types`, and `concept`." Measured, 0 of 127 nodes carry
`artifact-types:` and the enforcing engine parses only `concept` and `spec-type` — so the corpus
follows the first and the second states a retracted rule, **in the spec that defines the corpus's own
structure rules**.

Not a companion pair (two rule documents, neither the other's derived view), and not a cross-link set
either — they carry *different* `concept:` tags, so `concept-index` would not group them. It is
citation-shaped, which is the increment being deferred. The deferral has a live cost, and E25 is
worth fixing on its own regardless.

### Not recommended

- **A hard gate on companion co-change** (E32).
- **Symmetric companion rules** — the asymmetry is the signal (E30).
- **Rules for already-honored pairs** like `*.mts` → `*.test.mts` (E31).
- **Extending `blast-estimate`** to emit the review set (§2) — it *consumes* the expansion.
- **A unit shape per artifact type**, or any amendment to `design/artifact-type.md` (withdrawn).
- **Declaring the unit per spec node** (pass 1's proposal, withdrawn).
- **Adopting "one concept stated in one place"** as a rule (§5, E21).

## Strongest supporting evidence

- **E30** — the 45.7-point directional asymmetry on `SKILL.md` ↔ `README.md`. The defect stated as a
  number, and the reason the relation must be directed rather than symmetric.
- **E31** — the gap ranking separates drift-prone pairs (46–55pt) from already-honored discipline
  (7–8pt), and mines the candidates out of history with no declaration. `*.mts` → `*.test.mts` is the
  control that makes the metric credible rather than a restatement of the hypothesis.
- **E09** — the cross-layer declaration already exists in twelve files and wraps in eleven. The
  residual is real, people already write it, and wrap-safety is the majority case for that construct.
- **E18** — the fail-loud doctrine, already written in two shipped engines; §3 is a transposition.

## Strongest weakening / contradictory evidence

- **E32** — the co-change measurement cannot separate a README that *should* have moved from a
  `SKILL.md` edit with nothing to mirror. The 46pt gap proves the pair is asymmetric; it does **not**
  prove 62% of those commits carry drift. Every claim about how much A would catch rests on a split
  that was never measured, and this is the weakest joint in the recommendation.
- **E31** is evolutionary-coupling mining over 8 months of one repository's history by one main
  author. The ranking is internally consistent and has a credible control, but it is one corpus and
  one period — the 40pt threshold separating the two clusters here is read off this data, not
  established independently.
- **E27** — a skill `README.md` still has no determined artifact-type. Pass 3 no longer *needs* one,
  but the ambiguity remains live for squad selection.
- **E21** is cited as settled, but `documentation-craft` rates its own cross-page transfer *medium*
  and calls it its weakest joint. §5 rests on it.
- **E20 versus E21** disagree on the home for a corpus-wide content check. §5 routes around the
  disagreement rather than resolving it.
- **E11** — the three-layer version of the unit shape has no measured migration path.

## What is not supported

- That the **cross-layer** edge can be recovered by name, by path convention, or by any inference
  over the current tree (E05, E06, E07).
- That the 46pt gap on `SKILL.md` → `README.md` measures *drift*. It measures asymmetry; the split
  between real drift and benign edits with nothing to mirror was never measured (E32).
- That a phrase-matched citation set is usable as a review set (E15).
- That "one concept stated in one place" is a sound rule for this corpus (E21).
- That `check-retired-terms` has a *live* wrap defect. It has a latent one (E12, E13).
- Any estimate of how many real defects increment A would catch (E02 is n=1; E03 and E30 measure
  co-change, not drift).

## Where evidence is thin

- The drift-versus-benign split behind the 46pt gap — unmeasured, and the main open risk to A. A
  hand-audit of a sample of the 644 `SKILL.md`-without-`README.md` commits would settle it and is the
  single cheapest thing left to do.
- Whether the twelve existing `**Artifact**` declarations are *correct*, not merely present. They
  were counted, not verified against the folders they name.
- Whether the ~40pt boundary separating drift-prone pairs from honored ones generalizes, or is an
  artifact of this corpus and this 8-month window (E31). Only five pairs cleared the ≥40-fires
  threshold here.
- The website layer end to end (E11): zero existing edges means zero observations of what a
  declaration there would cost or catch.

## What to check again later

- Whether re-mining the gap after A ships shows `SKILL.md` → `README.md` closing — the direct test
  that the rule did its job, and the trigger to retire it.
- Whether E25's contradiction is fixed, and whether anything mechanical detected it (nothing does
  today).
- Whether `check-retired-terms`' registry has admitted a multi-word phrase — the moment E13's latent
  defect goes live.
- Whether `formation-loop`'s charter widens to cover content-level corpus checks, which would give
  increment C a home it does not currently have (E20, E21).

## Landed in

Not yet consumed by any ADR or governance. Filed against issue #453; increments A and B await the
owner's decision on scope. A has no blocking precondition — the pass-2 amendment to
`design/artifact-type.md` was withdrawn.
