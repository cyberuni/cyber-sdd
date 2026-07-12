# Work decomposition & CR/task dependency tracking — landscape for SDD (July 2026)

## Question
How do agent task/issue systems break work into tasks and track dependencies, and what does the wider field teach us for improving SDD's issue source + CR system and its parallelizability analyzer (dep-DAG + blast-radius overlap → parallel batches)?

## Scope
- In: task/issue data models, decomposition, dependency-edge semantics, readiness/parallelism computation, overlap/conflict classification, parallel scheduling. Three layers: agent task trackers, build-graph "affected" tooling, CR/merge scheduling + conflict research.
- Out: install mechanics; unrelated tools named "bead"; general project-management SaaS.

## Source angles
- Agent trackers: beads, Wayfinder, Task Master, Backlog.md, spec-kit, Kiro, OpenSpec, native TODO tools (Claude Code / Codex / Gemini / Cursor / Amp / Devin).
- Build graphs: Nx, Turborepo, Bazel/Buck2, Pants, Rush, Gradle.
- CR/merge: Graphite stacks, GitHub/Mergify/Aviator/Bors merge queues, Uber SubmitQueue, Google TAP, Meta Sapling.
- Research: Crystal, WeCode, Palantír, structured-merge (Cavalcanti/Apel), Accioly, Brun, conflict-prediction ML.

## Findings

### The three-layer landscape
| Layer | Unit of graph | Touch→affected | Parallel decision | Overlap granularity |
|---|---|---|---|---|
| Agent trackers | task/issue | manual/LLM decomposition | task-DAG independence (few tools) | none (task-level only) |
| Build "affected" | file / target / project | git diff → owning unit → rdeps closure | antichain on graph-independence | file/target atomic |
| CR/merge scheduling | PR / build target | declared topology or speculative CI | disjoint targets → parallel; else serialize | directory (Mergify) / target (Aviator, Uber) |
| Research (not shipped) | method / sub-method symbol | AST/semantic diff | awareness only (+ ML pre-filter) | **symbol / region** |

### Agent task trackers (layer 1)
- **beads v1.1.0 (2026-07-04):** Dolt-embedded SQL DAG (JSONL export-only), hash IDs (`bd-a1b2`), priority 0–4, **cycles rejected at write time** + `bd graph check`. Edge families: blocking (`blocks`, `parent-child`, `conditional-blocks`, `waits-for`) vs informational (`related`, `discovered-from`, `caused-by`, `validates`, `supersedes`). `bd ready` = transitive-blocking, offline ~10ms. MCP server; `dolt push/pull` + federation sync; work-lease system unreleased. Purpose: agent memory across ~10-min sessions.
- **Wayfinder v1.1.0 (2026-07-08):** methodology over a tracker (GitHub/GitLab/local-md). Breadth-first "fog clearing"; one `wayfinder:map` issue (Destination/Notes/Decisions-so-far/Not-yet-specified/Out-of-scope) + child tickets. **Native blocking edge only** (renders frontier in tracker UI). Labels now on a **HITL/AFK axis** (`research`=AFK, `prototype`/`grilling`=HITL, `task`=either); HITL ticket must be resolved by live human exchange — agent must not self-answer. Frontier = open+unblocked+unclaimed. Claim = assign-to-self.
- **Task Master 0.43.1:** `tasks.json` (`id`, `dependencies[]`, `priority`, `subtasks[]`, status enum). `parse-prd` LLM auto-decomposes; `analyze-complexity` 1–10 → `expand`; `next` = deps-all-done + priority tie-break. Real DAG (`validate-dependencies` finds cycles), no ready-set/parallel output.
- **spec-kit v0.12.11 (2026-07-10):** `/speckit.specify → plan → tasks`. tasks.md line `- [ ] [T001] [P?] [US1] desc (path)`. **`[P]` = parallelizable (different files, no incomplete deps)** — the only file-format tool with an explicit parallel marker; deps are **prose** ("depends on T012"). Users filed **issue #1934** for real dep syntax.
- **Kiro:** requirements(EARS)→design→tasks. Builds a dep graph and groups independent tasks into **"waves"** (Wave1=no-deps run concurrently). Syntax agent-inferred, not persisted as edges.
- **Backlog.md 1.47.1 / OpenSpec:** markdown tasks with `dependencies[]` (Backlog, cross-branch validated) or heading-grouped checklists (OpenSpec) — **no parallel computation**.
- **Native TODO tools:** flat `{text,status}` lists (Codex, Gemini, Amp, Cursor, Windsurf, Aider). Exception: **Claude Code Task tools** (~Jan 2026) = real DAG (`addBlockedBy`/`addBlocks`, auto-unblock, cycles rejected, `owner`).

### Build-graph "affected" (layer 2) — the pipeline SDD wants
- Pattern: **build dep DAG over units → map git diff to seed set → reverse-dependency closure (rdeps) → topological-level antichains run concurrently up to `--jobs`.**
- **Nx** `affected --base/--head` (project unit, file→project index, auto-inferred edges, cached graph); task edges ≠ project edges so independent tasks parallelize. **Turborepo** package+task DAG, `dependsOn` with `^` topological prefix, `--filter=[main]...pkg` git-range+traversal. **Bazel/Buck2** target unit, **`rdeps(universe, seed, depth)`** (bounded blast-radius), Skyframe parallel actions, `--output maxrank` = topo level, two actions parallel-safe iff no path between them + disjoint outputs. **Pants** **file-level dependency inference** (parse imports → edges), `--changed-since --changed-dependents=transitive` — closest to symbol touch-sets. **Rush** `--impacted-by` (blast-radius by name), phased builds widen antichains.

### CR/merge scheduling + conflict research (layer 3)
- **Graphite:** declared parent-pointer topology (`refs/branch-metadata`), serial in-stack / parallel across stacks, speculative CI + topology-aware bisection. No content/overlap analysis.
- **Merge queues:** speculative combination testing, conflict inferred from CI pass/fail. Bisection on failure: **Bors** binary O(E log N), **Mergify** n-ary (dir-grouped batching), **Aviator** `affected_targets` — **disjoint targets → merge independently any order; overlap → co-test**. GitHub = head-of-line eviction.
- **Uber SubmitQueue (EuroSys 2019):** `CT(change)` = targets whose hash changed; **independent iff `CT(A)∩CT(B)=∅`**; speculation tree + logistic-regression predictor (~97%); parallel land for independent changes. BLRD = commutativity check to bypass big diffs. **Google TAP:** affected-target batching + culprit-find. **Meta:** server-side push-rebase land.
- **Conflict research (mostly not productized):** Crystal/WeCode = 3-tier severity **textual → build → test** (method-level). Palantír = file/artifact severity+impact, direct vs indirect. Levin 2015 = **sub-method symbol** touch-sets (finest). Accioly EMSE 2018 = HARD unit is **same top-level declaration** (method/field/modifier). Structured merge (Cavalcanti OOPSLA 2017) = ordered method bodies (HARD) vs unordered member lists (SOFT), ~62% FP reduction. **Brun FSE 2011: 17% textual conflicts but ~33% of *clean* merges semantically broken** — static overlap ≠ safety. ML pre-filter (Owhadi-Kareshk) = clears safe pairs F1~0.95, weak at real conflicts F1~0.57.

## Contradictions / caveats
- beads version drift resolved: Dolt (not JSONL-in-git), hash IDs (not `bd-42`), priority 0–4 (not 0–3), cycles rejected (guaranteed DAG).
- No production tool does region/symbol overlap — SDD's SOFT tier is novel and unproven at scale.
- ~33% clean-merge semantic breakage: overlap cleanliness is a scheduler hint, not a safety proof → keep speculative-CI + bisection backstop.

## Open questions
- Would sub-file overlap classification pay for itself vs just target/spec-node disjointness + a CI backstop?
- Multi-hop propagation semantics of beads `waits-for`/`conditional-blocks`.
- Whether spec-kit #1934 (explicit dep syntax) lands and converges toward a beads-like DAG.

## Sources consulted
See conclusion.md "Strongest evidence" + the four research streams (agent trackers; build graphs; CR/merge; freshness). Primary sources: beads repo (README/FAQ/DEPENDENCIES.md/CHANGELOG), mattpocock/skills wayfinder SKILL.md, nx.dev, turborepo.dev, bazel.build, pantsbuild.org, rushjs.io, graphite.com, docs.aviator.co, articles.mergify.com; peer-reviewed: Brun FSE2011/TSE2013, Accioly EMSE2018, Cavalcanti OOPSLA2017, Ananthanarayanan EuroSys2019, Owhadi-Kareshk ESEM2019.
