---
name: check-scenario-overlap
description: "Partial Skill: invoke by name only — project-spec/scenario-overlap's engine that detects the same behavior specified in two nodes' suites across one project spec — feeds the formation Warden, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Check Scenario Overlap

The concrete engine for **cross-node scenario-overlap detection** — the intra-project **spec-level
SSA** partner of the code-side collision ladder. It audits **across the nodes** of one project spec
and returns the candidates where the **same behavior lives in more than one node's `.feature`**, for
the formation **Warden**. It is the **cross-node** sibling of `check-spec-structure` (intra-node
node-shape), whose per-node scope leaves this cross-node axis uncovered. Self-contained `.mts` (the
repo's node-≥23.6 / no-deps convention).

## Why this rung exists

The scheduler treats two missions touching different `.feature` files as **file-disjoint** — but if
the **same behavior** is specified in **two** files, a change to that behavior must touch both, so
what looked disjoint is a **hard collision the scenario rung cannot see** (it diffs changed scenarios
per file, never across files). One behavior = **one scenario in one owning node** keeps the scenario
rung honest. Cross-*project* dedup (`dedupe-specs`) was retired when one project became one spec;
cross-*node* overlap **inside** a project had no detector until this one.

## The two deterministic candidate kinds (and one judgment arm)

- **exact-duplicate** (blocking) — two **distinct** nodes whose suites each carry a scenario with an
  **identical normalized step fingerprint** (the ordered Given/When/Then step bodies, whitespace- and
  case-normalized). A near-certain one-behavior-two-nodes violation; `--check` fails on it.
- **title-overlap** (advisory) — two distinct nodes sharing a **normalized scenario title** but with
  **differing** fingerprints. A weaker hint (same words may name different behavior); **never** fails
  `--check`.
- **real-overlap + owning-node** is a **Warden judgment** (the spec's `@rubric` scenario) — the
  engine ships no verdict. The Warden confirms the candidate is the same behavior (not a coincidental
  text match) and **assigns a single owning node** for the dedup.

The fingerprint is computed from **step bodies only** — a scenario's title, tags, comments, and the
`.feature` prose never reach it, so the signal is behavior-shaped, not cosmetic. Detection is
**cross-node only**: a scenario duplicated **within one node** raises no candidate, and a scenario
appearing **once** corpus-wide raises nothing.

## Run the scan

```bash
node "<skill>/scripts/check-scenario-overlap.mts" [--spec-dir <spec>] [--check] [--format toon|json]
```

- Default `--spec-dir` is the current directory; default `--format` is **TOON** (the token-efficient
  form the Warden scans).
- **Audit mode** (default) emits the candidate set — a `blocking[]` group then an `advisory[]` group,
  each candidate naming **both** nodes and the overlapping scenario. `--format json` emits the same
  candidates as a flat JSON array.
- **`--check`** (CI guard) exits **non-zero** iff an **exact-duplicate** candidate exists and **writes
  nothing**; title-overlap advisories still exit zero. Wire it after `check-spec-structure --check` in
  `verify:specs` so the project-spec holds the one-behavior-one-node partition.

When `node` is absent, an agent performs the same derivation by hand: parse each node's `.feature`
into scenarios, normalize each scenario's ordered steps into a fingerprint, and flag any fingerprint
(or, more weakly, any title) shared across two distinct node folders.

## Boundaries

Steps + titles only — it never reads a scenario's prose into the fingerprint, owns no lifecycle
state, and writes nothing. It **never acts** on a candidate (a dedup, a relocation) — that is the
Warden's (`sdd:formation-loop`) under its own self-clear-vs-escalate verdict. It does **not** audit
node-shape (`check-spec-structure`), flag within-node duplicate scenarios, render the by-concept view
(`concept-index`), or advise a new node's home (`place-node`).
