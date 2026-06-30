---
model: true
---

# SDD maturity levels

SDD is not a single mode — it is a spectrum of how tightly the spec governs the code. The
three-level taxonomy is from Rosen et al., ["Spec-Driven Development: From Code to Contract in the
Age of AI Coding Assistants"](https://arxiv.org/abs/2602.00180) (arXiv:2602.00180):

| Level | Name | Spec ↔ code relationship |
|---|---|---|
| 1 | **Spec-First** | the spec seeds initial development but may **drift** afterward as code changes accumulate |
| 2 | **Spec-Anchored** | spec and code **co-evolve** and stay in sync; the suite enforces the contract |
| 3 | **Spec-as-Source** | humans never edit code directly; the spec is the **only** maintained artifact, code is fully generated like a compiled binary |

## SDD targets Level 2 — Spec-Anchored

The spec lives in the repo, versions with the code, and stays authoritative — but it co-evolves
with the implementation rather than fully preceding it.

- **Level 1 is not enough.** A spec that only seeds development drifts into fiction. SDD's durable
  layers (`sdd-stack.md`) exist precisely so the spec stays maintained, not a one-time design doc
  that rots after the first commit.
- **Level 3 is deliberately not chased.** Spec-as-Source fits only narrow domains where generation
  tooling is mature and stable. Natural language gains expressiveness by sacrificing precision —
  that tradeoff is fundamental, not a tooling gap. Well-written code is already the precise, readable
  detailed artifact; eliminating human-editable code adds indirection that costs more than it saves.

## What Spec-Anchored means here

Two properties make Level 2 concrete in this project:

- **Co-deliver.** Spec, behavior suite, and implementation arrive **together** — the same change
  carries all three, authored by the same builder from their angle of expertise. The spec is not
  written upfront and handed to a separate implementer, nor back-filled after the code ships.
- **Co-evolve — changes start from either end.** A change can begin at the spec and drive down into
  code (the common case), **or** begin at the code and be reconciled back up into the spec (e.g. a
  discovery made while implementing, a refactor that reshapes a capability). Whichever end it starts
  from, the **suite evolves along the way** so spec, tests, and code never fall out of sync.

This preserves what matters about SDD — the spec is authoritative, behavior-oriented, and persistent
— while fitting the reality of how teams actually build: humans and AI collaborating, multiple
builders contributing across product, design, engineering, and security angles.
