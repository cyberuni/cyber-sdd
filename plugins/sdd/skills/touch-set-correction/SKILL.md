---
name: touch-set-correction
description: "Internal skill: reconciles a Mission's declared touch-set against what its git diff actually changed — read-only, post-hoc; used to correct the mission-graph's hazard set from prediction to reality, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Touch-Set Correction

The concrete engine for **touch-set-correction** — the Op2 deferral of the cyberfleet-batch
self-hosting-kernel (issue #189, first bullet). A Mission's **declared touch-set** is a pre-work
**guess** of the work areas it will change, used by [`mission-graph`](../mission-graph/README.md)
to keep clashing Missions apart. This engine checks that guess against reality: given a Mission's
declared touch-set and its `git diff base..head`, it recovers the work areas **actually** touched
and lines them up against the guess:

- **confirmed** — declared ∩ actual (the guess was right)
- **missed** — actual − declared (touched but never guarded — the dangerous case)
- **overDeclared** — declared − actual (guessed but never touched — harmless)
- **corrected** — the actual touched set (the ground truth; what the graph's single writer records
  at Mission retirement)

It **composes three tools**, never reimplementing any of them: `git diff --name-status` (the
changed files), [`resolve-governances`](../resolve-governances/SKILL.md) (each file's artifact-type,
best-effort — `unknown` when it doesn't resolve), and the pinned `gherkin-cli@0.0.2 diff` (a touched
`.feature`'s changed scenario names — the same tool `classify-edit-class` uses).

Work-area recovery is **capability-first**: a changed file under a declared project root maps to
`project/capability`, where the capability is the first path segment after the matched root (the
LONGEST matching root wins, so a nested root like `plugins/sdd/skills` beats a shallower
`plugins/sdd`). A spec file and its impl file sharing a capability segment collapse to one node. A
file under no known root is **unmapped** — surfaced, never silently dropped, never counted as
touched.

Pure derivations (`isFeature`, `fileToNode`, `reconcile`, `assembleCorrection`) take and return
plain data — no fs/network access — kept apart from a thin IO seam (`readChangedFiles`,
`resolveArtifactType`, `changedScenarios`, `collectChangedFiles`, `discoverLayouts`) that shells out
to `git`, `resolve-governances.mts`, and `npx gherkin-cli`.

## Run it

```bash
node "<skill>/scripts/touch-set-correction.mts" --base <ref> --declared a,b,c \
  [--head HEAD] [--root .] \
  [--layout 'sdd:.agents/specs/sdd,plugins/sdd/skills']... \
  [--format toon|json]
```

- `--base` is required (the merge-base or comparison ref); `--head` defaults to `HEAD`; `--root`
  defaults to `.`.
- `--layout` is repeatable (`<project>:<root1>,<root2>`). Omit it to auto-discover project layouts
  via `discover-specs` (each project's spec-path plus an impl-root convention: `plugins/<p>` also
  gets `plugins/<p>/skills`; `packages/<p>` also gets `packages/<p>/src`; anything else falls back
  to the project-path itself).
- Default output is **TOON**; `--format json` emits the full `Correction` record: `corrected`,
  the `confirmed`/`missed`/`overDeclared` split, `unmapped`, and per-node `files` (each `{ path,
  artifactType }`) + `changedScenarios`.

## Boundaries

**Read-only w.r.t. the mission graph** — it never writes to it; the graph's single writer appends
the corrected touch-set at Mission retirement (the lifecycle loop, deferred to F3). It does **not**
decide whether two Missions' touch-sets collide hard or soft, run the finer-than-node ladder (file →
region → semantic downgrade), descend to a region/hunk tier, do SSA lowering or infer symbol-level
produce/consume dependencies (all later parts of issue #189), or **predict** a touch-set before the
work — it only corrects one, after.
