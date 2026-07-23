---
name: collision-ladder
description: "Internal skill: at a known node-level collision between two missions, descends the finer-than-node ladder (file → region → semantic) to classify the clash hard or soft — a read-only downgrade-only disambiguator, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Collision Ladder

The concrete engine for **collision-ladder** — the Op2 second-bullet of the cyberfleet-batch
self-hosting-kernel (issue #189). The shared work list ([`mission-graph`](../mission-graph/README.md))
holds two Missions apart whenever they touch the **same work area** (a node collision), conservatively
serializing *any* same-area overlap. Most such overlaps are false — the area holds many files and the
Missions usually touch **different** ones, or the same file in **different spots**. This engine is the
disambiguator: given a **known** node collision between two Missions, it **descends a ladder of finer
grains** — file → region → semantic — and stops at the first grain that tells a **hard** clash (must
serialize) from a **soft** one (can run in parallel, reconciled by rebase).

It runs **rarely**, only on the colliding pair, only to justify **downgrading a suspected false-hard**
— never as the baseline signal, never to *find* a collision (that is the work list's job).

The ladder (descend only until classifiable, then stop):

- **file** — the two Missions' changed files under the node are disjoint ⇒ **soft** (artifact-neutral,
  highest confidence). The common case.
- **region** — for each **shared** file, both sides' touched line-hunks are known and disjoint ⇒
  **soft** (textual). Overlapping — or either side's hunks unknown — descends.
- **semantic**, split by artifact-type (keyed structurally off the path):
  - **`.feature`** (behavioral prose) → the **scenario**: different scenarios ⇒ **soft**, the same
    scenario ⇒ **hard** (freeze-anchored, the same `gherkin-cli diff` the sibling reuses).
  - **code** → the **symbol** — the **★ deferred capstone** (issue #189's third bullet): stays
    **hard**, flagged `symbol-rung-deferred`.
  - **non-behavioral prose** (governance / reference, no suite) → **no finer anchor**; stay **hard**,
    reason `no-anchor`.

The **node rollup** is **hard if any shared file is hard**, else soft; it records the decisive rung and
a **confidence that decays down the ladder** (a `file`-rung soft outranks a `semantic`-rung soft).

**The shared-thin-file downgrade.** A file touched by **many** Missions (a CLI router, barrel, registry)
is the case the work list most over-serializes. The ladder's descent **is** the downgrade — a shared-thin
file changed in disjoint regions (or different scenarios) downgrades **hard→soft** instead of serializing.
A file whose touching-mission **degree** reaches a threshold (default 3) is flagged `sharedThin` and
surfaced as an **architectural smell** to consider splitting (surfacing only — it never performs the split).

It **composes** the sibling [`touch-set-correction`](../touch-set-correction/README.md)'s
`collectChangedFiles` (which itself composes `resolve-governances` for artifact-type and the pinned
`gherkin-cli@0.0.2 diff` for changed scenarios — never a reimplemented differ) and adds one finer source,
`git diff -U0` line-hunks (the region rung).

Pure derivations (`classify`, `classifyFile`, `hunksDisjoint`, `isFeature`, `isCode`, `confidenceRank`,
the render helper) take and return plain data — no fs/network access — kept apart from a thin IO seam
(`readFileHunks`, `collectMissionTouch`) that shells out to `git diff -U0` and reuses the correction
engine's composition.

## Run it

```bash
# constructed input (a ClassifyInput JSON) — the primary, tested path:
node "<skill>/scripts/collision-ladder.mts" --input <file|-> [--format toon|json]

# sourced from two mission git ranges for one colliding node:
node "<skill>/scripts/collision-ladder.mts" --from-git --node <project/capability> \
  --x <base..head> --y <base..head> [--root .] \
  [--layout 'sdd:.agents/specs/sdd,plugins/sdd/skills']... \
  [--shared-thin-threshold 3] [--format toon|json]
```

- A **ClassifyInput** is `{ node, x, y, degrees?, sharedThinThreshold? }`, where `x`/`y` are each a
  `MissionTouch` (`{ mission, files }`) and every `file` is `{ path, artifactType, hunks, changedScenarios }`
  (`hunks: null` means the line-hunks were not recorded — the region rung will not clear it).
- Default output is **TOON**; `--format json` emits the full `LadderVerdict`: `node`, the hard-or-soft
  `collision`, the decisive `rung`, the `confidence`, the per-shared-file `sharedFiles`, the shared-thin
  `smells`, and the `deferrals` (files whose downgrade awaits the ★ symbol rung).

## Boundaries

**Read-only w.r.t. the mission graph** — it never writes to it and never schedules; it *returns* a
verdict the scheduler consumes. It does **not** detect a collision (the mission-graph WAW-mutex does —
this runs only *after* one is found), do **★ SSA lowering** or infer **symbol-level** produce/consume
dependencies (issue #189's capstone — an overlapping-region code file stays hard, flagged
`symbol-rung-deferred`), descend past the scenario grain, or decide whether to **split** a shared-thin
file (it surfaces the smell; the architect decides). It classifies; it does not schedule.
