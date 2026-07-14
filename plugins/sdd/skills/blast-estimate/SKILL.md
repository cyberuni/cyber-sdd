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

- **count** — how many of the touch-set's areas resolve to a known work area in the corpus, plus
  **coverage**: whether the touch-set covers *every* work area of a touched project. Together these
  are **breadth** — absolute reach and relative reach.
- **centrality** (dependency fan-in) — for each resolved area, how many *other* work areas hold at
  least one file that **references** it, measured across the area's **full root set** —
  implementation files count exactly as spec prose does. The `max` across the resolved areas is used.
  See *The reference matcher* below: a bare id alone is **not** how real prose references an area.
- **sensitivity** — whether a resolved area is **marked** in the opt-in
  `.agents/sdd/sensitive-paths.toml` — a `sensitive = [ "id", ... ]` string array, parsed
  line-anchored and lenient exactly as `manage-spec-anchors` parses `anchors = [ … ]`, so a leading
  comment, a trailing comment, or a neighbouring key are all ordinary TOML and parse. A file with no
  `sensitive` array at all is malformed and fails loud. **Only an absent file (`ENOENT`) is benign** —
  no area is sensitive, not an error. **Every other read failure fails loud** — unparseable,
  unreadable (permissions), or not a regular file — returning `computed: null` and an `error` naming
  the file. The narrow ENOENT test is deliberate: swallowing the rest into "nothing marked" fails in
  the **dangerous direction**, silently under-calling blast on exactly the areas a project marked as
  needing care. An unreadable marking is not evidence of no markings.

The arithmetic is bucketed and deliberately simple (the rubric fixes only the ordering properties,
not the exact numbers):

- **breadth** = `max(countScore, coverageScore)` — reach measured two ways, whichever says more:
  - `countScore`: 1→0, 2-3→1, 4+→3 (absolute reach — touching many areas is broad even in a large
    project the touch-set nowhere near covers)
  - `coverageScore`: 3 iff the touch-set covers **every** work area of a touched project holding
    **≥2** work areas, else 0 (relative reach — a 3-area project touched entirely *is* project-wide;
    the barrier agreement must hold at every project size, not only at 4+)
- **centrality**: 0→0, 1-2→1, 3-6→2, 7+→3 (a genuine hub: touching an area a large share of the
  project leans on is project-scale reach even at count 1). Calibrated against **real** fan-in, which
  spans roughly 0–17 on a corpus of this size.
- **sensitivity**: any marked area →+2

Sum the three, then `score>=3` → `high`, `score>=1` → `medium`, `score==0` → `low`. A touch-set that
resolves to **zero** known areas (including the empty touch-set) computes `unknown` — never `low`.

The **≥2 work areas** guard on coverage is load-bearing. In a corpus holding exactly one work area,
"a single peripheral work area" (→`low`) and "a touch-set reaching across every work area of its
project" (→`high`) would describe the same input with opposite answers; the two stay disjoint only
because a corpus has more than one work area, so coverage never fires on a 1-area project.

Two exclusions are structural, not just documented: there is no compatibility/breaking-change input
at all (no seam for it to enter the score), and centrality is **measured** fan-in only — a work
area's name never enters the computation.

## Work-area recovery — declared layouts, never a path shape

Node recovery is **not this engine's to invent**: it reuses `touch-set-correction`'s pure
**`fileToNode(path, layouts)`** over `discoverLayouts`' declared `ProjectLayout[]` (the same
cross-skill reuse `collision-ladder` does). This is load-bearing — a work area spans **multiple
declared roots**, a spec root *and* an impl root:

```
project "sdd" -> roots [".agents/specs/sdd", "plugins/sdd/skills"]
  .agents/specs/sdd/mission-graph/README.md  -> sdd/mission-graph
  plugins/sdd/skills/mission-graph/SKILL.md  -> sdd/mission-graph   # SAME node, two roots
```

A node's file set is every file under **any** of its roots, so fan-in measures the project's real
lean on an area rather than spec-prose cross-reference. `estimateBlast` takes layouts **injected**
(`fileToNode` is pure, so tests construct them as fixtures); the CLI sources them from
`discoverLayouts`, overridable with `--layout`.

## The reference matcher

Fan-in counts the forms the corpus **actually uses** to name an area — a bare id is what a touch-set
and the ledger write, not how prose references anything. For node `<p>/<cap>`:

| form | example |
|---|---|
| bare id | `sdd/spec-gate` |
| skill-style ref | `sdd:spec-gate` |
| path under any **declared root**, at any depth | `plugins/sdd/skills/spec-gate/`, `.agents/specs/sdd/authoring/spec-gate/` |
| relative sibling link (**same project only**) | `../spec-gate/`, `../../authoring/spec-gate/` |

Path forms are **derived from the project's declared roots**, never hardcoded, so a re-rooted project
keeps working; the any-depth segment matters because a node's spec can sit nested under its root. A
relative link carries no project, so it is only counted within the same project — otherwise two
projects sharing a capability name (`manage`, `design`) would cross-credit each other.

This stays **mention-based and cheap** by design. Real produced/consumed symbol dependency is
`ssa-lowering` / `collision-ladder` territory — the boundary is deliberate. Only the resolved areas
are scored, so a one-area touch-set costs one matcher pass over the corpus rather than one per area.

## Run it

```bash
node "<skill>/scripts/blast-estimate.mts" --root <repo> --touch-set a,b,c \
  [--layout 'sdd:.agents/specs/sdd,plugins/sdd/skills']... \
  [--declared low|medium|high|unknown] [--format toon|json]
```

- `--root` defaults to `.` (the repo root the layouts' roots and
  `.agents/sdd/sensitive-paths.toml` resolve against).
- `--layout` is repeatable (`<project>:<root1>,<root2>`, the same shape `touch-set-correction`
  accepts). Omit it to auto-discover via `discover-specs`.
- `--touch-set` is a comma-separated list of `project/capability` ids.
- `--declared` is optional; omitted or `unknown` lines up as `no-declared` — the computed level still
  returns on its own.
- Default output is **TOON**; `--format json` emits the full `EstimateResult`: `resolved`,
  `unresolved` (surfaced, never dropped), `computed`, `reasons` (`count`, `maxFanIn`,
  `sensitiveAreas`, `projectWide`), and `lineUp`.

## Boundaries

Read-only: it composes a corpus scan and the touch-set it is handed, and **returns** an estimate — it
writes no file and mutates no store. It does **not** judge compatibility/breakage (a separate
dimension), rank by surface location, decide HITL vs AFK, render a self-clear-or-escalate verdict (it
only *modulates* a conductor's judgment), *produce* a touch-set (it consumes one — pre-work declared,
or `touch-set-correction`'s post-work corrected one), or **reimplement node recovery** (it imports
`fileToNode`; it never reinvents or shells out to it).
