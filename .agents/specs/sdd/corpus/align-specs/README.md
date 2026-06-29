---
spec-type: behavioral
---

# align-specs — detect & reconcile prose↔suite drift

The **align-specs** procedure: the one **user-invocable** (and CI-usable) corpus tool, and the only
one that **reconciles** rather than only proposing. It runs the same alignment check the spec gate
runs ([`../../authoring/`](../../authoring/README.md)), but **on demand** over **one, more, or all**
specs — for audits, post-large-change verification, and CI gating. Drift is normally caught
**inline** at every CR's spec gate (so no outer loop hunts for it); `align-specs` is the on-demand /
full-corpus complement — latent drift, batch audit, CI — never a substitute for the gate.

## Use Cases

**Subject** — detecting prose↔suite drift across a chosen spec set, and reconciling each gap.
**Non-goals** — it never writes `status`/`approval`/freeze, and it does not collapse or split specs
(those are `dedupe-specs`/`split-spec`). It aligns prose and suite within specs.

| Trigger | Inputs | Outcome |
|---|---|---|
| **detect** (default; `--check` for CI) | one, more, or all spec folders | a per-spec drift report (coverage gaps, prose↔scenario contradiction, a narrowing vs the frozen suite); `--check` exits **non-zero** on any drift and **writes nothing** |
| **reconcile** (interactive) | a spec + its detected gaps | each gap fixed by direction — in-scope gap → add a scenario; out-of-scope prose → trim the prose; contradiction → align the losing side — never writing `status`/`approval`/freeze |

Every scenario in [`align-specs.feature`](./align-specs.feature) maps to one of these two operations
or to the write boundary that closes this spec.

## Detect

Per spec, the resolved spec-judge applies the **Builder (coverage) lens** — reading `spec.md` (prose
+ diagrams) against its `.feature` for coverage: unstated behaviors, prose/scenario contradiction. A
mechanical pass also runs `.feature` validity and a **scenario-diff** against the frozen suite (a
narrowing → a **Clearance** flag). There are **no scenario IDs in the prose** — prose↔suite
alignment is **judge-only**; only the `.feature` carries scenario identity.

## Reconcile

For each gap a **Director-lens (scope)** call sets the direction, then the **Builder (coverage)
lens** fixes coverage:

- **in-scope** → add a scenario to the `.feature`;
- **out of scope** → trim the prose;
- **contradiction** → align the losing side.

A gap that would **narrow an already-frozen scenario** escalates as a **Clearance** CR rather than
being silently rewritten.

## The write boundary

`align-specs` may write **prose / scenarios** in reconcile mode, but **never** `status`, `approval`,
or a freeze. A fix that would narrow a frozen scenario escalates as a Clearance CR instead of editing
the frozen suite.
