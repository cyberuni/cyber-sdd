---
name: blast-estimate
description: "Partial Skill: invoke by name only — blast-estimate's engine that computes a Mission's blast (low/medium/high) from its touch-set plus the project corpus and lines it up against the hand-typed declared blast — the engine for the blast-estimate node, consumed by the mission-graph's writer. Not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Blast Estimate

The concrete engine for **blast-estimate** — a read-only derivation that works out how much of the
project a Mission could disturb, instead of trusting the hand-typed guess. Given a Mission's
**touch-set** (the work areas it names) and the project corpus, it computes a **blast** level
(`low` / `medium` / `high`) from three measured inputs and lines that level up against the Mission's
hand-typed **declared** blast (`agrees` / `under-called` / `over-called`). See
`.agents/specs/sdd/blast-estimate/README.md` for the full contract and vocabulary.

## The three inputs

- **count** — how many of the touch-set's areas resolve to a known work area in the corpus.
- **centrality** (dependency fan-in) — for each resolved area, how many *other* work areas' files
  reference it (a literal, word-bounded mention of its `project/capability` id). The `max` across the
  resolved areas is used.
- **sensitivity** — whether a resolved area is **marked** in the opt-in
  `.agents/sdd/sensitive-paths.toml` (a `sensitive = [ "id", ... ]` string array — the same shape
  `manage-spec-anchors` uses for `anchors = [...]`). Absent file = no area sensitive, not an error. A
  present-but-unparseable file **fails loud**: the estimate returns `computed: null` and an `error`
  naming the file, rather than silently reading it as "nothing marked".

The arithmetic is bucketed and deliberately simple (the rubric fixes only the ordering properties,
not the exact numbers): `count` 1→0, 2-3→1, 4+→3; `centrality` 0→0, 1-2→1, 3+→2; `sensitivity` any
marked area →+2. Sum the three, then `score>=3` → `high`, `score>=1` → `medium`, `score==0` → `low`.
A touch-set that resolves to **zero** known areas (including the empty touch-set) computes `unknown`
— never `low`.

Two exclusions are structural, not just documented: there is no compatibility/breaking-change input
at all (no seam for it to enter the score), and centrality is **measured** fan-in only — a work
area's name never enters the computation.

## Run it

```bash
node "<skill>/scripts/blast-estimate.mts" --root <corpus> --touch-set a,b,c [--declared low|medium|high|unknown] [--format toon|json]
```

- `--root` defaults to `.` (the corpus to scan for work areas + `.agents/sdd/sensitive-paths.toml`).
- `--touch-set` is a comma-separated list of `project/capability` ids.
- `--declared` is optional; omitted or `unknown` lines up as `no-declared` — the computed level still
  returns on its own.
- Default output is **TOON**; `--format json` emits the full `EstimateResult`: `resolved`,
  `unresolved` (surfaced, never dropped), `computed`, `reasons` (`count`, `maxFanIn`,
  `sensitiveAreas`), and `lineUp`.

## Boundaries

Read-only: it composes a corpus scan and the touch-set it is handed, and **returns** an estimate — it
writes no file and mutates no store. It does **not** judge compatibility/breakage (a separate
dimension), rank by surface location, decide HITL vs AFK, render a self-clear-or-escalate verdict (it
only *modulates* a conductor's judgment), or *produce* a touch-set (it consumes one — pre-work
declared, or `touch-set-correction`'s post-work corrected one).
