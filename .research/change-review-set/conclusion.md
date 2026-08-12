# Conclusion — Change Review Set

> **Second pass (2026-08-12).** The first pass framed the answer as four sets derived per change,
> and recommended a per-spec-node declaration. That framing is superseded: the unit is a property of
> the **artifact type**, and the declaration belongs where the type is declared. See `changes.md`
> for what moved and why. Sections 2–5 survive the reframe; §1 and §6 are rewritten.

## Question

What set of documents does a change belong to; which of the four candidate sets named in #453 are
mechanically derivable and which need a declaration; can the existing blast machinery answer this;
how must the answer degrade so a short set cannot pass as a complete one; what does wrap-safety
cost in this corpus; and what does the screaming-architecture rule say one level down?

## Verdict

**The review set is a property of the artifact type, not a graph computed per change.** #453's four
sets read as four different questions only because they were being derived per change, from the
touched file outward. Keyed on artifact type they collapse into one question, asked **once per type
rather than once per change**: *what constitutes one artifact of this type, and what else states
what it states?* A `skill` is a directory of `SKILL.md` + `README.md` + scripts, specified by a spec
node and explained by a docs page — that is a fact about the type `skill`, true before any change is
made, and it does not need deriving at all.

This repository already carries the axis. **artifact-type** is defined as "the **squad key** … one
artifact-type per produced **file** → exactly one squad," universal rather than SDD-only, an open
string needing no schema bump (E22). Its vocabulary is plugin-supplied and flows **marketplace →
install → registry → resolution**, with "SDD core ships only the generic defaults" and an unmatched
type resolving to the default squad rather than erroring (E23). A file's type is **resolved, not
stored**, by convention first — "a `SKILL.md` under `skills/` is a `skill`" — then an optional
tiebreaker map, then the registry (E24), and `resolve-governances` already implements the consuming
half (E24). So the path from *a touched file* to *its artifact-type* is specified and shipped. What
is missing is not the key. It is what the key returns.

The measurements from the first pass survive and now read as symptoms rather than as the problem.
Name inference from skill to spec node is *confidently wrong* on 2 of the 19 rows it can attempt and
silent on the other 31 (E07); `fileToNode` co-maps only the 39% of spec nodes at depth 1 (E05, E06);
the layer declaration already exists in prose in twelve READMEs and the path wraps onto the next line
in eleven of them (E08, E09). Each of those is an attempt to *recover per artifact* something that is
*constant per type* — which is why each one is lossy in a different way.

**One caution the reframe does not fix, and one it earns.** It earns the `architect` anomaly: one
spec node shipping as two skills (E07) stopped being a case a derivation gets wrong and became the
definition of a type's shape. It does not fix the case in E25 — see §6.

## 1. What the type knows, and what it cannot

Keyed on artifact type, #453's four sets split cleanly by **who knows the answer**:

| Set | Known by | Status |
|---|---|---|
| **Skill folder** | the **type** — "an artifact of type `skill` is a directory containing …" | Constant per type. Needs stating once, not deriving |
| **Layer set — shape** | the **type** — "a `skill` is specified by a spec node and explained by a docs page" | Constant per type. Needs stating once |
| **Layer set — identity** | the **artifact** — *which* spec node, *which* docs page | **Not derivable.** The residual declaration (E05–E09) |
| **Citation set** | neither | Over-generates by an order of magnitude — 94 files for `"entry point"` where the real set was ~6 (E15) |
| **Cross-link set** | already shipped | `concept-index` renders `concept → {nodes}` from frontmatter, CI-guarded by `--check` (E10) |

That split is the whole reframe. The first pass treated the folder set and the layer set as two
mechanisms over two graphs; they are one description of one type, differing only in whether the
member sits inside the directory or in another layer. And the part that genuinely resists — *which*
node, *which* page — shrinks from "derive a graph" to "state an identity where it cannot be
inferred," which is twelve existing prose declarations (E08), not a calculation.

Why identity cannot be folded into the type: the type says a link **exists**, never where it
**points**. Renaming across layers is the norm here, not the exception (`check-retired-terms` ↔
`corpus/retired-terms`, `spec-format-governance` ↔ `authoring/spec-format`, E07), and path
co-mapping breaks for 61% of nodes (E06). No amount of type-level description recovers a target that
was renamed.

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

Unchanged by the reframe, and the constraint that decides whether the mechanism helps or hurts.
**The repository has already written the doctrine down** — it has simply never been applied to a
set-shaped output.

`blast-estimate` states it as a rule: unresolved areas are "surfaced, never dropped"; a touch-set
resolving to zero areas computes `unknown`, "**never `low`**"; every read failure except `ENOENT`
fails loud, because swallowing them "fails in the **dangerous direction**" (E18).
`check-retired-terms` states it from the other side: "a **malformed registry never reports clean** —
the registry *is* the check" (E18). `check-scenario-overlap` and `resolve-governances` show the
structural form: bucketed candidates, **no verdict from the engine** (E16, E17).

Four requirements for a review-set engine:

1. **Never emit one flat set.** `derived` — complete by construction from a type description or a
   path — separate from `candidates` — heuristic. Different warrants must not print as one list.
2. **Emit coverage, not just members.** "No other members" and "no description to read" are opposite
   answers that look identical in a bare list.
3. **A dangling or malformed declaration fails loud.** A declared artifact path that does not exist
   is an error, never an omission.
4. **No description yields `unknown`, never `[]`.** An empty array reads as "nothing else to
   review." This is `unknown`-not-`low` transposed to a set, and it is the one requirement that
   keeps a nearly-right answer from being worse than none.

The reframe strengthens requirement 4 by giving it an existing precedent to match. artifact-type
resolution already has a defined answer for an unclaimed type: "**an unmatched type is not an error,
it is the default squad**" (E23). The review-set analogue is a **default unit shape** — for an
unrecognized type, the directory containing the file, reported explicitly as the default rather than
as a derived answer. That is a better degradation than `unknown`, because it is still useful, and it
is the behavior the corpus already expects from this axis.

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

The artifact-type reframe sharpens this rather than changing it. In the first pass the declaration
sat on each restating document ("a restating document declares its home"), which is the
information-hiding move made once per document. Per type it is made **once per kind of thing**: the
type says a `skill` is layered as artifact / spec / docs page, and every skill inherits that shape
without restating it. That is the same economy screaming architecture buys at the node level — the
structure declares itself, and instances do not each re-declare it.

Where it belongs is still open. `formation-loop` is the only corpus-wide continuous loop, but its
charter is that it "evolves how the corpus is **arranged**, never what it says" (E20), and a
set-membership check is a claim about what the corpus says. `documentation-craft` independently
places cross-page claim overlap in "a continuous corpus-wide review loop, not a per-page boolean
gate" (E21). Those are in tension and this dossier does not resolve it: either formation's charter
widens, or a second loop is needed, or the check runs verify-time and corpus-wide the way
`check-retired-terms` does without belonging to any loop. **The third is cheapest and is what §6
assumes**; the first two are decisions for someone else.

## 6. Recommendation on scope

Two increments, plus one explicitly deferred. The ordering matters: the first is a *description*
task with a small mechanical consumer, and the second is the residual that description cannot cover.

### A — describe the unit per artifact type (the primary work)

State, per artifact type, **what constitutes one artifact of that type** — its member files, and
which other layers state what it states. Concretely, for the types live in this repo (E23):

| type | unit shape |
|---|---|
| `skill` | a directory: `SKILL.md` + `README.md` + `scripts/` + fixtures; specified by a spec node; explained by a docs page |
| `governance` | **two** skill folders — the spec face and the impl face — plus the one spec node specifying both |
| `documentation` / `guide` / … | quill's types; shape stated by quill |

**Home:** SDD core ships a default unit shape per generic type; a plugin refines it in its `squads[]`
entry, which already lands in `.agents/universal-plugin.json` via `init-<plugin>`. This is the
existing default-plus-override flow verbatim (E23) — no new resolution path, no new config file, and
`resolve-governances` already resolves the key (E24). It also puts the shape where the type
vocabulary is owned, so a plugin introducing a type introduces its unit shape with it rather than
leaving the repo to infer one.

**Scale:** roughly nine type descriptions against 127 per-node declarations under the first pass's
proposal — and the type descriptions do not drift per node, which was that proposal's main long-term
cost.

**Mechanical consumer:** the verify-time check #444 prototyped — for each artifact, compare the
members the type says it has, and report a member the change did not move. Path-derived and complete
by construction against the type description, so §3's requirements are satisfiable rather than
aspirational. Report before wiring into `check:specs`: E03's 30.2% bounds the *population*, not the
finding rate, and that rate is unmeasured.

**The granularity amendment this needs (E26–E29).** Artifact-type is keyed per **file** — "one
artifact-type per produced file → exactly one squad" — while a unit is multi-file. Worked through on
`skill`: every folder holds a `SKILL.md`, almost always a `README.md`, and one or more
`scripts/*.mts` (E26). Those do not share a type, and two of the three do not resolve to one at all
today — the convention rule names only `SKILL.md` → `skill`, and `resolve-governances --path`
returns `artifactType: null`, "classify by convention", for all three members (E27). Three ways out:

1. **One type for the whole folder** — everything under `skills/<name>/` is `skill`. **Rejected.**
   It re-routes the `README.md` from quill's doc squad to aced's agent-config squad and drops the
   `.mts` sources on the SDD default (E28), collapsing the squad key, which is the one job the axis
   exists to do.
2. **A second axis** — a per-directory *unit type* beside the per-file artifact-type. Conceptually
   clean, but `artifact-type.md`'s own "Naming" section retired `domain` / `domain-type` /
   `domain-plugin` down to one term, so a near-synonym re-creates what was deliberately removed.
3. **One vocabulary, a declared binding granularity** — **recommended.** `artifact-type` stays the
   single term; what changes is what it may be keyed to. Today only a file; the amendment lets a
   type that declares a unit shape **also bind at directory granularity**. `skill` binds to the
   directory and names its members; `documentation` binds to a file, as now. Each member file still
   resolves to its own artifact-type for squad selection, so no file is re-routed and "one
   artifact-type per produced file → exactly one squad" stays literally true. It also fixes the
   inversion for free: from any member, walk up to the nearest directory carrying a directory-bound
   type — which works here precisely because a skill unit *is* a directory, the case `fileToNode`
   got right (E05).

Option 3 is also what E29 forces. The relation the unit exists to catch — #444's duty-table drift
between a `SKILL.md` and its `README.md` — is invisible to **every** member's own squad: aced's bars
judge frozen-`.feature` conformance, quill's judge runs a document-**scoped** integrity pass, and
neither has a cross-document face. If no member's squad can see the relation, the unit shape cannot
be a property of any one member's squad. It has to attach to the composite, and option 3 is the
cheapest way to name the composite without inventing a second vocabulary.

**Still open under option 3:** what a skill `README.md`'s *file*-level type actually is. It is
ambiguous today, the tiebreaker map exists exactly for this, and it is empty — so by
`artifact-type.md`'s own rule this is an "ask once — confirm, never guess" that has never been asked
(E27). Settle it while amending, and write the binding back.

### B — the residual identity declaration

The type says a `skill` has a spec node; it cannot say *which*. Promote the twelve existing prose
declarations (E08) into machine-readable frontmatter on the node. Three checks, each following the
E18 doctrine: a declared path that does not exist **fails loud**; a folder claimed by two nodes
**fails loud**; an unclaimed folder is reported as **coverage**, never as a violation.

**Convert the twelve once from a hand-verified list — do not build a parser for the prose form**
(E09: it wraps in 11 of 12; a parser for that is exactly the nearly-right-and-authoritative artifact
§3 exists to prevent). Do **not** fall back to name inference (E07: wrong 2 times in the 19 cases
where it answers at all). Do **not** overload `concept:` — that is a many-to-many *concern*; this is
an *identity* relation, and conflating them makes the concept view noisy and the identity imprecise.

The website layer is the weak member: no edges exist in either direction (E11), so its declaration is
pure new authorship with no measured migration path. Declare it in the schema; populate it later.

### C — the citation set (defer)

Only after A and B, and only in the `check-scenario-overlap` shape: normalized matching (§4),
`derived` and `candidates` bucketed separately, an explicit judgment arm, no verdict from the engine
(E16, E17). **Do not build it on a phrase sweep if A and B do not ship** — a 94-file candidate list
for a two-word phrase is the loud mirror of the same defect, will be ignored within two change
requests, and an ignored check is worse than an absent one because it occupies the slot.

### The case none of this catches

E25 is a live instance of #453's defect that survives every increment above:
`design/artifact-type.md` says a node README carries "`spec-type` only — **never** an artifact-type
field," while `design/spec-structure.md` says the classification frontmatter is "`spec-type`,
`artifact-types`, and `concept`." Measured, 0 of 127 nodes carry `artifact-types:` and the enforcing
engine parses only `concept` and `spec-type` — so the corpus follows the first and the second states
a retracted rule. **In the spec that defines the corpus's own structure rules.**

That pair is not a unit (they are two rule documents, not two members of one artifact), and it is not
a cross-link set either — they carry *different* `concept:` tags (`artifact-type` and
`spec-structure`), so `concept-index` would not group them. It is a citation-shaped defect, which is
increment C, which is the one being deferred. Worth knowing that the deferral has a live cost, and
worth fixing E25 on its own regardless of what is decided here.

### Not recommended

- **Extending `blast-estimate`** to emit the review set (§2).
- **Fixing `fileToNode`'s depth-1 recovery** as part of this work. Under the reframe the review set
  does not route through `fileToNode` at all, so the limitation stops being on this path. It remains
  a real measured mismatch under two shipped engines (E05, E06) — a separate issue.
- **Declaring the unit per spec node** (the first pass's proposal): 127 declarations for something
  constant across ~9 types.
- **Adopting "one concept stated in one place"** as a rule (§5, E21).

## Strongest supporting evidence

- **E22–E24** — the artifact-type axis is defined, plugin-supplied, per-file-resolved, and already
  consumed by `resolve-governances`. The reframe rides existing machinery rather than proposing any.
- **E07** — name inference is *confidently wrong* on `init` and `manage`, and the `architect` row is
  many-to-one. Under the reframe this stops being a derivation failure and becomes a type's shape.
- **E09** — the layer declaration already exists in twelve files and wraps in eleven. It establishes
  at once that the identity residual is real, that people already write it, and that wrap-safety is
  the majority case for this construct.
- **E18** — the fail-loud doctrine, already written in two shipped engines; §3 is a transposition.

## Strongest weakening / contradictory evidence

- **E26–E29** — artifact-type is per *file*; the unit is multi-file, and on `skill` the three member
  kinds neither share a type nor resolve to one today. The reframe requires a granularity amendment to
  `design/artifact-type.md`, not just a new field. Largest cost it carries, and the first thing that
  could sink it.
- **E23** — the type vocabulary is *plugin-supplied*, but "a skill folder holds `SKILL.md` and
  `README.md`" is a core convention, not aced's. §6 resolves this by core-default plus plugin
  override, which is the documented precedent — but it does mean core is now stating something about
  types plugins own.
- **E03** measures unsynchronized *edits*, not drift. If most of that 30.2% is noise, A's mechanical
  consumer ships with a poor signal ratio — the failure mode that gets checks ignored.
- **E21** is cited as settled, but `documentation-craft` rates its own cross-page transfer *medium*
  and calls it its weakest joint. §5 rests on it.
- **E20 versus E21** disagree on the home for a corpus-wide content check. §5 routes around the
  disagreement rather than resolving it.
- **E11** — the three-layer version of the unit shape has no measured migration path.

## What is not supported

- That the layer set's **identity** edge can be recovered by name, by path convention, or by any
  inference over the current tree (E05, E06, E07).
- That a phrase-matched citation set is usable as a review set (E15).
- That "one concept stated in one place" is a sound rule for this corpus (E21).
- That `check-retired-terms` has a *live* wrap defect. It has a latent one (E12, E13).
- Any estimate of how many real defects increment A's mechanical consumer would catch (E02 is n=1;
  E03 is the wrong measure for it).

## Where evidence is thin

- The finding rate of A's mechanical consumer — unmeasured, and the main open risk.
- Whether the twelve existing `**Artifact**` declarations are *correct*, not merely present. They
  were counted, not verified against the folders they name.
- Whether the ~9 live artifact-types are the right granularity for a unit shape, or whether the
  shapes vary within a type more than across types. Not tested — only `skill` and `governance` were
  worked through concretely.
- The website layer end to end (E11): zero existing edges means zero observations of what a
  declaration there would cost or catch.

## What to check again later

- Whether `design/artifact-type.md` gains a unit-shape section, which is the precondition for A.
- Whether E25's contradiction is fixed, and whether anything mechanical detected it (nothing does
  today).
- Whether `check-retired-terms`' registry has admitted a multi-word phrase — the moment E13's latent
  defect goes live.
- Whether `formation-loop`'s charter widens to cover content-level corpus checks, which would give
  increment C a home it does not currently have (E20, E21).

## Landed in

Not yet consumed by any ADR or governance. Filed against issue #453; increments A and B await the
owner's decision on scope, and A additionally awaits the E26 amendment to `design/artifact-type.md`.
