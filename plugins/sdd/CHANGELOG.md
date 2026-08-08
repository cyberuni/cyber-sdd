# cyber-sdd

## 0.1.0

### Minor Changes

- 4f6dd97: Rename the package from `@cyberplace/sdd-plugin` to `cyber-sdd` and make it self-sufficient for a
  standalone install: `gherkin-cli` is now a real dependency (imported directly, no longer shelled
  out via `npx`), and `package.json#files` ships the right surface (skills, agents, plugin manifests)
  for `npm install`.

  Fixes a bug where concurrent `.feature` checks could corrupt the shared `npx` install cache under
  load, intermittently breaking `check:spec`.

- 1c91b5c: Add `check-retired-terms` — a declared registry of retired paths and conventions (`.agents/sdd/retired-terms.toml`) plus a verify-time sweep over every git-tracked file that reports each surviving occurrence as `file:line:term` with its replacement and exits non-zero. Narrowed by built-in exclusions (the guard's own definition, durable provenance), a per-entry scope, and a two-form allow list. A malformed registry fails loud rather than falling back — the registry is the check.
- a9c5528: The doctrine-loop Scanner now cross-checks each plan brief's own `todos-all-done` against its
  declared `source-closed` during its pass, and derives a **retirement clearance set** from
  agreement — feeding it to `plan-retirement`'s existing `--retire` clearance-set input instead of a
  human hand-assembling it. It never autofixes a plan brief's frontmatter `status` (no legal terminal
  value exists for that field); a disagreement between the two signals is excluded from the clearance
  set and surfaced as a flagged finding in the Scanner's pass summary instead.
- 1884751: Add the plan-brief finalize backstop to the SDD conductor: a mission that lands now reconciles its plan brief's `todos` and `## NEXT` anchor to the landed state, in the same change as the work, rather than leaving the drift to a later retro.

  The reconcile is a backstop — it runs in one pass over the whole brief even when nothing updated it mid-flight — and it reconciles _to the landed state_, never _marks everything done_: a todo whose work was held out of scope stays un-completed and rides the follow-up machinery. It writes the brief and nothing else, including no terminal value in the plan-level `status` dispatch flag, which stays `active | approved` with terminal-ness derived. A mission that halts is checkpointed at its true in-progress state, not reconciled as landed.

- b9ee04d: The SDD spec-judge now emits a non-blocking spec-format conformance warning when a behavioral
  `spec.md` is missing a required section — especially `## Use Cases`, `## Control Flow` (CFG), or
  `## Scenario map`. The warning is surfaced in the spec-gate report and never blocks the gate, sets
  `ALIGNED: false`, or short-circuits the lenses on its own. Reference and descriptive nodes raise no
  warning.

### Patch Changes

- 05e1f1a: SDD combat-log: off-enum cause visibility nudge (`cause-candidate` flag) + reconcile gate stop-cause enum to `dimension|clearance|ceiling` (discharges 263-op6-m2).
- ebee17d: SDD cold-instrument doctrine: mutation-sweep-first for instrument subjects; non-author evidence for rule-level decisions; new/revived rules stated abstractly + ablation-tested before landing.
- 9d3ff29: **Fix** — SDD skill-script CLIs silently no-opped on the supported Node floor. The entrypoint
  guard used `import.meta.main`, added only in Node 24.2.0, while the engines floor is `>=22`; on
  Node 22/23 the guard was `undefined`, so the `bin` ran nothing and exited 0. Switched all 19
  affected scripts — and 7 more that used the `file://${process.argv[1]}` concat, which breaks on
  any install path holding a space, `#`, `?`, or `%`, and under the symlink npm creates for a `bin`
  — to the portable `pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url`
  entrypoint check. Adds a guard test so no shipped script can regress to either form. Fixes #272.
- ff85de9: verify-scenarios: bind a scenario whose test title differs only by punctuation or whitespace

  A curly apostrophe pasted where the frozen `.feature` has a straight one used to land the same
  scenario in BOTH the UNBOUND list and the EXTRA list, with nothing saying the two were the same
  binding — so a real signal read as an unbound scenario and got hand-judged at every impl gate. The
  fold now retries an unmatched key against unclaimed results on a punctuation- and whitespace-folded
  comparison key (curly quotes/apostrophes, dashes, ellipsis), and reports the bind as a **probable
  title mismatch** naming both verbatim titles so the typo still gets fixed. Titles are never
  rewritten, an exact match always wins, case is not folded, and an ambiguous fold stays UNBOUND.

  Closes #312.

- a3c25a6: SDD spec-gate checks escalate malformed input instead of failing open. A root `spec.md` whose `status` is missing or outside the lifecycle enum is now a `check-spec-state` violation, and a per-project `check-project-specs` run that finds such a spec escalates instead of reporting "no spec governs — skipped" with exit 0 (#316). A `## Use Cases` data row whose `Scenario` cell is empty or absent is reported like an un-backticked one, rather than skipped (#364). Also drops the dangling spec-tree pointers shipped scripts and skills cited — a repo-only path is a broken link for every installed user (#290).
- 59e08d9: **Fix** — `plugin-contract-governance`'s role-loads table dropped `architect-spec` from the
  spec-producer row, so plugin authors built agents that loaded three bars and were graded against
  four.

  The table contradicted its own preamble two lines above it, which states the spec-gate lens set as
  `{oracle, builder, architect}` and that "a producer self-aligns to exactly the bars its judge
  grades". The impl-producer row one line below correctly carried its `architect-impl` bar against its
  own `{builder, architect}` set, which is what identifies the spec-producer row as a dropped cell
  rather than a deliberate narrowing. `spec-producer-governance` — the procedural authority — and
  `design/specialists-and-squads.md` — the table's declared owner — both name all three bars.

  The cost was measured, not theoretical: six of six cold spec-judges blocked at governance pre-flight
  on a plugin built to this row, and when the affected nodes were re-authored with the missing bar
  loaded, six of six carried a real defect only that bar caught.

  Also notes in the table's preamble that it is a shipped copy of a spec-owned table, restated because
  a governance loads standalone and cannot reach the spec tree — so a row missing part of its lens set
  should be read as a transcription slip.

- b9260f8: Scanner detects an already-distilled mission by parsing the ledger as JSONL, never a substring grep (reuses `distilledCrRefs`; no engine change).
- 1acc068: Codify Rule 1 (doctrine keep): a fold/aggregation node whose rule combines two or more interacting conditions states its rule in closed form — and re-derives its soundness against the real data model — before deriving scenarios; single-condition folds may be by example. Buys convergence, not coverage: pair with a mutation sweep and a safety dual. Includes the matrix corollary (draw every independent cell as a CFG branch, exclude degenerate cells). Realized in `suite-format-governance`, `spec-producer-governance` (fold instruction before scenario authoring), and `builder-spec-governance`.
- 946429d: SDD doctrine: sanity-check a split's organizing axis against a real capability boundary (#388); prove a Clearance repair isn't a back-fit via pre-repair-draft failure (#389).
