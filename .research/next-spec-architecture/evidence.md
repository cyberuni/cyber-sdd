# Evidence

All measurements taken in a worktree of `cyber-sdd` at `0e35688`, with `pnpm verify` green
(exit 0) before any trial began.

## E0 — The mechanics the trial had to respect

Established by reading the shipped governances, not assumed.

| Mechanism | What it actually is | Path |
|---|---|---|
| A node | `<capability>/<unit>/README.md` + `<unit>.feature`. Frontmatter is only `spec-type` + optional `concept`. | `.agents/specs/sdd/project-spec/place-node/` |
| Freeze | A **feature-level `@frozen` tag** in a git-tracked file, set by a spec-gate `approve` on the files the CR touched. Not a lock — a marker plus code review. | `plugins/sdd/skills/lifecycle-governance/SKILL.md` |
| Relocation | "A pure move/rename **preserves the freeze** … a `git mv` with zero content delta … is not a gate-able edit." | `plugins/sdd/skills/lifecycle-governance/SKILL.md` |
| The verdict unit | A scenario's `@id:<slug>` tag if present, else its **verbatim name**, bound to a test whose leaf title is that name pasted verbatim. | `plugins/sdd/skills/verify-scenarios/SKILL.md` |
| The default read path | Frontmatter only. The gateway scans spec frontmatter to route and never reads bodies (ADR-0017). | `plugins/sdd/skills/discover-specs/SKILL.md` |

Two facts from this table do most of the work below: **freeze survives a pure rename**, and
**the corpus is already not in the default read path**.

## E1 — Corpus and read-path sizes

| Quantity | Bytes |
|---|---|
| Whole spec corpus (232 files: 157 `.md` + 75 `.feature`) | 1,947,815 |
| — of which `.md` | 1,287,337 |
| — of which `.feature` | 660,478 |
| Frontmatter-only index (what the router actually reads, ADR-0017) | ~48,165 |
| Auto-loaded at session start (`CLAUDE.md`) | 2,790 |

The default read path is **2.5% of the corpus**. This is the number direction B's premise
turns on, and it was measured before either trial ran.

## E2 — Trial A: colocating `place-node`

The transformation performed (`trial-a/colocate-place-node.patch`):

- `git mv .agents/specs/sdd/project-spec/place-node/README.md plugins/sdd/skills/place-node/spec.md`
- `git rm .agents/specs/sdd/project-spec/place-node/place-node.feature` — under A2 the suite is
  the already-colocated `plugins/sdd/skills/place-node/scripts/place-node.test.mts`.

### What the repo's own checks said

Baseline and trial were both run as `node skills/check-project-specs/scripts/check-project-specs.mts`
from `plugins/sdd/`.

| Check | Baseline | After Trial A |
|---|---|---|
| `check-spec-state` | ok | ok |
| `check-suite` | ok | **ok** — the deleted `.feature` raised nothing |
| `concept-index` | no drift | **FAIL — drift** |
| `check-spec-structure` | no blocking findings | **no blocking findings** — the vanished node raised nothing |
| `align-spec` | no mechanical drift | ok |
| `check-spec-references` | FAIL, 2 unresolved (both pre-existing `cyberfleet-plugin` links) | **FAIL, 10 unresolved — 8 new** |
| `check-scenario-overlap` | ok | ok |

Root `pnpm check:specs` returned **exit 0 after the move**, because at the root it runs only
`--check-coverage`. Deleting a node's spec and suite outright is invisible to the repo's
top-level gate.

### Cost, counted

- **8 broken relative links** across 5 files, for one node. The corpus carries **114** `../`
  links across 157 markdown files, and `place-node` alone is referenced from **24 files** repo-wide.
- **Discovery is unaffected.** `discover-specs` still returned all three project specs. It is
  project-spec-level and reads the root `spec.md` frontmatter, so colocating *nodes* does not
  touch the router index.
- **The move is a zero-content-delta rename** — `git diff -M` reports 0 changed lines for the
  relocation. Per `lifecycle-governance`, that means **colocation does not unfreeze anything**.
- **Publish surface.** `plugins/sdd/package.json` ships `"files": ["skills", …]`. Colocating
  node specs into `plugins/sdd/skills/` puts them in the npm tarball: 583,286 published
  markdown bytes today, +900,204 bytes of `sdd` node specs — a **154% increase**, shipped to
  every consumer of `cyber-sdd`. This contradicts `spec-structure-governance`'s own rule to
  hoist a spec when it cannot be excluded from what ships.

### The measurement that decided A2

`place-node` already has a colocated suite. Direction A2 says that suite can *be* the contract.
Mapping the 7 frozen scenarios onto the 6 tests in `place-node.test.mts`:

| # | Frozen scenario | Covered by |
|---|---|---|
| 1 | a concept's home is where its facets already sit | `suggestHomes returns the capabilities where the concept already lives` |
| 2 | candidate homes are ranked by how many facets sit there | `suggestHomes ranks by facet count` |
| 3 | a concept with no prior home suggests nothing | `suggestHomes returns nothing for a concept with no prior home` |
| 4 | an overlapping name surfaces the existing node | `findNear surfaces an overlapping name and nothing for a unique one` |
| 5 | a unique name surfaces no duplicate | (same test) |
| 6 | **the suggestion consults no stored routing registry** | **nothing** |
| 7 | **place-node writes nothing — creates, relocates, and edits no file** | **`main runs read-only and emits a suggestion` — asserts only `main(…) === 0`** |

**5 of 7 covered.** The two that are not are the negative constraints — the boundary claims
that make the spec a specification rather than a description. Scenario 7 is worse than
uncovered: a test whose *title* asserts the read-only property makes no assertion about the
filesystem at all. It is a **false green**, and it passes.

The suite is green (6/6) in both states. Nothing in `pnpm verify` detects either gap. There is
no `.agents/sdd/scenario-bridge.toml` in this repo, so `verify-scenarios` is not wired here
and could not have caught it either — and had it been wired, all six tests would have come
back **UNBOUND**, because their titles are implementation vocabulary (`parseConcepts`,
`suggestHomes`, `findNear`) rather than scenario names.

The corpus was restored to `0e35688` after the trial; the branch was deleted.

## E3 — Trial B: externalizing the corpus

Built: `trial-b/spec-store-next.mts`, a real `node:sqlite` store with an FTS5 index and an
`ask` command — the deterministic best case for a second brain, with no model in the loop to
hallucinate.

Ingest of the whole corpus: **232 files, 1,947,815 bytes**.

| Quantity | Bytes |
|---|---|
| Corpus on disk | 1,947,815 |
| SQLite store holding the same content | **5,218,304** |

The store is **2.7× the size of the thing it replaces**, and it is a binary — not diffable, not
greppable, not reviewable line by line in a PR.

### The oracle benchmark

`trial-b/oracle-benchmark.mts` asks ten questions a real mission asks, each with a
hand-established answer path, and scores the second brain against `grep`:

```
HIT  oracle | HIT  grep(311) | what freezes a feature file at the spec gate
HIT  oracle | HIT  grep(143) | where does place-node suggest a home for a new node
HIT  oracle | HIT  grep(329) | may the impl producer edit the frozen suite
MISS oracle | HIT  grep(200) | what is the unit of verdict at the impl gate
       oracle returned: sdd/workflows/gate-verdicts.feature, sdd/design/lifecycle-model.md, aced/sdd-roles/impl-judge/impl-judge.feature, sdd/mission/delivery.md, sdd/mission/impl-judge/README.md
HIT  oracle | HIT  grep(302) | how is a node relocated without unfreezing its suite
MISS oracle | HIT  grep(179) | which folders are reserved and not capabilities
       oracle returned: sdd/spec.md, sdd/design/spec-structure.md, sdd/design/spec-layout.md, sdd/authoring/scaffold-project-spec/README.md, sdd/campaign/README.md
HIT  oracle | HIT  grep(230) | does place-node write any file
MISS oracle | HIT  grep(314) | what happens when a scenario is narrowed
       oracle returned: sdd/corpus/README.md, sdd/spec.md, sdd/design/sdd-stack.md, quill/spec.md, sdd/mission/resolution/README.md
HIT  oracle | HIT  grep(217) | how does the gateway route without reading bodies
MISS oracle | MISS grep(105) | what makes a spec approved
       oracle returned: sdd/workflows/gate-verdicts.feature, sdd/workflows/README.md, sdd/glossary.md, sdd/design/provenance-model.md, sdd/gateway/dispatch/README.md

oracle top-5 recall: 6/10   grep recall: 9/10   grep files to read: 2330
```

Two caveats stated plainly, because they cut against a clean reading:

1. Some `want` labels are arguable. "What is the unit of verdict at the impl gate" returned
   `sdd/workflows/gate-verdicts.feature`, which is a defensible answer. Re-labelling generously
   moves the oracle to roughly 8/10 — still below `grep`'s 9/10 on the same labels.

   A third caveat belongs here because it is a mistake this dossier made and corrected. An
   earlier run of this benchmark reported `grep` at 7/10 with 2,319 file-reads. That run was
   taken **while the Trial A branch was still checked out**, with `place-node`'s spec and suite
   removed from the corpus — so `grep` could not find two answer paths that existed on `main`.
   The numbers above are from the restored corpus at `0e35688` and reproduce identically across
   three consecutive runs. The lesson is the same one E5 records: a measurement over a mutated
   corpus is confidently wrong in exactly the way an uncalibrated oracle is.
2. `grep`'s recall is bought with 2,330 candidate file-reads across the ten questions — it is
   the high-noise baseline, not a fair rival on cost. It is a fair rival on **correctness**, and
   it wins there: 9/10 against the oracle's 6/10, over the same corpus.

Neither caveat touches the finding that matters. **A hit and a miss are indistinguishable
from the output.** "Which folders are reserved and not capabilities" returned five plausible
design documents, none of which is the governance node that states the rule; the answer looks
exactly as confident as the six correct ones. The store has no calibration channel, and adding
a model on top makes that worse, not better — a model turns a ranked list of snippets into
fluent prose that has lost the signal it was already missing.

## E4 — What `cyber-truss` actually claims

The issue frames both directions as `cyber-truss` concerns. Read against truss's own docs, it
does not claim either.

- Truss is **scaffold stage**. Every model page opens `:::caution[Design, not implementation]
  Nothing described here is built.` `packages/cyber-truss/src/` holds a Commander CLI shell —
  `cli.ts`, `program.ts`, `output.ts`, `version.ts` — and no domain commands. `docs/backlog.md`:
  "Design conversation only; no code."
- What it does own is the **connection graph and the confluence guarantee**: artifact-sets,
  connections ("an **undirected** relation between two artifact-sets that must hold"), strain,
  lifting, canonical execution. Its scope boundary against SDD is temporal: "SDD runs from a
  change request to a handoff and then retires, while convergence is a property of repository
  state and has to hold continuously" (`apps/web/src/content/docs/model/relationship-to-sdd.md`).
- Grepping the truss corpus for `colocat|external store|database|SQL|detached branch|bead|
  retriev|quer|second brain` returns **zero hits**. The nearest thing is one open question
  about what vehicle holds *truss's own* pending Requests, explicitly unsettled and scoped to
  its future discharge queue, not to a spec corpus.
- Truss's one worked example of an artifact — a plugin manifest existing as four colocated
  files under one artifact type (`model/artifact-sets.mdx`) — is consistent with A's instinct,
  but it is illustrating the artifact/type distinction, not making a storage argument.

Truss would become relevant only once a *relation* has to be stated between the spec store and
what it specifies. That is downstream of this decision, not upstream of it.

## E5 — The unguarded floor (corroborated independently)

Trial A produced a finding that arrived from a second direction at the same time. Root
`pnpm check:specs` returned **exit 0** with `place-node`'s spec *and* its frozen `.feature`
both removed from the corpus, because at the root it runs only `--check-coverage`. The spec
gate's deterministic floor — `plugins/sdd/skills/spec-gate/scripts/check-spec-state.mts` and
`check-suite.mts` — is reached through the plugin-level `check-project-specs` entrypoint, not
through `pnpm verify`.

The same hole was hit from a different trigger on issue #3, where a bad edit truncated a spec
node — destroying its Use Cases, Control Flow and Scenario map — and `pnpm verify` passed green
over it. It is filed as **issue #5** and is independent of this decision.

It matters here as evidence, not as a defect report. An **ordinary git-tracked file** —
greppable, diffable, reviewable line by line in a PR — went unguarded, because the check that
would have caught it existed and simply was not wired into the commit path. Placement did not
save it. Neither direction in issue #4 addresses that failure mode, and the two are not
symmetric about it:

- **A** inherits the problem at a new address. The guard still has to be wired; it now has to
  walk two trees instead of one.
- **B** inherits the problem *and* removes every property that made recovery possible. A binary
  store cannot be grepped, diffed, blamed, or reviewed. B does not trade these away for a
  guarantee — it subtracts them and leaves the guard exactly as unwired as it was.

All measurements in E2 were taken through the plugin-level entrypoint against a recorded
baseline of the same command, so the reported deltas are real. The root-versus-plugin
divergence is recorded above as a finding rather than assumed away.
