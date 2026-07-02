---
name: oracle-spec-governance
description: "Internal skill: the Oracle actor bar at the spec gate — scope and kill-or-ship. Loaded by the spec-producer to self-align and by the cold spec-judge to grade scope. The SDD default for the oracle bar; a plugin may bind its own per artifact-type. Not triggered by users directly."
user-invocable: false
metadata:
  actor: oracle
  gate: spec
  compose: union
---

# Oracle-Spec Governance — the scope & kill-or-ship bar

The **Oracle** bar at the **spec gate**: is the intent worth committing? One merged bar loaded by
**both** faces — the **spec-producer** reads it forward to self-align on scope before writing, and
the **cold spec-judge** reads it backward to judge kill-or-ship. `producer ≠ judge` holds at the
agent level. Oracle applies at the spec gate only — there is no Oracle impl face.

The SDD default for the `oracle` bar — a plugin may bind its own per artifact-type (governance resolution); this loads when the registry leaves `oracle` unbound.

## The bar

- **One coherent intent.** The spec frames a single, nameable outcome. Two unrelated concerns ⇒
  split into two specs.
- **Scope is bounded.** What is explicitly out of scope is stated. A spec that keeps absorbing
  adjacent problems is scope creep — cut it back.
- **Worth shipping.** The Why names a real problem and who feels it. If the value does not clear the
  cost of building, the verdict is **kill**, not ship.
- **Kill-or-revert is allowed.** A scenario that passes every check but turns out fatal sends the
  whole spec back to Draft. Surface the deal-breaker; do not patch around it.
- **No premature commitment.** Defer a decision that does not need to be made yet to the last
  responsible moment rather than freezing a guess.
