---
concept: governance
---

# Actors & governance

The SDD actor model is the `motive-model` applied to spec-driven development.
The motive-model is a **separate project** (`artifacts/specs/motive-model`) — referenced here, not folded in.
This file states which of its actors SDD instantiates, how each actor's bar is delivered as a **governance**, and how governances compose into agent definitions.

## The actors SDD instantiates

The motive-model defines four MECE actors, each a *human* defined by a **motive**, who wields a *delegate* (an agent) through a delegation surface.
SDD runs all four:

| Actor | Motive | SDD object | Owns the bar for |
|---|---|---|---|
| **Oracle** | intend — what's worth doing | the CR's scope and kill-or-ship | scope; the decision *not* to build |
| **Builder** | generate — make the thing | the spec, the suite, the implementation | testability and coverage |
| **Architect** | structure — keep the whole legible | the corpus shape and per-spec structural fit | structural fit |
| **Strategist** | accumulate — make knowledge compound | the durable corpus / doctrine | what is worth encoding |

## Two faces: produce and evaluate (`producer ≠ judge`)

Every actor's expertise points two ways.
Applied **forward** it produces; applied **backward** the same expertise *judges*.
There is no standalone gatekeeper actor — judging is a face every actor has.
SDD enforces one constraint across the fold: **`producer ≠ judge`** — the agent that produced an artifact is not the agent that judges it.
In SDD this survives the dissolution of the human gate: the producer self-aligns to the bar forward; a **distinct** judge actor runs the bar backward at the spec and impl verifications.
The judge stays a separate actor even though the human approval *station* is gone (see `loops.md`).

The backward face is productive, not passive: it **codifies the bar** into loadable criteria (so producers can self-align before verification fires) and **produces the verification** (runs the criteria, renders pass/fail).

## Actor bars are delivered as governances

Each actor's **bar** is encoded as a governance an agent loads.
SDD's default actor governances:

- **Oracle bar** → the oracle governance (scope, kill-or-ship).
- **Builder bar** → the builder governance (testability, coverage).
- **Architect bar** → the architect governance (structural fit).
- **Strategist bar** → enacted through the **doctrine outer loop** (run at lifecycle granularity by its delegate), not a per-spec gate governance.

The three applied actor bars — Oracle (scope), Builder (coverage), Architect (structure) — are the **lenses**: an actor's bar in use at a gate, the criteria a producer self-aligns to (**forward** face) and a judge grades against (**backward** face).
"Bar" names the criteria an actor owns; "lens" names that same bar as the thing a delegate looks *through*.
The loop and conductor docs (`loops.md`, `lifecycle-model.md`, `mission/conductor/`) use "lens" for this.
A lens is **not** the actor (the human/motive), the face (the direction), or the delegate (the agent).

Cross-cutting these is the **autonomy bar** — the autonomy governance / risk rubric (see `autonomy-rubric.md`).
It is **not an actor**; it is the self-clear-vs-escalate arbiter every write passes, the risk-assessment side of every escalation point.
It cooperates with the lifecycle legality rules but is a distinct axis from any single actor's bar.

Beyond actor bars, an artifact-type's squad resolves **discipline** governances (process/workflow) the producer and judge load.
The squad is the selection unit (see `specialists-and-squads.md`); the governances named there are the actor + discipline bars for that artifact-type.

Actor (and discipline) bars are the **resolved-actor** tier: one bar **per `(actor, gate)`** (faces merged — the producer reads it forward, the judge backward; see `common-governances/common-governances.solution.md`), discovered, composed, and loaded **per `(artifact-type, gate)` at runtime** by the role that needs it.
The **fixed-universal** governances (`ownership`, `lifecycle`, `spec-format`, `suite-format`, `gate-validation`, `combat-log`) ship with SDD and load for every spec regardless of artifact-type.
Definition (two tiers), sources by addressability, precedence, composition, and the deterministic helper: `governance-resolution.md`.

## How governances reach an agent — harness-loaded skills

Every governance is delivered the **same** way: a `user-invocable: false` **skill the harness loads** when the role needs it.
There is **no build-time embedding** — `universal-plugin build` inlining is **out of scope** for SDD; governances are authored directly as skills in the mission loop (the bootstrap), and plugin authors / end-users get **guiding skills** (a future `create-governance`) to write their own.
Token-leanness comes from **per-concept, lean, role-split bars** — each role loads only the few small skills it needs (`governance-resolution.md`), not from inlining everything into one definition.

### Loading rules

- **References resolve by name, not path.**
  `<plugin>/<name>` for a cross-plugin governance (e.g. `sdd/gate-validation-governance`); a bare `<name>` for an intra-plugin one — matching how `universal-plugin governance show` already resolves names.
  Paths and URLs are rejected (fragile across installs, offline-unfriendly).
- **Load order is resolution order.**
  Bars are composed in precedence order (project > plugin > sdd-default; `governance-resolution.md`), so a more-specific bar can refine a default.
- **An unresolvable required governance fails closed.**
  A required role's bar that resolves to nothing (plugin not installed, name typo) is a structural error — the gate fails closed (`gate-validation-governance`), never advancing on a missing bar.
- **Gateways carry no governance.**
  Governance loading targets **worker** agents and skills — the ones that perform governed work (`start-mission`, `spec-gate`, the producers/judges).
  A **gateway** skill (e.g. `sdd`) only classifies and routes; it holds **no** governance.
