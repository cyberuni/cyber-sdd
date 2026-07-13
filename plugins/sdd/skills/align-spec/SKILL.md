---
name: align-spec
description: "Detect and reconcile prose-suite drift across the SDD project spec's nodes — the on-demand, CI-usable complement to the inline spec-gate check; use for corpus audits, post-large-change verification, or CI gating."
---

# align-spec

The **align-spec** procedure: the one **user-invocable** (and CI-usable) project-spec tool, and the
only one that **reconciles** rather than only reporting. It runs the same alignment check the spec
gate runs inline at every CR, but **on demand** across **the project spec's nodes** — for audits,
post-large-change verification, and CI gating. It never substitutes for the gate; it is the
on-demand complement that catches latent drift the inline gate did not see. It is the intra-spec
alignment sibling of `check-spec-structure` (node-shape) and `concept-index` (the by-concept view)
under the one-project-one-spec model.

## Scope

**Subject** — detecting prose↔suite drift across the project spec's nodes, and reconciling each
detected gap. **Non-goals** — it never writes `status`/`approval`/freeze, and it does not audit
node-shape or propose splits (`check-spec-structure`'s job).

## Run the scan

```bash
node "<skill>/scripts/align-spec.mts" [--spec-dir <spec>] [--nodes <a,b,...>] [--base <ref>] [--check] [--format toon|json]
```

- Default `--spec-dir` is `.`; default `--base` is `HEAD` (the scenario-diff baseline); default
  `--format` is TOON. `--nodes` scopes the sweep to exactly the named nodes (display path or
  README-relative path) instead of every node in the spec.
- **Audit mode** (default) prints a per-node drift report from the mechanical scan below.
- **`--check`** (CI guard) exits **non-zero** iff any mechanical drift is found and **writes
  nothing**; exits zero when the mechanical scan is clean. Wired into `verify:specs` alongside
  `check-spec-structure --check`.

## The procedure — Detect

Detect has two layers, and this skill's engine (`scripts/align-spec.mts`) ships code for only
the mechanical one:

1. **Mechanical scenario-diff (engine code)** — for each node's `.feature`, run the same
   structural, gherkin-cli-backed diff `spec-gate`'s `classify-edit-class` uses against the
   frozen baseline at `--base`. A modified or removed baseline scenario is a **narrowing** — it is
   flagged as a **Clearance** finding (never silently absorbed). This never re-implements a
   line-diff (a line-diff is fooled by a step reassigned off a frozen scenario onto a newly-added
   adjacent one — see `classify-edit-class`'s doc comment).
2. **Semantic prose↔suite alignment (judge-orchestrated, no engine code)** — dispatch the
   resolved spec-judge for the node's artifact-type; it applies the **Builder (coverage) lens**,
   reading the node's prose (`README.md` + diagrams) against its `.feature` for:
   - a **coverage gap** — prose describes a behavior with no scenario;
   - a **prose/scenario contradiction** — the prose and a scenario disagree.
   There are **no scenario IDs in the prose** — this alignment is judge-only; only the `.feature`
   carries scenario identity, so no static rule can bind a paragraph to a scenario. An aligned
   node (no gap, no contradiction, no narrowing) reports no drift.

Running detect over "every node" means: iterate the chosen node set (all nodes, or `--nodes`'
explicit subset); for each, run step 1 mechanically and step 2 via the judge; union the findings
per node.

## The procedure — Reconcile

For each drift finding, an **Oracle-lens (scope) call** sets the direction, then the mechanical
write primitives this engine exports (`trimProse`, `appendScenario`) apply the fix — never a
free-hand edit:

- **in-scope coverage gap** → the Builder lens drafts the missing scenario text; call
  `appendScenario(featureText, scenarioBlock)` to add it to the `.feature`. `appendScenario` only
  ever appends a whole new scenario block — it cannot rewrite an existing one.
- **out-of-scope prose claim** → call `trimProse(readmeText, proseToRemove)` to drop the
  unsupported claim. `trimProse` splits frontmatter from body first (`splitFrontmatter`) and only
  ever rewrites the body — the frontmatter (and any `status`/`approval`/freeze field it carries)
  passes through byte-for-byte untouched.
- **contradiction** → the Oracle lens picks the winning side (prose or scenario); align the
  losing side to it using the same two primitives (trim/rewrite the losing prose, or narrow/widen
  the losing scenario text via `appendScenario`'s sibling edit path).
- **a gap whose fix would narrow an already-frozen scenario** → do **not** call either write
  primitive. Escalate a **Clearance CR** instead — the same escalation the mechanical
  scenario-diff (Detect, step 1) already flags. A frozen scenario is never silently rewritten to
  close a gap.

## The write boundary

`align-spec` may write **prose or scenarios** in reconcile mode, but **never** `status`,
`approval`, or a freeze marker. This is structural, not just a rule: `trimProse` and
`appendScenario` split frontmatter from body (or operate on a `.feature`, which carries no
frontmatter to begin with) and only ever touch the body / append a scenario — neither function's
implementation references a lifecycle key. `--check` never writes at all (audit-only).

## Frozen-scenario map

| Frozen scenario (`align-spec.feature`) | Where it lives |
|---|---|
| detect reports a coverage gap between prose and suite | Detect, step 2 (judge, Builder-coverage lens) |
| detect reports a prose-scenario contradiction | Detect, step 2 (judge) |
| detect runs over every node of the project spec | Detect intro + engine `detect()`/`selectNodes()` |
| a scenario-diff flags a narrowing of the frozen suite | Detect, step 1 — engine `detectNarrowing()` |
| detect over an aligned spec reports no drift | Detect (aggregate of steps 1+2; engine `hasDrift()`) |
| check mode exits non-zero on drift and writes nothing | Engine `main()` `--check` path |
| check mode exits zero when there is no drift | Engine `main()` `--check` path |
| an in-scope gap is reconciled by adding a scenario | Reconcile, bullet 1 — engine `appendScenario()` |
| an out-of-scope prose claim is reconciled by trimming the prose | Reconcile, bullet 2 — engine `trimProse()` |
| a contradiction is reconciled by aligning the losing side | Reconcile, bullet 3 (judge picks side; engine primitives apply it) |
| a gap that would narrow a frozen scenario escalates as a Clearance | Reconcile, bullet 4 (no write; same Clearance path as Detect step 1) |
| reconcile never writes lifecycle state | The write boundary — engine `splitFrontmatter`/`trimProse`/`appendScenario` |

## When `node` is absent

An agent performs the mechanical scenario-diff by hand only if `gherkin-cli` tooling is
unavailable: for each node's `.feature`, compare it scenario-by-scenario against its committed
baseline; a modified or removed scenario is a narrowing. The judge-orchestrated layer (coverage,
contradiction) is always by-hand regardless — it is prose reasoning, not a script.
