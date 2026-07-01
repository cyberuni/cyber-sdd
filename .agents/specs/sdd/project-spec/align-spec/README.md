---
spec-type: behavioral
concept: spec-structure
---

# align-spec — detect & reconcile prose↔suite drift

The **align-spec** procedure: the one **user-invocable** (and CI-usable) project-spec tool, and the only
one that **reconciles** rather than only reporting. It runs the same alignment check the spec gate
runs ([`../../authoring/`](../../authoring/README.md)), but **on demand** across **the project
spec's nodes** — for audits, post-large-change verification, and CI gating. Drift is normally caught
**inline** at every CR's spec gate (so no outer loop hunts for it); `align-spec` is the on-demand
complement — latent drift, batch audit, CI — never a substitute for the gate. It is the intra-spec
alignment sibling of `../check-spec-structure/` (node-shape) under the one-project-one-spec model.

## Use Cases

**Subject** — detecting prose↔suite drift across the project spec's nodes, and reconciling each gap.
**Non-goals** — it never writes `status`/`approval`/freeze, and it does not audit node-shape or
propose splits (that is `../check-spec-structure/`). It aligns prose and suite within a node.

| Trigger | Inputs | Outcome |
|---|---|---|
| **detect** (default; `--check` for CI) | the project spec's nodes (one, several, or every node) | a per-node drift report (coverage gaps, prose↔scenario contradiction, a narrowing vs the frozen suite); `--check` exits **non-zero** on any drift and **writes nothing** |
| **reconcile** (interactive) | a node + its detected gaps | each gap fixed by direction — in-scope gap → add a scenario; out-of-scope prose → trim the prose; contradiction → align the losing side — never writing `status`/`approval`/freeze |

Every scenario in [`align-spec.feature`](./align-spec.feature) maps to one of these two operations
or to the write boundary that closes this spec.

## Detect

Per node, the resolved spec-judge applies the **Builder (coverage) lens** — reading the node's prose
(`README.md` + diagrams) against its `.feature` for coverage: unstated behaviors, prose/scenario
contradiction. A mechanical pass also runs `.feature` validity and a **scenario-diff** against the
frozen suite (a narrowing → a **Clearance** flag). There are **no scenario IDs in the prose** —
prose↔suite alignment is **judge-only**; only the `.feature` carries scenario identity.

## Reconcile

For each gap an **Oracle-lens (scope)** call sets the direction, then the **Builder (coverage)
lens** fixes coverage:

- **in-scope** → add a scenario to the `.feature`;
- **out of scope** → trim the prose;
- **contradiction** → align the losing side.

A gap that would **narrow an already-frozen scenario** escalates as a **Clearance** CR rather than
being silently rewritten.

## The write boundary

`align-spec` may write **prose / scenarios** in reconcile mode, but **never** `status`, `approval`,
or a freeze. A fix that would narrow a frozen scenario escalates as a Clearance CR instead of editing
the frozen suite.
