---
name: oracle-spec-governance
description: "Partial Skill: invoke by name only"
user-invocable: false
metadata:
  actor: oracle
  gate: spec
  compose: union
---

# Oracle-Spec Governance — the scope & kill-or-ship bar

The **Oracle** bar at the **spec gate**: is this **capability** worth committing, and is its scope the
node's to hold? Judges the capability (read from its spec + suite), not the document's prose — that is
`sdd:spec-format-governance`. Loaded by both faces — the spec-producer self-aligns on scope before
writing, the cold spec-judge judges kill-or-ship. Oracle has no impl face. The SDD default for the
`oracle` bar; a plugin may bind its own per artifact-type, and this loads when the registry leaves
`oracle` unbound.

## The bar

- **One coherent intent.** The capability delivers a single nameable outcome. **Two concerns are two
  capabilities** — split them, each into its own node. Test: can you name the outcome without "and"?
- **Scope is bounded and stated.** What is out of scope is named. A capability that keeps absorbing
  adjacent problems is scope creep — cut it back.
- **Every surface element is paid for by a use case.** An element the capability exposes — a flag,
  an option, a parameter, a prop, an event — that **no use case needs** is unbought scope: the
  verdict is cut it or name the use case, never ship it and see (`sdd:spec-format-governance`).
  This is the same kill-or-ship judgment one level down: the capability answers for its cost, and so
  does each thing it exposes. An actor or goal that restates the mechanism has not identified who
  wants this — treat it as an unanswered Why, not as a filled-in field.
- **The suite's decisions are the node's to hold.** Every scenario tests a **decision the node owns**.
  A property **co-owned** across a seam — activation/routing, a sibling's behavior, harness wiring —
  is out of scope: relocate it to the node that owns it, or kill it.
- **Strict — a non-decision is killed.** An **invariant** that always holds is not acceptance and does
  not enter the suite. The one exception is a user **`@pinned`** scenario, kept whatever strict prunes.
- **Worth shipping, or kill.** The Why names a real problem and who feels it. If value does not clear
  the cost of building, the verdict is **kill**.
- **Kill-or-revert is allowed.** A capability that passes every check but proves fatal goes back to
  Draft — surface the deal-breaker.
- **No premature commitment.** Defer a decision that need not be made yet to the last responsible
  moment.

## Key points (read-check)

1. **One coherent intent** — two concerns are two capabilities; bounded and stated scope. **Every
   surface element is paid for by a use case** — an orphan element is unbought scope (cut or
   justify); an actor/goal restating the mechanism is an unanswered Why.
2. **Every scenario tests a decision the node owns** — a co-owned seam property is out of scope
   (relocate or kill).
3. **Strict** — an invariant / non-decision does not enter the suite; only a user `@pinned` scenario
   escapes.
4. **Worth shipping or kill** — value must clear the build cost; a fatal proof reverts to Draft.
