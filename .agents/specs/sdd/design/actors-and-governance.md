# Actors & governance

The SDD actor model is the `motive-model` applied to spec-driven development. The motive-model
is a **separate project** (`artifacts/specs/motive-model`) — referenced here, not folded in.
This file states which of its actors SDD instantiates, how each actor's bar is delivered as a
**governance**, and how governances compose into agent definitions.

## The actors SDD instantiates

The motive-model defines four MECE actors, each a *human* defined by a **motive**, who wields
a *delegate* (an agent) through a delegation surface. SDD runs all four:

| Actor | Motive | SDD object | Owns the bar for |
|---|---|---|---|
| **Director** | intend — what's worth doing | the CR's scope and kill-or-ship | scope; the decision *not* to build |
| **Builder** | generate — make the thing | the spec, the suite, the implementation | testability and coverage |
| **Architect** | structure — keep the whole legible | the corpus shape and per-spec structural fit | structural fit |
| **Strategist** | accumulate — make knowledge compound | the durable corpus / doctrine | what is worth encoding |

## Two faces: produce and evaluate (`producer ≠ judge`)

Every actor's expertise points two ways. Applied **forward** it produces; applied **backward**
the same expertise *judges*. There is no standalone gatekeeper actor — judging is a face every
actor has. SDD enforces one constraint across the fold: **`producer ≠ judge`** — the agent
that produced an artifact is not the agent that judges it. In SDD this survives the dissolution
of the human gate: the producer self-aligns to the bar forward; a **distinct** judge actor runs
the bar backward at the spec and impl verifications. The judge stays a separate actor even
though the human approval *station* is gone (see `loops.md`).

The backward face is productive, not passive: it **codifies the bar** into loadable criteria
(so producers can self-align before verification fires) and **produces the verification**
(runs the criteria, renders pass/fail).

## Actor bars are delivered as governances

Each actor's **bar** is encoded as a governance an agent loads. SDD's default actor governances:

- **Director bar** → the director governance (scope, kill-or-ship).
- **Builder bar** → the builder governance (testability, coverage).
- **Architect bar** → the architect governance (structural fit).
- **Strategist bar** → enacted through the **doctrine outer loop** (run at lifecycle
  granularity by its delegate), not a per-spec gate governance.

Cross-cutting these is the **autonomy bar** — the autonomy governance / risk rubric (see
`autonomy-rubric.md`). It is **not an actor**; it is the self-clear-vs-escalate arbiter every
write passes, the risk-assessment side of every escalation point. It cooperates with the
lifecycle legality rules but is a distinct axis from any single actor's bar.

Beyond actor bars, an artifact-type's squad resolves **discipline** governances
(process/workflow) the producer and judge load. The squad is the selection unit (see
`specialists-and-squads.md`); the governances named there are the actor + discipline bars for
that artifact-type.

Actor (and discipline) bars are the **resolved-actor** tier: each has a **forward** face (a
producer self-aligns) and a **backward** face (a judge grades), and they are discovered,
composed, and loaded **per `(artifact-type, face)` at runtime** — **never** build-embedded, since
resolution is dynamic. Only the **fixed-universal** governances (`ownership`, `lifecycle`,
`spec-format`, `gate-validation`) are embed candidates. Definition (two tiers, two faces), sources
by addressability, precedence, composition, and the deterministic helper: `governance-resolution.md`.

## How governances compose into agent definitions

A governance is delivered to an agent by one of two mechanisms (the
`governance-composition` contract partitions the corpus between them):

- **Contract / interface governance — embedded.** A rule the agent must honor on *every*
  invocation (a delegate I/O contract, a schema it must conform to). Declared in a worker's
  frontmatter as `requires_governances` and **inlined at build time** by
  `universal-plugin build` into the built agent definition, with the field stripped from the
  output. The contract is then unconditionally present from the first message — no tool call,
  no reliance on the harness situationally loading anything.
- **Reference / criteria governance — harness-loaded skill.** Standards, format bars, and
  principles consulted situationally; often large; shared widely. Delivered as a
  `user-invocable: false` governance skill the harness loads when relevant. Embedding these
  everywhere would bloat context.

When unsure, prefer a governance skill; embedding is the exception reserved for
must-always-be-present contracts.

### Composition rules

- **References resolve by name, not path.** `<plugin>/<name>` for a cross-plugin governance
  (e.g. `sdd/gate-validation-governance`); a bare `<name>` for an intra-plugin one — matching
  how `universal-plugin governance show` already resolves names. Paths and URLs are rejected
  (fragile across installs, offline-unfriendly).
- **Embed order is declaration order.** Governances are inlined in the order declared, so a
  later entry may build on a concept an earlier one introduced. Authors own the ordering.
- **Missing governance fails the build.** An unresolvable reference (plugin not installed,
  name typo) fails `universal-plugin build` loudly — `plugin-not-installed` or
  `governance-not-found` — never emitting an agent definition missing its contract.
- **Gateways carry no governance.** Embedding targets **worker** agents and skills — the ones
  that perform governed work (`create-spec`, `validate-spec`, the operator delegates, the
  producers/judges). A **gateway** skill (e.g. `sdd`) only classifies and routes; it holds no
  governance and must not declare `requires_governances`.
- **Build-time, not runtime injection.** Embedding happens at build because the tool does not
  control the harness (Claude Code, Cursor, Codex). The built output is a standard agent
  definition with content already inlined — no harness support required. Token cost is
  identical either way; build-time removes the tool-call overhead.
