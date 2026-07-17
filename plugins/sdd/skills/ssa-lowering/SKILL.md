---
name: ssa-lowering
description: "Internal skill: the reasoning front-end that lowers one-or-more change requests into a partitioned set of Missions — one owning Mission per spec-node (SSA) — applying the Oracle (should we?) and Architect (where/barrier?) lenses, resolving same-node contention into ordered versioned-RAW edges, and lowering only the frontier deeply; run by the conductor during intake/Explore, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# SSA-Lowering Doctrine

The reasoning **front-end** of the CR→mission compiler. Given one-or-more change requests, it decides
**the cut**: how to partition their combined **write-set** into a set of **Missions** — targeting SSA,
**exactly one owning Mission per spec-node** — plus the RAW/parent-child edges, per-Mission touch-sets,
and provenance that the deterministic back-end then records and classifies.

It sits **above** the shipped deterministic machinery and cites it, never re-implements it:
- the [`mission-graph`](../mission-graph/SKILL.md) store **records** the partition (nodes, edges, status);
- the [`collision-ladder`](../collision-ladder/SKILL.md) **classifies** a known node collision hard/soft;
- [`touch-set-correction`](../touch-set-correction/SKILL.md) **reconciles** a declared touch-set against the real diff.

This doctrine **decides** what to record; it does not build the Missions (the mission loop does), store
them, classify collisions, or **automatically emit** its decision-evidence (SQ-F5 #194, deferred — in v1
you record the shown-work **by hand**). Working node name only (SQ-name #195).

Its output is a **judgment call**, not a pure function. Two SDD actor lenses are pulled forward into
planning and applied with **strong weight** — judgment first, mechanics second.

## When to run

**Routing guidance for the caller** — the conductor deciding what to send here. It is **not a
self-refusal gate**. Once this doctrine is invoked it **always runs step 1 (the Oracle lens)** and
never exits without a verdict: step 1 judges legitimacy *before* partitioning, so "there is nothing
to partition" cannot gate it.

Route a change request here when it must be **cut into Missions** during intake/Explore:
- a CR spanning multiple capabilities must be decomposed into Missions;
- two-or-more open CRs overlap on a shared capability and must be **regrouped** into Missions;
- a **far-horizon** CR has reached the frontier and must be lowered (re-validate it — never trust the filing-time verdict);
- a CR describes a **project-wide** change (rename/refactor) that must be planned as fleet work (barrier).

These have nothing to partition, so routing them here buys nothing:
- a single-capability change to one artifact-type → straight to the mission loop;
- adding one scenario to an existing feature file within one node;
- running `ready`/`cycles` over the mission-graph store (that is a query);
- classifying an already-detected node collision (that is `collision-ladder`).

**Invoked anyway on one of those, do not refuse.** Run step 1, record the Oracle verdict, and emit
whatever the cut yields — for a single-capability CR that is one Mission, or **zero** if the Oracle
kills it. Refusing drops the legitimacy judgment, which is the cheapest judgment to make here and the
most expensive to skip. Note the standing gap this leaves: a CR routed straight to the mission loop is
Oracle-vetted by nothing until the intake-vet automation lands (#196).

## Procedure

Work the steps in order. **Record the shown-work as you go** (see "Decision-evidence") — the produced
partition is not complete without it, and until SQ-F5 lands nothing emits it for you.

### 1 — Oracle lens: judge legitimacy before lowering (kill-or-reshape up front)

Before partitioning anything, decide whether the CR should be done **at all**. Lowering dead work is the
most expensive mistake; killing it here is the cheapest flush (nothing is lowered).

- **Stale** — a better solution has **shipped since the CR was filed**, so its goal is already covered
  (e.g. a CR to add mailer retry after the mailer was replaced by an auto-retrying queue). Recognize the
  supersession; **kill or reshape** the CR to only what remains uncovered.
- **Misaligned** — nothing supersedes it and it is technically doable, but it fits the **product
  direction** poorly (e.g. a per-user telemetry tracker against an explicitly zero-telemetry, local-only
  product). Judge it on **direction-fit**, not on being superseded; **reshape toward the direction or
  kill** it up front. Do not mistake misalignment for staleness — they are different verdicts.
- **A killed CR lowers to ZERO Missions.** The produced partition contains **no** Missions — in
  particular no Mission that builds the superseded/off-direction work.
- **Re-check monadically.** A far-horizon CR judged legitimate at filing can go **stale** while parked.
  When it reaches the frontier, **re-run the Oracle check** against the *current* ground; the re-confirm
  or newly-kill verdict must reflect the shifted state, not the stale filing verdict.

Record the legitimacy verdict (ship / reshape / kill + why) as shown-work.

### 2 — Architect lens: placement and barrier detection

For each surviving CR, decide **where each piece belongs** and whether it is a barrier.

- **Screaming placement.** Each distinct capability lands in its **own spec-node**, placed by the
  capability it owns (screaming architecture) — never by a technical layer. Two unrelated new
  capabilities in one CR (e.g. a rate-limiter and an audit-log) go to **separate** nodes; do not fuse
  unrelated capabilities into one Mission.
- **Barrier detection.** A **project-wide** change — an architecture refactor, a rename of a core type
  used across every capability — **owns no single node**; it cross-cuts most of the project and would
  WAW-conflict with almost everything. Mark it a **barrier**:
  - it is **not** modeled as one node-owning Mission among peers;
  - **hoist it early** — schedule it before the feature Missions that would rebase onto it;
  - **nothing else starts before the barrier retires**; the fleet **rebases onto the new world** after
    the fence, then fans out.

Record the placement decisions and any barrier verdict (with its fence reasoning) as shown-work.

### 3 — The SSA cut: one owning Mission per spec-node

Partition the combined write-set toward SSA.

- **Single-writer.** Every spec-node the write-set touches is assigned to **exactly one** owning Mission.
  No spec-node is assigned to two Missions at once. A **new** node is single-writer by construction;
  contention only arises on an **existing shared** node (step 4).
- **Cohesion — do not over-split.** Tightly-coupled work within one node that cannot be verified apart
  stays in **one cohesive Mission**, verifiable as a unit. Do not scatter a node into thin fragments
  across Missions. (The one node still has exactly one owning Mission.)
- **Regroup by ownership, across CR boundaries.** Cut Missions by **ownership of nodes, not by
  originating CR** — so N CRs produce M Missions, not one-per-CR. When two CRs both touch a shared
  node, **one** Mission owns that node drawing on **both** CRs (not one Mission per CR splitting the
  node).
- **Provenance + local ref.** Each Mission **records its originating CR(s) as provenance**, and carries a
  **locally-minted mission-ref** (the mission-graph node id) — **not** a tracker ticket ref. The tracker
  speaks intent; a Mission is a local decomposition of it.

### 4 — Resolve same-node contention by versioning it into an ordered dependency

When two concerns both need to write the **same** existing node, do not emit two concurrent writers.

- **Order can be imposed** (one concern can sensibly go first, the other rebases/reworks onto its
  result): **version it** — do-first concern A, then rework-second concern B — and emit a **RAW edge**
  A → B. The partition then contains **no two Missions writing that node concurrently**; it contains the
  RAW edge ordering the second after the first. **Do not** call an order-imposable contention an
  irreducible hard collision.
- **Order-less concurrent co-write** (both must write the node and no order avoids rework either way):
  leave it an **irreducible hard** collision. Recognize that no clean order exists (a versioned-RAW would
  not resolve it); **serialize** the two writes (do not start them concurrently); and **flag** that the
  second write needs real **rework**, not a clean replay, because the first moved the ground.
- The coarser the atom, the more a same-node clash biases to serial. Emit the RAW / hard-collision
  annotation for the back-end; the [`collision-ladder`](../collision-ladder/SKILL.md) — not this doctrine
  — later descends the finer grains to justify any hard→soft downgrade.

### 5 — Lower lazily (monadic) and default conservative-first

- **Deeply lower only the frontier.** Cut the near-term frontier into concrete, verifiable Missions.
  Leave the fuzzy far horizon as **coarse Operations**, not prematurely partitioned Missions —
  **commit near, speculate far**; commitment decays with distance. Do not schedule the far horizon.
- **Conservative-first on low confidence.** When two Missions' predicted touch-sets overlap on a node
  and the overlap is only **partially known** with no finer evidence of disjointness, treat the unproven
  overlap as a **hard** collision and **serialize**. Do not optimistically parallelize on a guess. Note
  that it would **relax to parallel only** when finer evidence (via the collision-ladder) proves the
  writes disjoint.
- **Never fabricate a dependency.** When the write-set is a set of genuinely **independent** spec-nodes
  with no shared writes, emit **no RAW or collision edge** between those Missions — let them run in
  **parallel**. Conservative-first applies to *unproven overlap*, not to proven independence.

### 6 — Emit the partition (do not re-implement the back-end)

Emit, for the deterministic back-end to consume:
- the **Missions** (each owning its spec-node(s), with its per-Mission touch-set);
- the **RAW / parent-child edges** and any barrier fence;
- each Mission's **provenance** (originating CR(s)) and **locally-minted ref**;
- the hard-collision / order annotations.

The [`mission-graph`](../mission-graph/SKILL.md) store **records** it; the
[`collision-ladder`](../collision-ladder/SKILL.md) **classifies** node collisions; do **not** re-derive
`ready`/`cycles`, re-detect collisions, or re-classify grains here. Record the decision-evidence **by
hand** (SQ-F5 #194 automation is deferred).

## Decision-evidence (record by hand — v1)

The record **accompanies the produced partition** — the partition is incomplete without it. Record:
- **Sources** — the CRs, specs, and shipped changes the cut drew on.
- **Oracle verdict** — per CR: ship / reshape / kill, and why (staleness vs misalignment vs
  frontier re-validation).
- **Architect verdict** — node placements and any barrier: the fence/rebase reasoning, and the
  sequencing it implies — that the fleet rebases onto the new world after the fence, then fans out.
- **Cut decisions** — why each Mission owns its node(s), each RAW/versioning choice (do-first vs
  rework-second), each irreducible-hard call, and each conservative-vs-parallel default.

This record must be **in view alongside the partition** when the cut is reviewed or judged; nothing
emits it automatically until SQ-F5 lands.

## Boundaries

- **Decides the cut only.** Does not build Missions (mission loop), record the plan
  ([`mission-graph`](../mission-graph/SKILL.md)), classify a collision at a finer grain
  ([`collision-ladder`](../collision-ladder/SKILL.md)), reconcile a touch-set against a diff
  ([`touch-set-correction`](../touch-set-correction/SKILL.md)), spawn worktrees, or gate.
- **Out of scope (cite, never build here):** the SQ-F5 decision-evidence **emit** automation (#194); the
  capability/engine **name** finalization (#195 — keep the working name `ssa-lowering`); the
  Oracle/Architect **intake-vet** automation (#196). Do not rename or rebuild the shipped back-end.
