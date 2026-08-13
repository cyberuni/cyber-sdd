# Conclusion — Change Review Set

> **Fourth pass (2026-08-12) — the live version.** Pass 1 derived four sets per change. Pass 2 moved
> the description onto the artifact type. Pass 3 narrowed it to a directed companion relation between
> file kinds. **All three are withdrawn as the primary answer**, on evidence this dossier carried from
> pass 1 and failed to follow (E36). The answer is a **workflow** one: a documentation review is a
> stage with an owner, not a set to compute. §§2–5 survive as constraints on whatever gets built; the
> verdict, §1 and §6 are pass-4 text. `changes.md` records every move.

## Question

What set of documents does a change belong to; which of the four candidate sets named in #453 are
mechanically derivable and which need a declaration; can the existing blast machinery answer this;
how must the answer degrade so a short set cannot pass as a complete one; what does wrap-safety
cost in this corpus; and what does the screaming-architecture rule say one level down?

## Verdict

**This is a workflow gap, not a set-derivation gap. A documentation review is a stage with an owner
— it should be dispatched, not computed.**

The evidence that settles it was in this dossier from the first pass and went unfollowed for three.
The #437 round-3 fix **touched both files of the round-4 pair and corrected neither** (E01, E36).
Every mechanism passes 1–3 proposed — a derived set, a unit shape, a companion rule — produces the
same output: *look at this file too*. **The author already had the file open.** Pointing was never
the missing step. Reading the file *against the change* was, and that is a judgment an agent
performs, not a set an engine returns.

**The workflow slot already exists, and it is already per file.** Squad dispatch is not one squad per
mission: "One squad per artifact-type; one producer per file… A project touching several types
summons several squads at once, one per file" (E33). A mission that touches a documentation file
already summons quill today. **The gap is circular:** quill is summoned from the touch-set, and the
defect is precisely that the documentation file was *not* in the touch-set. The workflow already
dispatches a documentation specialist — it never gets the chance, because the file that needs one is
the file the change forgot to touch.

So the fix belongs at the **summoning rule**, not in a new derivation: a mission's squad set should
follow the change's **scope**, not only the files it happened to edit.

**And the repo already prefers this shape for exactly this problem.** Handoff runs on every mission
and carries follow-ups through record → classify → propose → drain, with recording "unconditional: no
permission, no forge, no human." One class it **identifies itself** is the shared-primitive sibling
follow-up — sweep the declared terms, find frozen nodes **outside the touched set**, file one
follow-up naming them (E35). That is structurally the same move as #453, already shipped, and it is
filed as *work for a later mission* rather than computed as an authoritative set. Doc drift of the
#437 kind classifies as **`blocking`** under handoff's stated definition, since a mission claiming
"the ordering discipline is documented" is contradicted by a README still stating the retracted rule.

**The honest cost.** quill has **no change-driven mode**. `quill-doc-writer` is spec-driven — its
input is `SPEC_PATH` / `FEATURE_PATH`, and in `implement` mode it writes to satisfy a **frozen**
`.feature` exactly (E34). Nothing in quill takes a diff. A workflow answer needs a **new face on
quill** — documentation *review* keyed on a change — which is a new role, not a config field. That is
the real price, and it is the thing to decide.

**Why this answers the ambiguity objection.** A pattern rule tells you *where to look* and can never
tell you *whether there is a problem*. It needs a threshold nobody can set from principle (46pt
versus 8pt, E31), it fires on two of every three skill commits at a 38% co-change rate (E30, E32),
and it still leaves "was it actually reviewed?" unanswered. A dispatched reviewer reads the change
and the document and says *these three sentences now contradict the `SKILL.md`* — or says nothing,
which is a real answer rather than an unfalsifiable one. **There is no set to be nearly-right about.**

## 1. What passes 1–3 leave behind

| Pass | Proposed | Status |
|---|---|---|
| 1 | four sets derived per change, declared per spec node | withdrawn |
| 2 | a unit shape per artifact type, with a binding-granularity amendment | withdrawn |
| 3 | a directed companion rule table, mined by co-change gap | **demoted to an optional hint** |
| 4 | a documentation review dispatched as a stage, or filed as a follow-up | **recommended** |

Pass 3's mining is not worthless — it is just not the answer. The measured directional gaps (E30,
E31) are a good **prioritization input**: they say `SKILL.md` → `README.md` is where drift
concentrates, which is worth handing a reviewer as context. What they cannot do is decide whether
*this* change created drift. **Hint, never verdict** — the same demotion §3 requires of any heuristic
bucket.

Two things from the earlier passes survive on their own merits, independent of what is built:

- **The cross-layer declaration (E08, E09).** A reviewer still has to be told *which* spec node and
  *which* docs page correspond to a shipped skill; the names diverge (E07), path recovery is wrong
  for 61% of nodes (E06), and the website layer has no edges at all (E11). Twelve prose declarations
  promoted to frontmatter. This is now scoped as **input to the reviewer**, not as a mechanism.
- **E25**, unchanged and still unfixed: `design/artifact-type.md` and `design/spec-structure.md`
  contradict each other on whether a node README carries an `artifact-types` field; 0 of 127 nodes
  carry it and the enforcing engine parses only `concept` and `spec-type`. #453's defect, live, in
  the spec that defines the corpus's own structure rules — and a dispatched reviewer *would* have
  caught it, where none of passes 1–3's mechanisms do.

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

Under pass 4 this section stops describing a mechanism and becomes a **constraint on the reviewer's
output**. Whatever W1 or W2 produces is a set of documents needing attention; it must not be folded
into blast's scalar, and it sits upstream of blast in exactly the composition order above. Nothing
here needs `fileToNode`'s depth-1 limitation fixed.

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

Pass 4 restates the fifth requirement for a *dispatched* reviewer: **the report must say what was
examined, not only what was found**. A documentation review that returns nothing is only meaningful
if it names the documents it read — otherwise "no drift" and "never ran" are indistinguishable, which
is requirement 2 at the level of the whole stage. `GOVERNANCES_APPLIED` already encodes this instinct
for quill's existing roles: "an act that records nothing cannot be told from one that never ran" (E34).

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
`check-retired-terms` does without belonging to any loop. **Pass 4 sidesteps the question**: a
dispatched review belongs to the *mission* loop, which is neither of the outer loops and needs no
charter change (E33, E35).

## 6. Recommendation on scope

Two shapes for the workflow answer, plus what to stop building. The second is far cheaper and rides
machinery that already ships; the first is what to add if the second proves too slow a loop.

### W1 — a documentation review dispatched in the mission loop

Summon the documentation squad on a mission whose change *affects* documentation, not only on one
whose touch-set already *contains* a documentation file (E33). The reviewer receives the change (the
diff and the touched set) plus the cross-layer declarations for the touched artifacts, reads the
documents against it, and reports drift — or reports none, which is a real answer.

**Cost, and it is the decision:** quill has no such face. `quill-doc-writer` is spec-driven, writing
against a **frozen** `.feature`; nothing in quill takes a diff (E34). This is a new role in quill's
squad, not a config field. It also puts a review on the critical path of every affected mission,
which needs scoping — plausibly "the mission touched an artifact that carries a cross-layer
declaration," so the trigger stays declared rather than guessed.

### W2 — a documentation follow-up class at handoff (recommended first)

Handoff already runs on every mission and already carries follow-ups through **record → classify →
propose → drain**, with recording "unconditional: no permission, no forge, no human." It already
identifies one class *itself* rather than receiving it — the shared-primitive sibling follow-up,
which sweeps declared terms for frozen nodes **outside the touched set** and files one follow-up
naming them (E35). A documentation-review class is the same move on a different trigger.

Why this first:

- **It is a class, not a mechanism.** The record → classify → propose → drain plumbing is shipped and
  proven; this adds a second self-identified class beside the first.
- **The classification already fits.** Doc drift of the #437 kind is `blocking` under handoff's own
  definition — it "contradicts a completion claim the mission already made" (E35).
- **It degrades correctly by construction.** Recording is unconditional and precedes any attempt to
  file, so a refused drain cannot lose the finding. That is §3's requirements satisfied by the
  existing design rather than by new code.
- **It does not dispatch, and that is honest.** Handoff explicitly does not dispatch the work it
  proposes (E35). The documentation update lands as a later CR — which is what #436 already is for
  the corpus backfill.

The trade: the doc fix is one mission later. For `blocking` findings that may be too late, which is
exactly when W1 earns its cost.

### What to stop building

- **The companion-rule table as a mechanism** (pass 3). Keep the *mining* as a prioritization hint
  handed to a reviewer — the gaps say where drift concentrates (E30, E31) — but a rule that points at
  a file does not solve a defect the author hit with the file already open (E36).
- **The unit shape per artifact type** and its binding-granularity amendment (pass 2). Withdrawn.
- **The per-spec-node set declaration** (pass 1). Withdrawn.
- **Any threshold tuning** — 46pt versus 8pt was a proxy for a judgment, and W1/W2 make the judgment
  directly.

### What to build regardless

- **The cross-layer declaration** (E08, E09). Whatever reviews documentation has to be told which
  spec node and which docs page belong to a shipped skill; no pattern recovers a renamed target
  (E06, E07, E11). Twelve prose declarations promoted to frontmatter, converted once from a
  hand-verified list — **not** parsed out of the prose, whose path wraps onto the next line in 11 of
  12 (E09). This is now the *only* declaration owed, and it is input to a reviewer rather than a
  mechanism of its own.
- **Fix E25** on its own. It is live, it is in the spec that defines the corpus's structure rules,
  and nothing currently detects it.

### Still deferred

The citation set (pass 1's increment C). If W1 or W2 ships, most of what a phrase sweep would surface
is reachable by a reviewer who reads the change, and the remainder is heuristic and must be presented
as such — the `check-scenario-overlap` shape: normalized matching (§4), bucketed candidates, an
explicit judgment arm, no verdict from the engine (E16, E17).

## Strongest supporting evidence

- **E36** — the round-3 fix touched both files of the round-4 pair and corrected neither. One
  sentence that refutes every mechanism passes 1–3 proposed, and it was in this dossier from pass 1.
- **E33** — squad dispatch is already per file and already summons several squads per mission. The
  workflow slot exists; the gap is circular, because the file needing a documentation specialist is
  the one the change forgot to touch.
- **E35** — handoff already identifies a follow-up class that sweeps outside the touched set and
  files it. The repo already prefers "record a follow-up" over "compute an authoritative set" for
  exactly this problem.
- **E30–E31** — the directional gaps. Demoted from mechanism to prioritization hint, but they still
  say where drift concentrates, and `*.mts` → `*.test.mts` at 8pt is a credible control.
- **E09** — the cross-layer declaration already exists in twelve files and wraps in eleven. The
  residual is real, people already write it, and wrap-safety is the majority case for that construct.
- **E18** — the fail-loud doctrine, already written in two shipped engines; §3 is a transposition.

## Strongest weakening / contradictory evidence

- **E34** — quill cannot do this today. Both W1 and W2 assume a documentation reviewer that takes a
  *change* as input, and quill's only producer is spec-driven against a frozen `.feature`. The
  recommendation therefore rests on a role that does not exist, which is a larger commitment than any
  of passes 1–3 required.
- **W2's latency is unquantified.** "One mission later" is fine for `backlog` and possibly wrong for
  `blocking`, and nothing here measures how often doc drift is blocking. #437 is n=1.
- **No measurement supports the claim that a dispatched reviewer would have caught #437's rounds.**
  It is an argument from what the role would read, not an observation. The reviewer could equally
  read both files and miss it — which is precisely what the human author did (E36).
- **E27** — a skill `README.md` still has no determined artifact-type, which matters again under W1:
  summoning a documentation squad for it presumes a classification nobody has made.
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
- That a dispatched documentation review would have caught #437's failures. Argued, not measured.
- That a phrase-matched citation set is usable as a review set (E15).
- That "one concept stated in one place" is a sound rule for this corpus (E21).
- That `check-retired-terms` has a *live* wrap defect. It has a latent one (E12, E13).
- Any estimate of how many real defects increment A would catch (E02 is n=1; E03 and E30 measure
  co-change, not drift).

## Where evidence is thin

- How often documentation drift is `blocking` rather than `backlog` — the number that decides W1
  versus W2, and n=1 today.
- The drift-versus-benign split behind the 46pt gap. Still the cheapest measurement available: a
  hand-audit of a sample of the 644 `SKILL.md`-without-`README.md` commits. It now sizes the
  *problem* rather than validating a mechanism.
- Whether the twelve existing `**Artifact**` declarations are *correct*, not merely present. They
  were counted, not verified against the folders they name.
- Whether the ~40pt boundary separating drift-prone pairs from honored ones generalizes, or is an
  artifact of this corpus and this 8-month window (E31). Only five pairs cleared the ≥40-fires
  threshold here.
- The website layer end to end (E11): zero existing edges means zero observations of what a
  declaration there would cost or catch.

## What to check again later

- Whether quill grows a change-driven review face — the precondition for both W1 and W2.
- Whether re-mining the directional gap after either ships shows `SKILL.md` → `README.md` closing.
  Under pass 4 that is an *outcome measure* for the workflow rather than a rule to retire.
- Whether E25's contradiction is fixed, and whether anything mechanical detected it (nothing does
  today).
- Whether `check-retired-terms`' registry has admitted a multi-word phrase — the moment E13's latent
  defect goes live.
- Whether `formation-loop`'s charter widens to cover content-level corpus checks, which would give
  increment C a home it does not currently have (E20, E21).

## Landed in

Not yet consumed by any ADR or governance. Filed against issue #453. W1 and W2 both await the
owner's decision, and both depend on a documentation-review face quill does not yet have (E34). The
cross-layer declaration and the E25 fix are worth doing under either.
