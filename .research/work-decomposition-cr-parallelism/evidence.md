# Evidence — work decomposition & CR/task dependency tracking

One section per claim. Status: confirmed | uncertain | corrected-drift. Confidence: high | medium | low.

## C1 — beads is a Dolt-backed, write-time-cycle-rejected dependency DAG
- date: 2026-07-11
- status: confirmed (corrected-drift from launch-era JSONL model)
- confidence: high
- source: beads README / FAQ / docs/DEPENDENCIES.md / CHANGELOG (v1.1.0, 2026-07-04)
- type: primary repo docs
- notes: Dolt embedded SQL is source of truth since v1.0.0; `.beads/issues.jsonl` is export-only. Hash IDs (`bd-a1b2`), priority 0–4. "Beads also rejects cycles at write time" on `bd dep add`; `bd graph check` for detection. Blocking edges: `blocks`/`parent-child`/`conditional-blocks`/`waits-for`; informational: `related`/`tracks`/`discovered-from`/`caused-by`/`validates`/`supersedes`. `bd ready` computes transitive blocking offline ~10ms. Stale claims dropped: JSONL-as-source-of-truth, sequential `bd-42`, priority 0–3, "four edge types" as complete set.

## C2 — Wayfinder is a methodology over a tracker; native-blocking-only; HITL/AFK label axis
- date: 2026-07-11
- status: confirmed (changed since prior notes)
- confidence: high
- source: mattpocock/skills wayfinder SKILL.md (graduated to engineering 2026-07-08, v1.1.0); commit e5932a7; Matt Pocock X/aihero.dev
- type: primary
- notes: breadth-first fog-clearing; single `wayfinder:map` issue (Destination/Notes/Decisions-so-far/Not-yet-specified/Out-of-scope) + child tickets. Uses only the tracker's native blocking edge (renders frontier visually); falls back to body convention only if tracker lacks it. Labels reorganized on HITL/AFK autonomy axis: `research`=AFK, `prototype`/`grilling`=HITL, `task`=either. HITL ticket must resolve via live human exchange — agent must not self-answer (hardened by e5932a7 "stop the agent grilling itself"). Tracker-agnostic: GitHub/GitLab/local-markdown. Frontier = open+unblocked+unclaimed; claim = assign-to-self.

## C3 — Agent task trackers rarely compute parallelism; only spec-kit/Kiro surface it, both coarse
- date: 2026-07-11
- status: confirmed
- confidence: high
- source: task-master repo (find-next-task.js), spec-kit templates/commands/tasks.md + issue #1934, Kiro docs, Backlog.md repo, OpenSpec repo, Claude Code Agent SDK todo-tracking docs
- type: primary
- notes: Task Master = real `dependencies[]` DAG, `next` picks one (deps-all-done + priority tie-break), no ready-set/parallel. spec-kit `[P]` marker = "different files, no incomplete deps" (file-atomic); deps are prose; users want real syntax (#1934). Kiro groups independent tasks into "waves" (agent-inferred, not persisted edges). Backlog.md/OpenSpec = grouping only, no parallel. Native TODO tools flat except Claude Code Task tools (real DAG: `addBlockedBy`/auto-unblock/cycle-reject).

## C4 — Build "affected" tooling implements git-diff→rdeps-closure→antichain, at file/target granularity
- date: 2026-07-11
- status: confirmed
- confidence: high
- source: nx.dev, turborepo.dev, bazel.build/query/guide, pantsbuild.org, rushjs.io
- type: primary docs
- notes: Nx affected (project unit, file→project index, task-edges≠project-edges). Turborepo package+task DAG, `dependsOn`+`^`, `--filter=[main]...pkg`. Bazel `rdeps(universe, seed, depth)` bounded reverse-dep closure; two actions parallel-safe iff no path between + disjoint outputs; `--output maxrank` = topo level. Pants file-level dependency inference (imports→edges), `--changed-since --changed-dependents=transitive` — finest, closest to symbol touch-sets. Rush `--impacted-by` = blast-radius selector; phased builds widen antichains. All treat file as atomic; parallelize on graph-independence alone.

## C5 — Disjointness → parallel is proven in production at build-target granularity
- date: 2026-07-11
- status: confirmed
- confidence: high
- source: Ananthanarayanan et al. SubmitQueue (EuroSys 2019); docs.aviator.co affected-targets; articles.mergify.com
- type: peer-reviewed + product docs
- notes: Uber `CT(change)` = targets whose hash changed; independent iff `CT(A)∩CT(B)=∅`; speculation tree + logistic-regression predictor ~97%; parallel land for independent changes; 53% less CI, 37% lower P95. Aviator `affected_targets`: disjoint targets → merge any order; overlap → co-test. Mergify batches by changed directory. Granularity = build target/directory, never region/symbol.

## C6 — Sub-file (region/symbol) overlap classification exists only in research; HARD = same top-level declaration
- date: 2026-07-11
- status: confirmed
- confidence: high
- source: Accioly/Borba/Cavalcanti EMSE 2018; Cavalcanti/Borba/Accioly OOPSLA 2017; Levin arXiv:1508.01872 (2015); "Detecting Semantic Conflicts via Static Analysis" arXiv:2310.04269 (2023)
- type: peer-reviewed + preprint
- notes: conflicts concentrate where devs edit same/consecutive lines of the same method — and roughly equal for methods, fields, modifier lists → HARD unit = same top-level declaration, not methods only. Structured merge: ordered method bodies (same-symbol=HARD) vs unordered member lists (different-symbol same-file=SOFT); ~62% false-positive reduction vs line merge. No product ships this granularity.

## C7 — Static overlap cleanliness is NOT a merge-safety proof (~33% of clean merges semantically broken)
- date: 2026-07-11
- status: confirmed
- confidence: medium (single 2011 corpus; magnitude not calibrated prior)
- source: Brun/Holmes/Ernst/Notkin FSE 2011 / TSE 2013 (Crystal); Owhadi-Kareshk ESEM 2019 / JSS 2024
- type: peer-reviewed
- notes: 9 systems, 550k versions — ~17% textual conflicts, but ~33% of git-clean merges had build/test conflicts (action-at-a-distance: signature change + distant caller). 3-tier severity textual→build→test. ML pre-filter: clears safe pairs F1~0.95, weak at real conflicts F1~0.57 — good for cutting speculation cost, bad as oracle. Implication: SOFT = "rebase-cost-only, lower-risk" not "safe"; keep speculative-CI + bisection backstop (Bors O(E log N), Mergify n-ary, Uber speculation-graph).

## C8 — Graphite/merge-queues execute declared/empirical topology, not inferred overlap
- date: 2026-07-11
- status: confirmed
- confidence: high
- source: graphite.com blog/docs; docs.github.com merge queue; bors-ng; docs.aviator.co
- type: primary
- notes: Graphite = parent-pointer topology in `refs/branch-metadata`, serial in-stack / parallel across stacks, speculative CI + topology-aware bisection; no content analysis. Merge queues infer conflict from CI pass/fail; recovery via bisection (Bors binary, Mergify n-ary, Aviator binary). SDD's static-overlap step is precisely what these omit.

## Corrections applied (from sub-agent hallucinations / brief errors)
- beads dates are 2026 (not 2024); IDs hash-based (not sequential `bd-42`); priority 0–4 (not 0–3).
- SubmitQueue venue = EuroSys 2019 (not ICSE-SEIP).
- The Palantir *Technologies* blog is git merge-performance work, unrelated to the academic *Palantír* awareness tool — do not conflate.
