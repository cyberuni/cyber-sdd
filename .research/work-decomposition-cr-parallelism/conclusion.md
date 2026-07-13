# Conclusion: Work decomposition & CR/task dependency tracking — landscape + implications for SDD

## Last updated
July 2026

## Question
How do agent task/issue systems (beads, Wayfinder, and peers) break work into tasks and track dependencies — and what does the wider field (build-graph "affected" analysis, PR/merge-queue batching, conflict-prediction research) teach us for improving SDD's **issue source + change-request (CR) system** and its **parallelizability analyzer** (dep-DAG + blast-radius overlap → parallel batches)?

## Verdict

The field splits into **three layers that no single tool unifies** — and SDD's opportunity is to be the one that does, because it already owns the spec/CR corpus that the other layers only approximate.

1. **Agent task/issue trackers** (beads, Wayfinder, Task Master, spec-kit, Kiro, Backlog.md, OpenSpec, native TODO tools) — model **task-level dependency graphs**. Best-in-class = **beads** (queryable Dolt-backed DAG, cycle-rejected at write time, rich edge types, `bd ready`) and **spec-kit/Kiro** (spec→task decomposition with a parallel signal). None reason below task granularity; none model file/symbol overlap.
2. **Build-graph "affected" tooling** (Nx, Turborepo, Bazel/Buck2, Pants, Rush) — model **file/target-level dependency graphs** and already implement the exact pipeline SDD wants: *git diff → owning units → reverse-dependency closure → antichain scheduling*. But they parallelize on **graph-independence alone** and treat a file as an **atomic unit**.
3. **CR/merge scheduling** (Graphite stacks, merge queues, Uber SubmitQueue, conflict-prediction research) — decide parallelism from **declared topology** or **empirical speculative CI + bisection**, at **build-target granularity**. Sub-file (region/symbol) overlap classification exists almost **only in academia**, and even there it's proven *not sufficient alone*.

### The three findings that should shape SDD

**A. The disjointness primitive is settled and proven — adopt it directly.**
`touch-set(A) ∩ touch-set(B) = ∅ ⇒ parallelize, any order.` This is Aviator's `affected_targets` and Uber SubmitQueue's `CT(A) ∩ CT(B) = ∅` (logistic-regression predictor, ~97% acc, 53% less CI, 37% lower P95 wait). SDD's antichain-batch scheduler is on solid, industrial ground. Reuse the mechanics: **Bazel `rdeps(universe, seed, depth)`** for bounded blast-radius, **Pants file-level dependency inference** (parse imports → producer/consumer edges) for the symbol-level A→B DAG, **Rush `--impacted-by`** as the named blast-radius selector.

**B. SDD's soft/hard (region/symbol) overlap tier is genuinely novel — but must be positioned as a *scheduler hint*, not a merge-safety oracle.**
Production tools stop at file/target atomicity; the region-level SOFT tier appears **nowhere in products**. Research grounds it: the HARD boundary = **same top-level declaration** (method **or** field **or** signature/modifier-list — Accioly EMSE 2018), and structured-merge theory explains *why* (method bodies are **ordered** statements → same-symbol edits conflict = HARD; class member lists are **unordered** → different-symbol same-file edits don't = SOFT; ~62% false-positive reduction, Cavalcanti OOPSLA 2017). **The load-bearing caveat:** ~17% of merges conflict textually, but **~33% of *clean* merges are semantically broken** (Brun FSE 2011) via action-at-a-distance coupling (signature change + distant caller) that no overlap analysis can see. **Therefore SOFT must mean "lower-risk / rebase-cost-only," never "proven safe," and the pipeline must keep a speculative-CI + bisection backstop** (Bors O(E log N), Mergify n-ary, Uber speculation-graph). The static classifier's job is to *cut speculation cost* (the ML-pre-filter framing: strong at clearing safe pairs F1~0.95, weak at pinpointing real conflicts F1~0.57), not to certify merges.

**C. SDD already has the inputs the other layers fake — this is its structural advantage.**
- Merge queues infer conflict from **directories** (Mergify) or **declared build targets** (Aviator/Uber) because they lack a semantic map. SDD has **spec nodes + `resolve-governances` artifact-types** — a *better* coarse blast unit than a directory.
- spec-kit encodes parallelism as a hand-typed `[P]` prose tag and its own users filed **issue #1934 asking for real dependency syntax**; Kiro's "waves" are agent-inferred with no persisted edges. SDD can persist a **real, queryable DAG** (like beads / Claude Code's Task tools with `addBlockedBy`) instead of prose.
- The CR's plan brief already **declares entry files/symbols** — a Tier-0 touch-set floor the merge-queue world never has pre-merge.

### Concrete recommendations for the SDD issue/CR system

1. **Persist CR dependencies as a real DAG, cycle-rejected at write time** — copy beads (v1.1.0 rejects cycles on `bd dep add` + `bd graph check`) and Claude Code Task tools (`addBlockedBy`/auto-unblock). Do **not** settle for spec-kit-style prose `[P]` tags; that's the anti-pattern its own issue tracker flags.
2. **Adopt distinct edge families** (beads' current model is the template): *blocking* edges that gate readiness (`blocks`, `parent-child`, `waits-for`) vs *informational* links (`discovered-from`, `caused-by`, `supersedes`). SDD's `discovered-from` analog captures work surfaced mid-mission — a first-class need in a spec-driven loop.
3. **Touch-set estimator = Pants-style file/symbol inference over the plan-brief floor, with Bazel-style bounded rdeps** for the producer/consumer DAG; **spec-node + artifact-type as the cheap coarse unit** when inference is unavailable.
4. **Scheduler = antichain batching + the soft/hard predicate on top** (the novel layer), emitting Kiro-style **waves** but with persisted edges and per-pair SOFT/HARD annotations.
5. **Keep a merge-time backstop.** The analyzer schedules; **speculative rebase/CI at merge with bisection on failure** catches the ~33% the static view misses. This dovetails with SDD's just-landed "rebase onto target before the impl gate" (the gate already judges the merged tree — extend that to a batch-merge check).
6. **Readiness as the agent primitive.** `bd ready`-style "what's unblocked now" (Wayfinder's *frontier* = open+unblocked+unclaimed) should be the query the dispatcher/Operator calls, not a prose scan.

### Bonus: Wayfinder's HITL/AFK axis is orthogonally valuable
Wayfinder v1.1 tags every ticket **HITL** (human-in-loop, agent must not self-answer) or **AFK** (agent-alone). That autonomy-boundary label maps cleanly onto SDD's leash/gate model and is worth stealing for the CR/issue schema independent of the parallelism work.

## Confidence
**High** on the three-layer taxonomy, the disjointness primitive, and the soft/hard research grounding (multiple primary + peer-reviewed sources). **High** on beads/Wayfinder current state (primary, dated July 2026). **Medium** on some vendor internals (Aviator predictive scoring, Kiro wave syntax) — flagged inline.

## Strongest supporting evidence
- Uber SubmitQueue (EuroSys 2019): `CT(A)∩CT(B)=∅ ⇒ parallel`, speculation tree + ML predictor. Aviator `affected_targets`: disjoint→any order.
- Accioly EMSE 2018 + Cavalcanti OOPSLA 2017: HARD = same top-level declaration; ordered-body vs unordered-member-list explains soft/hard.
- beads v1.1.0 (2026-07-04): write-time cycle rejection, blocking vs informational edge families, `bd ready` transitive-blocking.
- Bazel `rdeps(u,x,depth)`, Pants file-level dependency inference, Rush `--impacted-by`.

## Strongest weakening / contradictory evidence
- **~33% of clean merges are semantically broken** (Brun) — static overlap cannot prove safety; a scheduler that treats SOFT as "safe" will ship incoherent merges. Forces the speculative-CI backstop.
- No production tool classifies overlap at region/symbol granularity — SDD would be first, i.e. unproven at scale; mitigated by keeping it a *hint*.
- Predictive conflict ML is weak at pinpointing real conflicts (F1 ~0.57) — good for clearing safe pairs, bad as an oracle.

## Not supported / thin
- No primary evidence Google/Meta run an Uber-style speculation-DAG (their documented primitives: affected-target batching / server-side rebase-land).
- Kiro's in-file dependency syntax and Aviator's predictive-batching factors are undocumented/marketing.
- beads' multi-hop propagation semantics for `waits-for`/`conditional-blocks` not fully spelled out.

## Re-check later
- beads past v1.1.0 (active `[Unreleased]` work-lease system); Wayfinder past v1.1.
- spec-kit issue #1934 (explicit dependency syntax) — if it lands, re-compare.
- Any product that ships sub-file overlap classification (would de-risk SDD's novel tier).
