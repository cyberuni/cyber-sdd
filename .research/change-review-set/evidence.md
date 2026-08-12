# Evidence — Change Review Set

All measurements were taken against this repository at commit `a41b0fa9` (2026-08-11) on
2026-08-12, unless an item says otherwise. Where an item says **executed**, the shipped function was
run; where it says **read**, only the source or prose was inspected and the claim is a hypothesis
about behavior rather than an observation of it.

## Cluster 1 — the defect, as it actually occurred

### E01

- **Claim:** In the change request that produced #453 (issue #437, delivered as PR #444), the same
  gate failed three rounds running, each on a different document the previous sweep had reported
  clean: (round 2) a bar's own key-point summary block, in the same file as the rewritten rule;
  (round 3) three further files carrying the retracted rule, one invisible to a line-oriented
  search because the phrase straddled a line break; (round 4) a shipped `SKILL.md` carrying an
  ordering discipline its matching spec-corpus `README.md` did not, with a citation pointing at the
  file that did not carry it. Round 4 was ruled a regression and halted the loop for a re-plan.
- **Date accessed:** 2026-08-12
- **Status:** confirmed
- **Confidence:** high
- **Source label:** `gh issue view 453`; `gh pr view 444` body ("What the gates caught")
- **Source type:** primary (repository issue and pull-request record)
- **Notes:** The round-3 fix **touched both** files of the round-4 pair and corrected neither. That
  detail matters: the author had the right files open and still missed the defect, which rules out
  "look harder at the files you touched" as a fix.

### E02

- **Claim:** PR #444 reports a measurement taken during that change: **5 of 6** touched skill
  folders had an unmoved `README.md`.
- **Date accessed:** 2026-08-12
- **Status:** confirmed as a report; not independently reproduced here
- **Confidence:** medium
- **Source label:** PR #444 body
- **Source type:** primary document, author self-report
- **Notes:** Recorded separately from E03 because it is the author's own count over one change,
  where E03 is a corpus-wide base rate computed here. They agree in direction; the small sample
  should not be cited as the rate.

### E03

- **Claim:** Across every commit since 2026-05-01 touching a `*/skills/*/SKILL.md`, the
  skill-folder edit outcomes are: **315** where `SKILL.md` and the sibling `README.md` moved
  together, **136** where `SKILL.md` moved while a `README.md` existed in that folder and stayed
  untouched, and **55** where the folder carried no `README.md` at all. The `SKILL.md`-only rate,
  among folders that have a README to move, is **136 / 451 = 30.2%**.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (executed)
- **Confidence:** high for the count; **low** as an estimate of drift
- **Source label:** `git log --since=2026-05-01` over `*/skills/*/SKILL.md`, per-commit
  `--name-only` intersection with the sibling `README.md`
- **Source type:** primary (measured)
- **Notes:** This is a base rate of *unsynchronized edits*, **not** of drift. Many `SKILL.md`-only
  commits are typos, description tweaks, or frontmatter changes with nothing for the README to
  mirror. It bounds the population a folder-set check would examine; it does not predict how many
  findings such a check would raise. Treated as an upper bound throughout.

## Cluster 2 — what is derivable today

### E04

- **Claim:** The **skill folder** set is derivable from the path alone, with no declaration: the
  members of the unit are the files under `dirname(SKILL.md)`. Nothing in the repository currently
  performs this derivation for review purposes.
- **Date accessed:** 2026-08-12
- **Status:** confirmed
- **Confidence:** high
- **Source label:** repository tree; absence confirmed by searching the sdd skill set for any
  engine keyed on a skill directory's sibling files
- **Source type:** primary (observed structure, observed absence)

### E05

- **Claim:** `touch-set-correction`'s `fileToNode(path, layouts)` maps a spec-corpus file and a
  shipped-skill file to the **same** work-area node when the spec node sits directly under the
  project's spec root, and to **different** nodes when it does not. Executed against the real
  declared `sdd` layout (`roots: ['.agents/specs/sdd', 'plugins/sdd/skills']`):

  | path | node |
  |---|---|
  | `.agents/specs/sdd/mission-graph/README.md` | `sdd/mission-graph` |
  | `plugins/sdd/skills/mission-graph/SKILL.md` | `sdd/mission-graph` |
  | `.agents/specs/sdd/authoring/spec-gate/README.md` | `sdd/authoring` |
  | `plugins/sdd/skills/spec-gate/SKILL.md` | `sdd/spec-gate` |
  | `.agents/specs/sdd/corpus/retired-terms/README.md` | `sdd/corpus` |
  | `plugins/sdd/skills/check-retired-terms/SKILL.md` | `sdd/check-retired-terms` |
  | `apps/website/src/content/docs/sdd/use-case.md` | `null` |

- **Date accessed:** 2026-08-12
- **Status:** confirmed (executed)
- **Confidence:** high
- **Source label:** `plugins/sdd/skills/touch-set-correction/scripts/touch-set-correction.mts`,
  `fileToNode` (the `gherkin-cli` import stubbed so the module loads under node 22; the stub is
  used by the diffing path only and is not on `fileToNode`'s path)
- **Source type:** primary (executed)
- **Notes:** The cause is one line — `const capability = rest.split('/')[0]` — so recovery is
  **depth-1 by construction**. `blast-estimate`'s own SKILL.md documents the co-mapping with the
  `mission-graph` example, which is the case that works.

### E06

- **Claim:** Of 127 `README.md` files in `.agents/specs/`, **1** sits at `<project>/README.md`,
  **49** at `<project>/<node>/README.md`, and **77** at `<project>/<group>/<node>/README.md`. So
  **77 of 127 (61%)** spec nodes sit one level deeper than `fileToNode` can distinguish, and
  resolve to their parent group rather than to themselves.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (executed)
- **Confidence:** high
- **Source label:** `find .agents/specs -name README.md`, depth histogram
- **Source type:** primary (measured)

### E07

- **Claim:** Matching a shipped skill to its spec node **by name** is not a function and is
  sometimes actively wrong. Of 50 directories in `plugins/sdd/skills/`, **19** have a same-named
  directory somewhere under `.agents/specs/`, and **2 of those 19 resolve to the wrong project** —
  `init` matches `.agents/specs/cyberlegion-plugin/init` and `manage` matches
  `.agents/specs/aced/manage`, while the intended nodes are `.agents/specs/sdd/gateway/init` and
  `.agents/specs/sdd/gateway/manage`. The remaining **31 of 50 (62%)** have no same-named directory
  at all, because the real correspondences rename across layers:

  | shipped skill | spec node |
  |---|---|
  | `check-retired-terms` | `sdd/corpus/retired-terms` |
  | `spec-format-governance` | `sdd/authoring/spec-format` |
  | `oracle-spec-governance` | `sdd/common-governances/oracle` |
  | `architect-spec-governance` **and** `architect-impl-governance` | `sdd/common-governances/architect` |

- **Date accessed:** 2026-08-12
- **Status:** confirmed (executed)
- **Confidence:** high
- **Source label:** directory listing of `plugins/sdd/skills` against `find .agents/specs -type d`
- **Source type:** primary (measured)
- **Notes:** The `architect` row is a **many-to-one**: one spec node ships as two skills. Any
  derivation assuming a bijection is wrong on that row in both directions.

### E08

- **Claim:** The layer link **already exists as prose**. Twelve spec-node READMEs carry a
  `## Subject` bullet of the form `- **Artifact** — the <name> bar, shipped as <path>`. That is a
  hand-written declaration of exactly the skill↔spec correspondence E07 shows is not derivable by
  name. It covers **12 of 127** spec-node READMEs (9.4%).
- **Date accessed:** 2026-08-12
- **Status:** confirmed (executed)
- **Confidence:** high
- **Source label:** `grep -rl '^- \*\*Artifact\*\*' .agents/specs --include=README.md`;
  `.agents/specs/sdd/common-governances/oracle/README.md:15`
- **Source type:** primary (measured)

### E09

- **Claim:** In **11 of those 12** files (92%), the artifact **path is not on the same line** as
  the `- **Artifact**` marker — the bullet wraps, leaving `shipped as` at the end of one line and
  `` `plugins/sdd/skills/…/` `` at the start of the next. A line-oriented parse of this declaration
  recovers **1 of 12**.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (executed)
- **Confidence:** high
- **Source label:** per-file check of whether the `- **Artifact**` line also contains `plugins/` or
  `packages/`
- **Source type:** primary (measured)
- **Notes:** This is the wrap defect of E01/E14 reproduced on the very declaration a layer-set
  derivation would want to read. It is not a hypothetical hazard in this corpus; it is the majority
  case for this construct.

### E10

- **Claim:** The **cross-link set is already shipped**, for spec nodes only. `concept-index` scans
  every node's `concept:` frontmatter and renders `concept → {its nodes across every folder}` into
  `spec.md`, explicitly to "re-unify a cross-cutting concern the capability folder tree scatters."
  It carries a `--check` mode that exits non-zero when the rendered block drifts, so the derivation
  is CI-guarded. Shipped skills and website pages carry no `concept:` tag, so they are outside it.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (read + tree inspection)
- **Confidence:** high
- **Source label:** `plugins/sdd/skills/concept-index/SKILL.md`;
  `.agents/specs/sdd/corpus/retired-terms/README.md` frontmatter (`concept: spec-structure`)
- **Source type:** primary

### E11

- **Claim:** The **website layer is effectively unlinked** to the other two. Of 80 documents under
  `apps/website/src/content/docs/`, **3** reference `.agents/specs` at all. Of the 8 pages under
  `docs/sdd/`, six contain zero `sdd:` skill references; `control-flow.md` has one and
  `overview.md` has two. `use-case.md` and `scenario.md` — the pair that drifted in E01's round 4 —
  have none.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (executed)
- **Confidence:** high
- **Source label:** grep counts over `apps/website/src/content/docs/`
- **Source type:** primary (measured)
- **Notes:** So for the third layer the set is not merely non-derivable — there is no edge in the
  repository to derive it from, in either direction.

## Cluster 3 — wrap-safety, measured

### E12

- **Claim:** `check-retired-terms` matches **line by line**: it splits each file on `\n` and tests
  `lineText.includes(entry.term)` per line, reporting `file:line:term`. It is therefore not
  wrap-safe.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (read)
- **Confidence:** high
- **Source label:** `plugins/sdd/skills/check-retired-terms/scripts/check-retired-terms.mts`,
  lines 233–244
- **Source type:** primary (source read)

### E13

- **Claim:** The defect in E12 is **latent, not live**. The live registry
  (`.agents/sdd/retired-terms.toml`) holds exactly one entry, `term = "artifacts/specs/"` — a path
  with no whitespace, which markdown reflow can never break across a line. Extending the registry
  from retired *paths* to retired *phrases* would activate the defect silently.
- **Date accessed:** 2026-08-12
- **Status:** confirmed
- **Confidence:** high
- **Source label:** `.agents/sdd/retired-terms.toml`
- **Source type:** primary

### E14

- **Claim:** Across 881 git-tracked `.md` files (fenced code blocks excluded), **105** inline-code
  spans and **1213** bold spans straddle a newline. That is **5.3%** of the corpus's 22,859 bold
  spans; 67 distinct files carry at least one wrapped inline-code span.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (executed)
- **Confidence:** high
- **Source label:** backtick/`**` tokenization over `git ls-files '*.md'`
- **Source type:** primary (measured)
- **Notes:** Bold is where this corpus states its rules ("**Use cases are enumerated by actor**").
  A 5.3% invisibility rate lands squarely on the construct a rule sweep most needs to see.

### E15

- **Claim:** For real phrases from #437, whitespace-normalized matching reaches strictly more files
  than line-oriented matching: `"entry point"` **90 → 94** files (4 missed, 4.3%); `"use case"`
  **93 → 95** (2 missed, 2.1%). Single-token phrases (`actor`, `extensions`) and phrases occurring
  once (`enumerated by actor`, `one capability per node`) show no difference.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (executed)
- **Confidence:** high
- **Source label:** per-file comparison of `lines.some(l => l.includes(p))` against
  `text.replace(/\s+/g,' ').includes(p)` over tracked `.md/.mdx/.feature/.toml/.ts/.mts`
- **Source type:** primary (measured)
- **Notes:** The miss rate rises with phrase length, which is the wrong direction: the longer and
  more specific the claim — that is, the more precisely it identifies a rule rather than a common
  word — the likelier a line-oriented sweep is to miss a site.

## Cluster 4 — how the shipped engines handle the degradation problem

### E16

- **Claim:** `check-scenario-overlap` already implements the shape a review-set derivation needs.
  It (a) fingerprints on **whitespace- and case-normalized** step bodies, so it is wrap-safe by
  construction; (b) splits its output into a **blocking** bucket (`exact-duplicate`, identical
  normalized fingerprint) and an **advisory** bucket (`title-overlap`, same title, differing
  fingerprint) that never fails `--check`; and (c) **ships no verdict** — "real-overlap +
  owning-node is a Warden judgment."
- **Date accessed:** 2026-08-12
- **Status:** confirmed (read)
- **Confidence:** high
- **Source label:** `plugins/sdd/skills/check-scenario-overlap/SKILL.md`
- **Source type:** primary

### E17

- **Claim:** `resolve-governances` states the same separation as an explicit design property: "It
  is a **dumb matcher**: it returns each bar's candidates bucketed by tier and does **not** order by
  precedence or apply `compose` — the consuming agent composes." Ambiguity is returned as
  `status: needs-input` rather than resolved by guess.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (read)
- **Confidence:** high
- **Source label:** `plugins/sdd/skills/resolve-governances/SKILL.md`
- **Source type:** primary

### E18

- **Claim:** The corpus already carries an explicit **fail-loud-in-the-dangerous-direction**
  doctrine for derived answers. `blast-estimate`: `unresolved` areas are "surfaced, never dropped";
  a touch-set resolving to zero areas computes `unknown`, "never `low`"; only `ENOENT` on the
  sensitivity file is benign and "every other read failure fails loud," because swallowing them
  "fails in the **dangerous direction**, silently under-calling blast on exactly the areas a project
  marked as needing care." `check-retired-terms`: "a **malformed registry never reports clean** —
  it names the parse error and exits non-zero, because the registry *is* the check."
- **Date accessed:** 2026-08-12
- **Status:** confirmed (read)
- **Confidence:** high
- **Source label:** `plugins/sdd/skills/blast-estimate/SKILL.md`;
  `plugins/sdd/skills/check-retired-terms/SKILL.md`
- **Source type:** primary
- **Notes:** This is the answer to sub-question 3 already written down — it has simply never been
  applied to a *set* output, only to a scalar and to a violation list.

### E19

- **Claim:** `discoverLayouts` wraps its entire body in `try { … } catch { return [] }`, so any
  failure of the child `discover-specs` invocation yields **no layouts** rather than an error.
  Observed here: under node 22 the child `node <script>.mts` call fails (no `--experimental-strip-types`),
  `discoverLayouts` returns `[]`, and every path resolves to `null`.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (executed)
- **Confidence:** high for the behavior; the trigger is environmental (the repo's stated floor is
  node ≥23.6, where type-stripping is on by default)
- **Source label:** `touch-set-correction.mts:314–335`; observed run
- **Source type:** primary (executed)
- **Notes:** It fails **safe** downstream — zero resolved areas computes `unknown`, not `low`
  (E18) — so this is not a live defect. It is recorded because a review-set derivation reusing
  `discoverLayouts` would inherit a silent-empty path, and an empty *set* has no `unknown` to fall
  back to unless one is designed in.

### E20

- **Claim:** `formation-loop`'s charter excludes this work. It "evolves how the corpus is
  **arranged**, never what it says," its standing subject is `corpus/` + `project-spec/`, and its
  acts are audit-node-shape / split / reconcile. Its input is "the corpus **structure** and
  **discovery**," explicitly not content.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (read)
- **Confidence:** high
- **Source label:** `plugins/sdd/skills/formation-loop/SKILL.md`
- **Source type:** primary
- **Notes:** A set-membership check ("do these five documents state the same rule?") is a claim
  about what the corpus *says*. Under the charter as written it is not a formation act, even
  though formation is the only existing corpus-wide continuous loop.

## Cluster 5 — the settled question this must not reopen

### E21

- **Claim:** This repository has already researched and **rejected** the rule "a claim must appear
  in exactly one place." `.research/documentation-craft/conclusion.md` finds it has "no empirical
  warrant, and should be dropped": a passage "may **restate** a claim freely — recurrence is not
  itself a defect," and the symmetrical failure mode is "a **bare cross-reference** that withholds
  the claim." It further concludes that "claim overlap across pages" is a "**corpus-level,
  judgment-bearing**" concern, "appropriate for a continuous corpus-wide review loop, not for a
  per-page boolean gate," and notes that "reordering a section can silently falsify wording in a
  page nobody edited — drift that a per-document gate structurally cannot see."
- **Date accessed:** 2026-08-12
- **Status:** confirmed
- **Confidence:** high for the citation; the dossier itself rates the cross-page transfer
  **medium** and flags it as its weakest joint
- **Source label:** `.research/documentation-craft/conclusion.md`, sections 1 and 4
- **Source type:** primary (in-repo prior research)
- **Notes:** Directly constrains sub-question 5. "One concept stated in one place" is not available
  as the design principle here; the principle has to be about the **set being named**, not about
  the statement being unique.

## Cluster 6 — the artifact-type axis (added 2026-08-12, second pass)

### E22

- **Claim:** This repository already carries an **artifact-type** axis, defined as "the **squad
  key**: how SDD decides which producer/judge/governances/model/effort handle a given file." It is
  "**one artifact-type per produced file → exactly one squad**," "**universal, not SDD-only**"
  (`skill`, `subagent`, `command`, `agents-section`, `docs`, `astro-page`, `npm-package`,
  `react-component`, …), and "an open string; new types need no schema bump."
- **Date accessed:** 2026-08-12
- **Status:** confirmed (read)
- **Confidence:** high
- **Source label:** `.agents/specs/sdd/design/artifact-type.md`
- **Source type:** primary

### E23

- **Claim:** The artifact-type vocabulary is **supplied by plugins**, not invented locally, and
  flows **marketplace → install → registry → resolution**. A plugin declares `squads[]`, each over a
  set of `artifact-types`; `init-<plugin>` lands that in the per-project registry
  `.agents/universal-plugin.json`; resolution reads that registry. **"SDD core ships only the
  generic defaults"** — a type no installed plugin claims still resolves, to the SDD-default
  producer/judge per role. Observed live in the registry: `aced` claims
  `["skill","subagent","command","agents-section"]`; `quill` claims
  `["documentation","guide","tutorial","article","reference"]`.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (read + registry inspection)
- **Confidence:** high
- **Source label:** `.agents/specs/sdd/design/artifact-type.md` ("Supply");
  `.agents/universal-plugin.json`
- **Source type:** primary
- **Notes:** The default-plus-override shape is load-bearing for §6: it is the existing precedent for
  where a *core* property of a type is stated and how a plugin refines it.

### E24

- **Claim:** A file's artifact-type is **resolved, not stored**, in a defined order: (1) convention
  and context — "a `SKILL.md` under `skills/` is a `skill`" — "**not** the file extension"; (2) the
  optional tiebreaker map `.agents/sdd/artifact-types.toml`, longest-prefix glob, consulted only on
  genuine ambiguity, with "**ask once — confirm, never guess**" and the binding written back;
  (3) match against the registry, zero plugins → SDD default, two+ → contested-type disambiguation.
  `resolve-governances` implements the consuming half: `--path <file>` consults the tiebreaker and,
  on no match, prints `note: 'no tiebreaker match — classify by convention'`. The tiebreaker file
  does not exist in this repo, so every file here classifies by convention.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (read + observed absence)
- **Confidence:** high
- **Source label:** `.agents/specs/sdd/design/artifact-type.md` ("Demand", "The tiebreaker map");
  `plugins/sdd/skills/resolve-governances/scripts/resolve-governances.mts:478–498`
- **Source type:** primary
- **Notes:** So the path from *a touched file* to *its artifact-type* is already specified and
  already implemented. Nothing new is needed to get the key; what is missing is what the key returns.

### E25

- **Claim:** The two documents defining this axis **contradict each other on whether a spec node
  carries an `artifact-types` field**, and the corpus follows one of them.
  `design/artifact-type.md` states: "A node README carries `spec-type` only — **never** an
  artifact-type field. A file's artifact-type is **resolved, not stored** on the file or the node."
  `design/spec-structure.md:51` states: "A node README carries only **classification** frontmatter —
  `spec-type`, `artifact-types`, and `concept` … The three classification axes are mutually
  orthogonal: `spec-type` says *what kind of spec node this is*, `artifact-types` (the squad key,
  e.g. `governance`) says *who produces and judges it*." Measured: **0 of 127** node READMEs carry
  `artifact-types:`; **95** carry `spec-type:`. The enforcing engine
  (`check-spec-structure`) parses **only** `concept` and `spec-type` — its frontmatter parser has no
  `artifact-types` branch.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (executed)
- **Confidence:** high
- **Source label:** `.agents/specs/sdd/design/artifact-type.md`;
  `.agents/specs/sdd/design/spec-structure.md:51`; grep over `.agents/specs/**/README.md`;
  `plugins/sdd/skills/check-spec-structure/scripts/check-spec-structure.mts:68–85`
- **Source type:** primary (measured)
- **Notes:** This is **the #453 defect, live, in the spec that defines the corpus's own structure
  rules** — a rule changed in one document while a sibling in the same `design/` folder still states
  the retracted version, with the implementation following the live one and nothing detecting the
  disagreement. It is also, precisely, a two-member set that a per-artifact-type unit description
  would have named. Reported here as evidence; not fixed in this dossier.

### E26

- **Claim:** Artifact-type is keyed to a **single file** — "one artifact-type per produced **file** →
  exactly one squad" — while the unit #453 is about is **multi-file**. Measured composition of the 50
  folders in `plugins/sdd/skills/`: **50** `SKILL.md`, **49** `README.md`, **54** `scripts/*.mts`,
  **1** `references/rubric.md`, and **zero** nested `SKILL.md` at any depth. So every skill unit holds
  at least two, usually three, distinct file kinds, and nothing in the artifact-type model says which
  other files constitute one artifact of that type.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (executed)
- **Confidence:** high
- **Source label:** `.agents/specs/sdd/design/artifact-type.md` ("What it is"); file census over
  `plugins/sdd/skills/*/`
- **Source type:** primary (read + measured)

### E27

- **Claim:** The three member kinds of one skill unit **do not resolve to one artifact-type**, and two
  of them do not resolve at all today. `artifact-type.md`'s convention rule names only *"a `SKILL.md`
  under `skills/` is a `skill`; an agent under `agents/` is a `subagent`"* — it states no convention
  for a skill's `README.md` or its `scripts/`. Run against all three members of one unit,
  `resolve-governances --path` returns `artifactType: null` with
  `note: "no tiebreaker match — classify by convention"` for **each**, because
  `.agents/sdd/artifact-types.toml` does not exist in this repo (E24).
- **Date accessed:** 2026-08-12
- **Status:** confirmed (executed)
- **Confidence:** high
- **Source label:** `node …/resolve-governances.mts --root . --path <p>` for
  `plugins/sdd/skills/check-retired-terms/{SKILL.md, README.md, scripts/check-retired-terms.mts}`
- **Source type:** primary (executed)
- **Notes:** Per `artifact-type.md`'s own rule, genuine ambiguity means "**ask once — confirm, never
  guess**," then write the binding back. A skill `README.md` is exactly that case and the ask has
  never been made — the tiebreaker map the model provides for it is empty. So the multi-file tension
  is not a prospective cost of the reframe; it is an unresolved ambiguity sitting in the corpus now.

### E28

- **Claim:** Resolving the tension by declaring every file under `skills/<name>/` to be type `skill`
  would **re-route production and judging** for two of the three member kinds, against the live
  registry. `aced` claims `["skill","subagent","command","agents-section"]`; `quill` claims
  `["documentation","guide","tutorial","article","reference"]`. A skill `README.md` typed
  `documentation` resolves to quill (`quill-doc-writer` / `quill-judge`, bars `quill-builder-spec` /
  `quill-builder-impl`); typed `skill` it resolves to aced (`aced-scenario-writer` /
  `aced-impl-judge`). The `.mts` engine sources are claimed by neither and fall to the SDD default
  squad.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (registry read)
- **Confidence:** high
- **Source label:** `.agents/universal-plugin.json` `sdd-plugins[]`
- **Source type:** primary
- **Notes:** So "everything in the folder is one type" is not a harmless simplification — it collapses
  the squad key, which is the one job the axis exists to do.

### E29

- **Claim:** The defect the unit exists to catch is **invisible to every member's own squad**. PR
  #444's round-4 blocker was duty-table drift between a `SKILL.md` and its `README.md` — a
  *consistency* relation between two files. aced's bars judge frozen-`.feature` conformance for agent
  behavior; quill's judge runs a per-scenario static inspection plus one **document-scoped** integrity
  pass. Both are scoped to a single document; neither has a cross-document face.
- **Date accessed:** 2026-08-12
- **Status:** confirmed (read)
- **Confidence:** medium-high — the bar bodies were read via their skill descriptions and the quill
  agent definition, not line-by-line
- **Source label:** PR #444 body; `quill-judge` / `quill-builder-impl` and `aced-builder-impl`
  descriptions
- **Source type:** primary
- **Notes:** Load-bearing for the granularity choice in §6: if no member's squad can see the relation,
  the unit shape cannot be a property of any one member's squad.
