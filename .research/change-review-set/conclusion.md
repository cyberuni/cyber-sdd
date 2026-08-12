# Conclusion — Change Review Set

## Question

What set of documents does a change belong to; which of the four candidate sets named in #453 are
mechanically derivable and which need a declaration; can the existing blast machinery answer this;
how must the answer degrade so a short set cannot pass as a complete one; what does wrap-safety
cost in this corpus; and what does the screaming-architecture rule say one level down?

## Verdict

**Three of the four sets are cheap and one is a trap.** The skill folder is derivable from the path
with no declaration and nothing derives it today (E04). The cross-link set is *already shipped* for
the spec layer as `concept-index` (E10). The **layer set** is the one that caused every failure in
#437, and it is **not** derivable — name inference is wrong on 2 of the 19 rows it can even attempt
and silent on the other 31 (E07), path co-mapping works only for the 39% of spec nodes that sit at
depth 1 (E05, E06), and the third layer has no edge to derive from in either direction (E11). The
**citation set** is derivable and should not be used as a review set: a phrase sweep for `"entry
point"` reaches 94 files where the real review set in #437 was about six (E15).

The load-bearing finding is that **the layer declaration already exists in this repository, in
prose, in twelve spec-node READMEs** — `- **Artifact** — the <name> bar, shipped as <path>` (E08) —
and that in **eleven of those twelve the path sits on the line after the marker** (E09). The
declaration this design needs is already being written by hand and is already unreadable to a
line-oriented parser. That single measurement answers two sub-questions at once: the layer set needs
a declaration (it exists, so someone has already concluded it must), and wrap-safety is not a
hypothetical hazard here (the declaration is the majority case of the defect).

## 1. Derivable versus declared

| Set | Derivable today? | From what | Gap |
|---|---|---|---|
| **Skill folder** | **Yes**, fully | `dirname(SKILL.md)` — the unit is a directory | Nothing performs it. Bounded population: 30.2% of skill-folder commits move `SKILL.md` with a README present and unmoved (E03) |
| **Layer set** | **No** | — | `fileToNode` co-maps the spec root and impl root to one node (E05) but is depth-1 by construction, and 77 of 127 spec nodes are deeper (E06). Names diverge and collide (E07). Website pages resolve to `null` (E05, E11) |
| **Citation set** | Yes, but useless raw | phrase matching over tracked files | Over-generates by more than an order of magnitude (E15). Precision requires the claim to be *named*, not its words matched |
| **Cross-link set** | **Yes**, already shipped | `concept:` frontmatter → `concept-index`, CI-guarded by `--check` (E10) | Covers spec nodes only; shipped skills and website pages carry no `concept:` tag |

Two of these need no new mechanism at all, which is worth stating plainly before designing
anything: the folder set needs a *consumer*, and the cross-link set needs nothing.

The layer set needs a **declaration**, and the evidence is unusually direct about why inference
cannot substitute for one. It is not that inference is merely lossy. On the `architect` row one spec
node ships as **two** skills (`architect-spec-governance` and `architect-impl-governance`), so the
relation is many-to-one and no bijection-shaped derivation is right in either direction (E07). On
the `init` and `manage` rows, name matching does not fail — it returns a **confidently wrong**
answer pointing into another project's spec tree (E07). A derivation that is wrong while looking
right is the exact failure mode #453 asks the design to avoid.

## 2. Extend the blast machinery, or a distinct calculation?

**Distinct calculation, shared substrate.** Four reasons, in descending strength:

- **The output types are incompatible.** `blast-estimate` returns a level on a three-point lattice.
  A review set is an enumerated set of paths. Folding a set into a scalar destroys precisely the
  information #453 wants, and there is no seam in the bucketed arithmetic where a set could
  survive.
- **The graphs are different.** `blast-estimate`'s centrality is mention-based fan-in between *work
  areas*, over the forms the corpus uses to name an area (`sdd/spec-gate`, `sdd:spec-gate`, a path
  under a declared root, a relative sibling link). The review set is an edge between *documents*
  that carry the same claim. A work area with high fan-in is not thereby a document set.
- **`blast-estimate`'s own boundaries forbid it.** It "consumes" a touch-set and explicitly does not
  "*produce*" one. A review set is a **touch-set expansion**, which sits **upstream** of blast, not
  inside it. This also gives the right composition order: derive the review set first, then let the
  expanded set feed blast — which is exactly the intake benefit #453 names, a declared blast that
  reflects the documents that must move together rather than only the code areas.
- **The failure directions differ.** An under-called blast level *modulates a conductor's judgment*
  and is corrected by the conductor. A short review set **is** the answer, and reads as complete.

What should be **reused** is the substrate, following the cross-skill reuse `blast-estimate` and
`collision-ladder` already practise on `fileToNode`: the same `discoverLayouts` /
`fileToNode(path, layouts)` pair recovers the node a touched file belongs to, and the declared
layout roots are already the right place to say a project spans a spec root and an impl root. The
new engine consumes that and adds one thing `fileToNode` does not have: **which other documents
state what this one states**.

One inherited hazard to design around: `discoverLayouts` swallows every failure and returns `[]`
(E19). Downstream of blast that fails safe, because zero resolved areas computes `unknown` rather
than `low`. An empty *set* has no such fallback unless one is built — see §3.

## 3. How the answer must degrade

This is the constraint that decides whether the mechanism helps or hurts, and **the repository has
already written the doctrine down** — it has simply never been applied to a set-shaped output.

`blast-estimate` states it as a rule: unresolved areas are "surfaced, never dropped"; a touch-set
resolving to zero areas computes `unknown`, "**never `low`**"; and every read failure except
`ENOENT` fails loud, because swallowing them "fails in the **dangerous direction**, silently
under-calling blast on exactly the areas a project marked as needing care" (E18).
`check-retired-terms` states the same thing from the other side: "a **malformed registry never
reports clean** — the registry *is* the check" (E18). And `check-scenario-overlap` and
`resolve-governances` both show the structural form: a mechanical engine emits **bucketed
candidates** and **ships no verdict**, leaving the judgment to a named consumer — the Warden in one
case, "the consuming agent composes" in the other (E16, E17).

Applied here, that yields four requirements a review-set engine must meet:

1. **Never emit one flat set.** Emit `derived` — members complete by construction, from a path or a
   declaration — separately from `candidates` — members found heuristically. The two carry different
   warrants and must not be printed as one list.
2. **Emit coverage, not just members.** State which layers were consulted and which members could
   not be resolved. Silence must be distinguishable from emptiness; "no other members" and "no
   declaration to read" are opposite answers that look identical in a bare list.
3. **A dangling or malformed declaration fails loud.** A declared artifact path that does not exist
   is an error, never an omission.
4. **No declaration yields `unknown`, never `[]`.** An empty array reads as "nothing else to
   review." This is the `unknown`-not-`low` rule transposed to a set, and it is the single
   requirement that keeps a nearly-right answer from being worse than none.

## 4. Wrap-safety

Measured, in this corpus: **1213 bold spans and 105 inline-code spans straddle a newline**, across
881 tracked markdown files — 5.3% of all bold spans, in a corpus that states its rules in bold
(E14). For real phrases from #437, whitespace-normalized matching reaches strictly more files than
line-oriented matching: `"entry point"` 90 → 94, `"use case"` 93 → 95 (E15). The miss rate rises
with phrase length, which is the wrong direction — the more specifically a phrase identifies a rule
rather than a common word, the likelier a line sweep is to miss a site.

`check-scenario-overlap` already normalizes whitespace and case before fingerprinting and is
wrap-safe by construction (E16). `check-retired-terms` does **not** — it splits on `\n` and tests
`includes` per line (E12) — but the defect is **latent, not live**: the live registry holds one
entry, `artifacts/specs/`, a path with no whitespace that reflow can never break (E13). The moment
that registry admits its first multi-word phrase, the defect activates silently.

**Requirement:** normalize whitespace before matching, and retain an offset→line map so reporting
stays `file:line`. **Recommendation:** migrate `check-retired-terms` to normalized matching *before*
its registry admits a phrase, not after.

## 5. Screaming architecture, one level down

The tempting extension — "one capability per node" becomes "one concept stated in one place" — is
**not available**, and this repository has already ruled it out on evidence.
`.research/documentation-craft/conclusion.md` finds "a claim must appear in exactly one place" has
"no empirical warrant, and should be dropped": a passage "may **restate** a claim freely — recurrence
is not itself a defect," and the symmetrical failure is "a **bare cross-reference** that withholds
the claim" (E21). #453 half-anticipates this itself, when it says a concept appearing in a shipped
artifact, its spec, and its public explanation "is a legitimate layering, not duplication."

The correct one-level-down statement is therefore not about uniqueness but about **declaration**:

> One concept has one **home**. Restating it elsewhere is legal — and often required by layering —
> but a restating document **declares its home**, so the set of restatements is derived rather than
> remembered.

That is the same move screaming architecture makes at the node level. A capability-first layout does
not forbid a file from relating to several capabilities; it makes the structure **declare itself**
rather than be inferred from content. One level down, the analogue is that a restatement declares
its source rather than being recovered by searching for its words.

This reframing has a concrete payoff, and it is what turns the citation set from a trap into an
asset. A citation set derived by **phrase matching** reaches 94 files and is unusable (E15). A
citation set derived by **link traversal** over declared homes is precise and complete by
construction — and it is the same edge the layer-set declaration already provides. The two
"interesting" sets of #453 collapse into one mechanism, and the mechanism is a declaration rather
than a search.

The same reframing also settles where this does *not* belong. `formation-loop` is the only
corpus-wide continuous loop, but its charter is that it "evolves how the corpus is **arranged**,
never what it says" (E20), and a set-membership check is a claim about what the corpus says. Under
the charter as written this is not a formation act. The `documentation-craft` conclusion independently
places cross-page claim overlap in "a continuous corpus-wide review loop, not a per-page boolean
gate" (E21). Those two are in tension and the tension is unresolved: either formation's charter
widens, or a second continuous loop is needed, or the check runs verify-time and corpus-wide the way
`check-retired-terms` already does without belonging to any loop. **The third is the cheapest and is
what §6 recommends**; the first two are design decisions this dossier does not settle.

## 6. Recommendation on scope

Three increments. Only the first two are mechanical, and they are deliberately ordered so the
cheapest one ships first and the expensive one is not blocked behind a judgment call.

### A — the folder set (small, no declaration, ship first)

A verify-time guard over each skill folder comparing `SKILL.md` against its sibling `README.md` on
the structure they both carry — the duty table is the concrete case #444 found, where "the
mechanical bar-to-table comparison that finally closed it is about fifteen lines." Derived purely
from the path (E04), so there is nothing to declare, nothing to migrate, and no false authority to
guard against: the set is complete by construction. Population bounded by E03; a folder with no
`README.md` is coverage, not a violation.

Expected finding rate is **unmeasured** — E03's 30.2% is a rate of unsynchronized *edits*, most of
which have nothing to mirror. Build it to report before wiring it into `check:specs`.

### B — the layer set as declared data (the real fix)

Promote the prose declaration of E08 into machine-readable frontmatter on the spec node, sibling to
the `concept:` tag that already works this way (E10) — an explicit list of the artifacts the node
specifies, covering the shipped skill folder and, where one exists, the public docs page. The
derivation is then: touched file → node (`fileToNode`) → declared members. Three checks come with
it, each following the E18 doctrine: a declared path that does not exist **fails loud**; a shipped
skill folder claimed by two nodes **fails loud**; an unclaimed folder is reported as **coverage**,
never as a violation.

Migration is twelve files (E08), and they wrap in eleven of twelve (E09). **Convert them once from a
hand-verified list — do not build a parser for the prose form.** A prose parser for a construct that
wraps 92% of the time is exactly the nearly-right-and-authoritative artifact §3 exists to prevent.

Do **not** infer the mapping by name in the absence of a declaration, and do not fall back to it.
E07 measures the fallback returning a wrong answer 2 times in the 19 cases where it returns anything
at all. An unclaimed node must read as `unknown`, per §3 requirement 4.

Do **not** extend `concept-index` to cover skills instead. `concept:` groups nodes by a
cross-cutting *concern* — many-to-many and semantic. The layer set is an *identity* relation: this
document and that one are the same capability at different layers. Conflating them makes the concept
view noisy and the layer set imprecise.

The website layer is the weak member: it has no edges today in either direction (E11), so its
declaration is pure new authorship with no migration path measured. Recommend declaring it in B's
schema but treating its population as a separate, later pass.

### C — the citation set (defer; candidates only, never a verdict)

Only after B ships, and only in the `check-scenario-overlap` shape: normalized matching (§4),
`derived` and `candidates` in separate buckets, an explicit judgment arm, no verdict from the engine
(E16, E17). Once B exists, most of what C would find is already reachable by traversing declared
homes, and what remains is genuinely heuristic and must be presented as such.

**Recommend not building C on a phrase sweep at all** if B does not ship. Alone, a 94-file candidate
list for a two-word phrase is the "silently wrong because loudly over-broad" mirror of the defect
#453 is about — it will be ignored within two change requests, and an ignored check is worse than an
absent one because it occupies the slot.

### Not recommended

- **Extending `blast-estimate`** to emit the review set (§2).
- **Fixing `fileToNode`'s depth-1 recovery** as part of this work. It is load-bearing for the
  touch-set and blast paths as it stands; B's declaration removes the need to widen it, and widening
  it would change work-area attribution across two shipped engines for reasons unrelated to #453.
- **Adopting "one concept stated in one place"** as a rule (§5, E21).

## Strongest supporting evidence

- **E09** — the layer declaration already exists in twelve files and wraps in eleven of them. It
  establishes simultaneously that the declaration is needed, that people already write it, and that
  wrap-safety is the majority case rather than an edge case.
- **E07** — name inference returns a *confidently wrong* answer on `init` and `manage`, and the
  `architect` row is many-to-one. This is what forecloses derivation-by-convention.
- **E18** — the fail-loud-in-the-dangerous-direction doctrine, already written in two shipped
  engines. §3 is a transposition, not an invention.
- **E15** — measured, phrase-length-dependent miss rate for line-oriented matching, reproducing the
  #437 failure as a corpus property rather than an anecdote.

## Strongest weakening / contradictory evidence

- **E03** measures unsynchronized *edits*, not drift. It bounds the population increment A would
  examine and says nothing about how many real findings it would raise. If most of that 30.2% is
  noise, A ships a check with a poor signal ratio — the failure mode that gets checks ignored.
- **E21** is cited here as settled, but the `documentation-craft` dossier itself rates its
  cross-page transfer **medium** and names it "the weakest joint" — every corpus-level claim in it is
  an inference from within-text results. §5 rests on it.
- **E20 versus E21** disagree on the home for a corpus-wide content check. §5 routes around the
  disagreement rather than resolving it, which is a deferral, not an answer.
- **E11** means B's third layer has no measured migration path. The two-layer version of B is
  well-evidenced; the three-layer version is a design proposal.

## What is not supported

- That the layer set can be recovered by name, by path convention, or by any inference over the
  current tree (E05, E06, E07).
- That a phrase-matched citation set is usable as a review set (E15).
- That "one concept stated in one place" is a sound rule for this corpus (E21).
- That `check-retired-terms` has a *live* wrap defect. It has a latent one (E12, E13).
- Any estimate of how many real defects increment A would catch (E02 is n=1 change; E03 is the wrong
  measure for it).

## Where evidence is thin

- The finding rate of increment A — unmeasured, and the main open risk to it.
- Whether the twelve existing `**Artifact**` declarations are *correct*, not merely present. They
  were counted, not verified against the folders they name.
- The website layer end to end (E11): zero existing edges means zero observations of what a
  declaration there would cost or catch.

## What to check again later

- Whether `check-retired-terms`' registry has admitted a multi-word phrase — the moment E13's latent
  defect goes live.
- Whether `formation-loop`'s charter widens to cover content-level corpus checks, which would give
  increment C a home it does not currently have (E20, E21).
- Whether `fileToNode`'s depth-1 recovery starts producing wrong work-area attribution for the 77
  nested spec nodes in a context that matters (E05, E06). Out of scope here, but it is a real
  measured mismatch sitting under two shipped engines.

## Landed in

Not yet consumed by any ADR or governance. Filed against issue #453; increments A and B await the
owner's decision on scope before any build.
