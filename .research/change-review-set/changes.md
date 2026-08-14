# Changes — Change Review Set

## 2026-08-12 — Initial research

- **What changed:** New topic created, answering issue #453.
- **Why:** Change request #437 (delivered as PR #444) failed the same gate three rounds running,
  each time on a different document the previous sweep had reported clean, and a fourth round
  declared a regression. All four misses were the same shape — a rule propagated to some members of
  a document set and not others, with the set never enumerated. #453 asks which sets a change
  belongs to and whether they can be derived.
- **Conclusion changed materially:** N/A (first entry).
- **Evidence/source that triggered:** The #453 brief. Unlike most dossiers here, this one surveys
  **this repository** rather than external literature: every evidence item is a measurement or an
  execution against the tree at `a41b0fa9` (2026-08-11), taken 2026-08-12. Sources are
  `gh issue view 453` / `gh pr view 444`, git history over skill-folder commits, corpus-wide counts
  over `git ls-files`, an execution of the shipped `fileToNode` against real paths, and reads of the
  Boundaries sections of `blast-estimate`, `check-retired-terms`, `check-scenario-overlap`,
  `concept-index`, `resolve-governances`, and `formation-loop`.
- **Notes on method:**
  - `fileToNode` was **executed**, not read off its source, with the `gherkin-cli` import stubbed so
    the module loads under node 22 (the stub is on the diffing path only, not on `fileToNode`'s).
    `discoverLayouts` returned `[]` under node 22 — recorded as E19 — so the real `sdd` layout
    (`.agents/specs/sdd` + `plugins/sdd/skills`, exactly the shape `discoverLayouts` constructs) was
    injected for the executed table in E05.
  - The first wrap measurement used a regex that over-counted inline-code spans (18,971). It was
    replaced by backtick tokenization with fenced blocks stripped, giving 105 — E14 carries the
    corrected figure.
  - The first check of whether the `**Artifact**` declaration wraps tested for *any* backticked span
    on the marker line, which the bullet's own inline code satisfies. Corrected to test for the
    artifact path itself (`plugins/` or `packages/`); the corrected answer is 11 of 12 wrapped,
    recorded as E09.
- **Explicitly not reopened:** whether restating a claim is a defect.
  `.research/documentation-craft/` already settled that it is not, and this dossier cites that
  finding (E21) as a constraint on §5 rather than re-deriving it.

## 2026-08-12 — Reframed on artifact type (second pass, same day)

- **What changed:** The verdict, §1, and §6. The first pass framed the answer as **four sets derived
  per change** and recommended declaring the layer set **per spec node** (127 nodes). Both are
  superseded. The unit is a property of the **artifact type**, and the description belongs where the
  type is declared — SDD core defaults per generic type, refined by a plugin in its `squads[]` entry.
- **Why:** Owner review rejected the per-change set framing: "it probably should be described per
  artifact type." Checking that against the corpus showed it is not merely a better presentation but
  a better fit to shipped machinery — the axis already exists (E22), its vocabulary is plugin-supplied
  through marketplace → install → registry → resolution (E23), a file's type is already resolved by
  convention → tiebreaker → registry (E24), and `resolve-governances` already consumes the key. The
  first pass was proposing to derive per artifact what is constant per type, which is why each
  derivation it measured was lossy in a different way.
- **Conclusion changed materially:** **Yes.**
  - The skill-folder set and the layer set stop being two mechanisms over two graphs and become one
    description of one type, differing only in whether the member is inside the directory.
  - The `architect` many-to-one (E07) inverts from a derivation failure into the *definition* of the
    `governance` type's shape.
  - Declaration count drops from ~127 per-node to ~9 per-type, plus a residual per-artifact identity
    edge (which spec node, which docs page) that no type-level description can carry.
  - `fileToNode`'s depth-1 limitation (E05, E06) leaves this path entirely — artifact-type resolution
    does not route through it.
  - §3's requirement 4 gained a better precedent: an unmatched type already resolves to the default
    squad rather than erroring (E23), so an unrecognized type should yield a **default unit shape**
    rather than `unknown`.
- **What survived unchanged:** §2 (blast is a distinct calculation), §3 (the fail-loud degradation
  doctrine), §4 (wrap-safety), §5 (screaming architecture — sharpened, not changed: the layering
  shape is declared once per type instead of once per restating document).
- **Evidence/source that triggered:** Owner feedback, then `.agents/specs/sdd/design/artifact-type.md`,
  `.agents/universal-plugin.json`, and `resolve-governances.mts` — added as cluster 6 (E22–E26).
- **Discovered while reframing (E25):** `design/artifact-type.md` and `design/spec-structure.md`
  contradict each other on whether a node README carries an `artifact-types` field. Measured: 0 of 127
  nodes carry it, 95 carry `spec-type`, and `check-spec-structure` parses only `concept` and
  `spec-type` — so the corpus follows `artifact-type.md` and `spec-structure.md` states a retracted
  rule. This is #453's own defect, live, in the spec defining the corpus's structure rules. It is
  **not** caught by any increment recommended here: the pair is not a unit, and the two documents
  carry different `concept:` tags so `concept-index` would not group them either. Recorded as a live
  cost of deferring increment C. Not fixed in this dossier.
- **New cost the reframe carries (E26):** artifact-type is keyed per **file** ("one artifact-type per
  produced file → exactly one squad") while a unit is multi-file. A unit shape requires amending
  `design/artifact-type.md`, not just adding a field. Flagged as the first thing to settle, and as the
  first thing that could sink the approach.

## 2026-08-12 — Granularity worked through on `skill` (third pass, same day)

- **What changed:** §6's open question became a recommendation. E26 was rewritten and E27–E29 added.
- **Why:** Owner asked for the per-file/multi-file tension expanded on `skill`. Working it through
  turned a flagged risk into a decidable choice, and moved the recommendation off "a primary file
  carries the unit."
- **Conclusion changed materially:** **Yes**, within §6.
  - Measured the unit: 50 `SKILL.md`, 49 `README.md`, 54 `scripts/*.mts`, 1 `references/`, zero
    nested `SKILL.md` (E26). Two or three distinct file kinds per unit, never one.
  - Measured the resolution: all three members of one unit return `artifactType: null` /
    "classify by convention" — the convention rule names only `SKILL.md` → `skill`, and the
    tiebreaker map is absent (E27). **The tension is not a prospective cost of the reframe; it is an
    unresolved ambiguity sitting in the corpus now**, and by `artifact-type.md`'s own rule it is an
    "ask once — confirm, never guess" that has never been asked.
  - Rejected "one type for the whole folder" on measured grounds: it re-routes a skill `README.md`
    from quill's doc squad to aced's agent-config squad and drops `.mts` sources on the SDD default
    (E28), collapsing the squad key.
  - Rejected a second per-directory *unit type* axis: `artifact-type.md`'s "Naming" section retired
    `domain` / `domain-type` / `domain-plugin` to one term, so a near-synonym re-creates what was
    deliberately removed.
  - **Recommended instead: one vocabulary, a declared binding granularity.** A type that declares a
    unit shape also binds at *directory* granularity; member files keep their own file-level types
    for squad selection. Nothing is re-routed and "one artifact-type per produced file → exactly one
    squad" stays literally true.
  - E29 is what forces it: #444's duty-table drift is invisible to **every** member's own squad —
    aced judges frozen-`.feature` conformance, quill's judge is document-**scoped**, neither has a
    cross-document face. If no member's squad can see the relation, the unit shape cannot belong to
    any one member's squad.
- **Still open:** what a skill `README.md`'s *file*-level artifact-type is. Ambiguous today; settle it
  while amending and write the binding back (E27).

## 2026-08-12 — Narrowed to a directed companion relation (third pass, same day)

- **What changed:** The verdict, §1 and §6. Pass 2's unit-shape-per-artifact-type and its
  binding-granularity amendment to `design/artifact-type.md` are **withdrawn**. Added E30–E32.
- **Why:** Owner reframed again, and correctly: *"The question is the blast radius. When SKILL.md
  changes, we need to know the README.md next to it also need to be reviewed. Similar to Storybook
  stories, if the `*.stories.tsx` changes, it's related mdx file also needs to be reviewed or
  updated."* That is a **pairwise, directed relation between file kinds**, not a set to derive and
  not a unit to describe. Pass 2 had over-built.
- **Conclusion changed materially:** **Yes.**
  - Measured the relation and found it strongly **asymmetric**: `README.md` → `SKILL.md` co-changes
    83.7%, `SKILL.md` → `README.md` 38.0%, over 2449 non-merge commits (E30). The 45.7-point gap is
    the defect as a number, and it is why the rule must be **directed** — a symmetric rule would look
    healthy from the README side and hide it.
  - Found the candidate rules **mine out of git history**: ranking same-directory file-kind pairs by
    directional gap gives `*.md`→`README.md` 55pt, `*.md`→`*.feature` 53pt, `SKILL.md`→`README.md`
    46pt, against `*.mts`→`*.test.mts` 8pt and `README.md`→`*.feature` 7pt (E31). The metric
    separates drift-prone pairs from already-honored discipline, and `*.mts`→`*.test.mts` is a
    credible control rather than a restatement of the hypothesis. Only *which candidates to enforce*
    needs a human.
  - Settled the mechanism's shape from the 38% forward rate: a hard gate would fire on two of every
    three skill commits (E32). The output is a **review set** — what must be examined, never what
    must be edited — which is what blast radius already is. Concrete composition: **companion
    expansion → expanded touch-set → blast**.
  - **Dissolved** E26–E29 rather than solving them. The multi-file/per-file tension existed only
    because pass 2 was making the members of a set share one type; a directed pairwise rule never
    asks that. No amendment to `design/artifact-type.md` is needed, and A now has no blocking
    precondition.
  - §3 gained a fifth requirement specific to a directed relation: **name the rule that fired**, since
    a 46pt rule and a 7pt rule warrant different trust.
- **What survived, again:** §2 (blast is a distinct calculation consuming the expansion), §3 (the
  fail-loud doctrine), §4 (wrap-safety — now with *less* riding on it, since companion rules match
  paths not prose), §5 (screaming architecture).
- **What still needs declaring:** only the cross-layer edge — `SKILL.md` → its spec node → its docs
  page — which no filename pattern reaches because the names diverge (E07) and the website layer has
  no edges (E11). Twelve lines of frontmatter (E08).
- **Weakest joint, restated honestly:** the gap measures **asymmetry**, not drift. The split between
  a README that should have moved and a `SKILL.md` edit with nothing to mirror was never measured. A
  hand-audit of a sample of the 644 `SKILL.md`-without-`README.md` commits would settle it and is the
  cheapest thing left to do.

## 2026-08-12 — Recast as a workflow stage (fourth pass, same day)

- **What changed:** The verdict, §1 and §6. Passes 1–3 are withdrawn as the primary answer; pass 3's
  mining is demoted to a prioritization hint. Added E33–E36.
- **Why:** Owner: *"still not feeling right about it. Too ambiguous to my taste. What if we manage
  that through workflow? Meaning when some changes are done, there will be a quill run to review and
  update documentation?"* Checking that turned up the refutation of the previous three passes **in
  this dossier's own first evidence item**.
- **Conclusion changed materially:** **Yes, and it invalidates three prior recommendations.**
  - **E36:** the #437 round-3 fix touched *both* files of the round-4 pair and corrected neither.
    Every mechanism passes 1–3 proposed emits the same output — *look at this file too* — and the
    author already had the file open. Pointing was never the missing step; reading the file against
    the change was, and that is a judgment, not a set operation. E01 said this in pass 1 ("rules out
    'look harder at the files you touched' as a fix") and the next three passes built exactly that.
  - **E33:** squad dispatch is already **per file** and already summons several squads per mission.
    quill fires when a documentation file is in the touch-set. **The gap is circular** — the file
    needing quill is the one the change forgot to touch. So the fix belongs at the *summoning rule*,
    not in a new derivation.
  - **E35:** handoff already runs every mission and already identifies a follow-up class that sweeps
    **outside the touched set** and files it (the shared-primitive sibling follow-up). The repo
    already prefers "record a follow-up" over "compute an authoritative set" for this exact problem,
    and doc drift of the #437 kind classifies as `blocking` under handoff's own definition.
  - **E34, the honest cost:** quill has **no change-driven mode**. `quill-doc-writer` is spec-driven,
    writing against a frozen `.feature`; nothing in quill takes a diff. Both recommended shapes need
    a new role on quill, which is a larger commitment than anything passes 1–3 required.
- **Recommendation now:** **W2** — a documentation follow-up class at handoff, riding shipped
  record → classify → propose → drain plumbing — as the cheap default; **W1** — a documentation review
  dispatched in the mission loop — where `blocking` findings cannot wait a mission. Build the
  cross-layer declaration and fix E25 under either.
- **What survived, again:** §2 (now a constraint on the reviewer's output rather than a mechanism
  boundary), §3 (with its fifth requirement restated for a dispatched stage — say what was examined,
  not only what was found), §4, §5 (pass 4 sidesteps the formation-charter tension entirely, since a
  dispatched review belongs to the *mission* loop, not an outer one).
- **Method note worth keeping:** the dossier carried its own refutation from pass 1 and three
  successive reframes did not surface it. Each pass reasoned forward from the previous pass's
  mechanism instead of back to the evidence. Re-reading E01 was what broke it.
