---
name: check-spec-structure
description: "Partial Skill: invoke by name only — project-spec/check-spec-structure's engine that audits a project spec's internal node-shape — feeds the formation Warden, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Check Spec Structure

The concrete engine for **spec-structure checking**.
It audits the **internal node-shape** of one project spec and returns a finding set for the
formation **Warden** — the **intra-spec** successor to the retired cross-spec `dedupe-specs`/`split-spec`
tools, now that one project is **one spec**. It carries a self-contained `.mts` script (the repo's
node-≥23.6 / no-deps convention). It is the **node-shape** sibling of `align-spec` (prose↔suite
alignment) and `concept-index` (the by-concept view).

## The three deterministic checks (and two judgment arms)

- **untagged-node** (blocking) — a spec-typed node README carrying no `concept:` tag, so it never
  appears in the by-concept index (`concept-index`). `--check` fails on it.
- **oversized-node** (advisory) — a node whose sibling `.feature` scenario count exceeds the
  granularity threshold. Carries a deterministic **shape profile** — plain scenario count, tagged
  (`@rubric`-preceded) scenario count, and section-cluster count (comment headers of either
  `# ── … ──` or `# ---- … ----` style) as a soft breadth hint — and prescribes **no route**.
  Surfaced in the audit but **never** fails `--check`.
- **incomplete-node** (advisory) — a **behavioral leaf spec** (a README with `spec-type: behavioral`
  and a colocated `.feature`) whose `spec.md` is missing one of the four required sections —
  `## What`, `## Use Cases`, `## Control Flow`, `## Scenario map` (`sdd:spec-format-governance`). A
  spec that stops at `## Use Cases` never draws its CFG or scenario map. Spec-type-aware: a reference
  artifact (`## Subject`, no scenario map) and an index node (no colocated `.feature`) are **not**
  held to the shape. **Advisory** while a corpus is brought up to the four-section shape; flip it to
  **blocking** with a follow-up once the corpus is clean.
- **breadth-vs-depth routing** and **intra-spec contradiction** are **Warden judgments** (the spec's
  `@rubric` scenarios) — the engine ships no code for them. The Warden reads the shape profile and
  routes: breadth (many clusters/plain scenarios) → propose a node split; depth with a deterministic
  suite → down-level via the verify-scenarios bridge; depth with agent-behavior scenarios → redesign.
  **placement-drift** is deliberately *not* a deterministic check: a concept legitimately scatters
  across folders (that scatter is what `concept-index` re-unifies), so a concept-vs-folder scan would
  false-positive on correctly-placed nodes.

## Run the scan

```bash
node "<skill>/scripts/check-spec-structure.mts" [--spec-dir <spec>] [--check] [--max-scenarios <n>] [--format toon|json]
```

- Default `--spec-dir` is the current directory; default `--format` is **TOON** (the token-efficient
  form the Warden scans); default `--max-scenarios` is **40**.
- **Audit mode** (default) emits the finding set — a `blocking[]` group then an `advisory[]` group,
  each finding naming the node. `--format json` emits the same findings as a flat JSON array.
- **`--check`** (CI guard) exits **non-zero** iff a **blocking** finding exists and **writes
  nothing**; advisory-only findings still exit zero. Wire it after `concept-index --check` in
  `verify:specs-new` so the project-spec stays structurally clean.

When `node` is absent, an agent performs the same derivation by hand: for each `<cap>/<unit>/README.md`
with a `spec-type`, flag it untagged if it carries no `concept:`; for each with a sibling `.feature`,
count `Scenario:` lines and flag oversized over the threshold.

## Boundaries

Frontmatter + scenario-count only — it never reads a node body, owns no lifecycle state, and writes
nothing. It **never acts** on a finding (a split, a reconcile) — that is the Warden's
(`sdd:formation-loop`) under its own self-clear-vs-escalate verdict. It does **not** render the
by-concept view (`concept-index`), advise a new node's home (`place-node`), or check gate legality
(`spec-gate`'s `check-spec-state`, fail-closed at the gate).
